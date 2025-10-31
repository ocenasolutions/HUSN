// screens/User/ChatScreen.js (FIXED - Real-time updates with Sound & Vibration)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';

const QUICK_QUESTIONS = [
  "How do I book a service?",
  "What are your payment methods?",
  "How can I cancel my booking?",
  "Do you offer home services?",
  "What are your working hours?",
  "How do I track my order?",
];

const ChatScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const scrollViewRef = useRef();
  const pollingIntervalRef = useRef(null);
  const soundRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Load notification sound
  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // Using a default notification sound
        require('../../../assets/notification.mp3'), // You'll need to add this file
        { shouldPlay: false }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error loading sound:', error);
      // Fallback: sound won't play but app will still work
    }
  };

  const playNotificationSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const notifyNewMessage = () => {
    // Vibrate device
    Vibration.vibrate([0, 200, 100, 200]); // Pattern: wait, vibrate, wait, vibrate
    
    // Play sound
    playNotificationSound();
  };

  useEffect(() => {
    initializeChat();
    
    return () => {
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start polling when session is available
    if (chatSession?._id) {
      lastMessageCountRef.current = chatSession.messages?.length || 0;
      startPolling();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [chatSession?._id]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const startPolling = () => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll for new messages every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (chatSession?._id) {
        refreshChat(true); // silent refresh
      }
    }, 3000);
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Get user ID from user context or AsyncStorage
      let currentUserId = user?._id || user?.id;
      if (!currentUserId) {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          currentUserId = userData._id || userData.id;
        }
      }
      setUserId(currentUserId);

      // Check for existing active chat session
      const response = await fetch(`${API_URL}/chats/session`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Load existing session
        setChatSession(data.data);
        setMessages(data.data.messages || []);
        setShowQuickQuestions(data.data.messages.length === 0);
        lastMessageCountRef.current = data.data.messages?.length || 0;
      } else {
        // Create new session
        await createNewSession(currentUserId);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Create new session as fallback
      await createNewSession(null);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async (currentUserId) => {
    try {
      const response = await fetch(`${API_URL}/chats/session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatSession(data.data);
        setMessages(data.data.messages || []);
        lastMessageCountRef.current = 0;
      } else {
        throw new Error(data.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
      Alert.alert('Error', 'Failed to initialize chat. Please try again.');
    }
  };

  const refreshChat = async (silent = false) => {
    if (!chatSession?._id) return;
    
    try {
      const response = await fetch(`${API_URL}/chats/session`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const newMessages = data.data.messages || [];
        
        // Check if new messages were added
        const hasNewMessages = newMessages.length > lastMessageCountRef.current;
        const lastMessage = newMessages[newMessages.length - 1];
        const isAdminMessage = lastMessage?.sender === 'admin';
        
        // Only update if messages have changed
        if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
          setChatSession(data.data);
          setMessages(newMessages);
          
          // Notify if new admin message received
          if (hasNewMessages && isAdminMessage && silent) {
            notifyNewMessage();
          }
          
          // Update message count
          lastMessageCountRef.current = newMessages.length;
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Error refreshing chat:', error);
      }
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || sending) return;

    // Check if session exists
    if (!chatSession || !chatSession._id) {
      Alert.alert('Error', 'Chat session not initialized. Please try again.');
      return;
    }

    const userMessage = {
      _id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // Optimistically add user message to UI
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setShowQuickQuestions(false);
    setSending(true);

    try {
      const response = await fetch(`${API_URL}/chats/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: chatSession._id,
          message: messageText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update with server response (includes auto-response)
        if (data.data.session) {
          setChatSession(data.data.session);
          setMessages(data.data.session.messages || []);
          lastMessageCountRef.current = data.data.session.messages?.length || 0;
        }
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Remove the failed message
      setMessages(prev => prev.filter(msg => msg._id !== userMessage._id));
    } finally {
      setSending(false);
    }
  };

  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FF6B9D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Support</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FF6B9D" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chat Support</Text>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <View
              key={message._id || index}
              style={[
                styles.messageBubble,
                message.sender === 'user'
                  ? styles.userMessage
                  : styles.adminMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user'
                    ? styles.userMessageText
                    : styles.adminMessageText,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.sender === 'user'
                    ? styles.userMessageTime
                    : styles.adminMessageTime,
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))}

          {/* Quick Questions */}
          {showQuickQuestions && (
            <View style={styles.quickQuestionsContainer}>
              <Text style={styles.quickQuestionsTitle}>
                Quick Questions:
              </Text>
              {QUICK_QUESTIONS.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickQuestionButton}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Icon name="help-circle-outline" size={16} color="#FF6B9D" />
                  <Text style={styles.quickQuestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {sending && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || sending}
          >
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  messageBubble: {
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B9D',
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#fff',
    fontWeight: '500',
  },
  adminMessageText: {
    color: '#1a1a1a',
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  adminMessageTime: {
    color: '#999',
  },
  quickQuestionsContainer: {
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 8,
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  quickQuestionText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginLeft: 10,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 14,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '500',
  },
});

export default ChatScreen;