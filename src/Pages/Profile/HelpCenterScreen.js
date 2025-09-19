import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';

const HelpCenterScreen = ({ navigation }) => {
  const [faqs, setFaqs] = useState([]);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [contactInfo, setContactInfo] = useState({});
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    message: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHelpData();
  }, []);

  const fetchHelpData = async () => {
    try {
      setLoading(true);
      
      const [faqResponse, contactResponse] = await Promise.all([
        fetch(`${API_URL}/help/faqs`),
        fetch(`${API_URL}/help/contact`)
      ]);
      
      const faqData = await faqResponse.json();
      const contactData = await contactResponse.json();
      
      setFaqs(faqData.data || []);
      setContactInfo(contactData.data || {});
      
    } catch (error) {
      console.error('Error fetching help data:', error);
      // Fallback data if API fails
      setFaqs([
        {
          id: 1,
          question: "How do I book a service?",
          answer: "You can book a service by browsing our services section, selecting your preferred service, and clicking 'Book Now'. Follow the prompts to complete your booking."
        },
        {
          id: 2,
          question: "How can I cancel my booking?",
          answer: "You can cancel your booking by going to 'My Bookings' section and selecting the cancel option. Please note our cancellation policy."
        },
        {
          id: 3,
          question: "What payment methods do you accept?",
          answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets."
        }
      ]);
      setContactInfo({
        phone: "+91 98765 43210",
        email: "support@beautyapp.com",
        address: "123 Beauty Street, Amritsar, Punjab 143001"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const submitSupportTicket = async () => {
    if (!supportTicket.subject.trim() || !supportTicket.message.trim() || !supportTicket.email.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_URL}/help/support-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supportTicket)
      });

      if (response.ok) {
        Alert.alert('Success', 'Your support ticket has been submitted. We will get back to you soon.');
        setSupportTicket({ subject: '', message: '', email: '' });
      } else {
        throw new Error('Failed to submit ticket');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Error', 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FF6B9D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FF6B9D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Icon name="call" size={20} color="#FF6B9D" />
              <Text style={styles.contactText}>{contactInfo.phone}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="mail" size={20} color="#FF6B9D" />
              <Text style={styles.contactText}>{contactInfo.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="location" size={20} color="#FF6B9D" />
              <Text style={styles.contactText}>{contactInfo.address}</Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(faq.id)}
              >
                <Text style={styles.questionText}>{faq.question}</Text>
                <Icon 
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#FF6B9D" 
                />
              </TouchableOpacity>
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Support Ticket Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit a Support Ticket</Text>
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Your Email"
              value={supportTicket.email}
              onChangeText={(text) => setSupportTicket({...supportTicket, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Subject"
              value={supportTicket.subject}
              onChangeText={(text) => setSupportTicket({...supportTicket, subject: text})}
            />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Describe your issue..."
              value={supportTicket.message}
              onChangeText={(text) => setSupportTicket({...supportTicket, message: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={submitSupportTicket}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  answerText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginTop: 10,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
  },
  messageInput: {
    height: 100,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 50,
  },
});

export default HelpCenterScreen;