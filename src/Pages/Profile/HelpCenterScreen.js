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
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';

const INTEGRATED_FAQS = [
  {
    id: '1',
    category: 'booking',
    question: "How do I book a service?",
    answer: "You can book a service by browsing our services section, selecting your preferred service, and clicking 'Book Now'. Choose your preferred date and time, then confirm your booking. You'll receive a confirmation message once your booking is successful."
  },
  {
    id: '2',
    category: 'booking',
    question: "Can I cancel or reschedule my booking?",
    answer: "Yes, you can cancel or reschedule your booking from the 'My Bookings' section. Please note that cancellations made less than 24 hours before the appointment may incur a cancellation fee. To reschedule, cancel your current booking and create a new one."
  },
  {
    id: '3',
    category: 'payment',
    question: "What payment methods do you accept?",
    answer: "We accept all major credit/debit cards, UPI, net banking, and popular digital wallets like Paytm, PhonePe, and Google Pay. You can also pay cash on arrival for certain services."
  },
  {
    id: '4',
    category: 'payment',
    question: "Is my payment information secure?",
    answer: "Absolutely! We use industry-standard encryption and secure payment gateways to protect your financial information. We never store your complete card details on our servers."
  },
  {
    id: '5',
    category: 'services',
    question: "How long does each service take?",
    answer: "Service duration varies depending on the treatment. Basic services like haircuts take 30-45 minutes, while more elaborate treatments like spa packages can take 2-3 hours. The estimated duration is displayed on each service description."
  },
  {
    id: '6',
    category: 'services',
    question: "Do you offer home service?",
    answer: "Yes! We offer selected beauty and grooming services at your doorstep. Look for services marked with a 'Home Service Available' tag. Additional charges may apply for home services."
  },
  {
    id: '7',
    category: 'account',
    question: "How do I create an account?",
    answer: "Click on 'Sign Up' on the login screen. Enter your mobile number, verify it with the OTP sent to you, then complete your profile with your name and email. That's it! You're ready to start booking."
  },
  {
    id: '8',
    category: 'account',
    question: "I forgot my password. What should I do?",
    answer: "Click on 'Forgot Password' on the login screen. Enter your registered mobile number or email, and we'll send you instructions to reset your password."
  },
  {
    id: '9',
    category: 'account',
    question: "How can I update my profile information?",
    answer: "Go to your Profile section from the main menu. You can edit your name, email, phone number, and address. Don't forget to save your changes!"
  },
  {
    id: '10',
    category: 'general',
    question: "What are your operating hours?",
    answer: "We're open Monday to Saturday from 9:00 AM to 8:00 PM. We're closed on Sundays and major public holidays. Some services may have different timings, which will be mentioned during booking."
  },
  {
    id: '11',
    category: 'general',
    question: "Do I need to bring anything for my appointment?",
    answer: "No special requirements! Just arrive on time for your appointment. For spa services, we provide all necessary amenities including towels and robes."
  },
  {
    id: '12',
    category: 'general',
    question: "What is your cancellation policy?",
    answer: "Free cancellation is available up to 24 hours before your appointment. Cancellations within 24 hours may incur a 50% charge. No-shows will be charged the full amount."
  },
  {
    id: '13',
    category: 'products',
    question: "Can I purchase products without booking a service?",
    answer: "Yes! You can browse and purchase our beauty and grooming products directly from the Products section. We offer home delivery for all product orders."
  },
  {
    id: '14',
    category: 'products',
    question: "What is your return policy for products?",
    answer: "We accept returns within 7 days of purchase if the product is unused and in original packaging. Opened or used products cannot be returned due to hygiene reasons."
  }
];

const HelpCenterScreen = ({ navigation }) => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactInfo, setContactInfo] = useState({});
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    message: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'booking', label: 'Booking', icon: 'calendar' },
    { id: 'payment', label: 'Payment', icon: 'card' },
    { id: 'services', label: 'Services', icon: 'cut' },
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'products', label: 'Products', icon: 'basket' },
    { id: 'general', label: 'General', icon: 'information-circle' }
  ];

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/help/contact`);
      const data = await response.json();
      
      if (data.success) {
        setContactInfo(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching contact info:', error);
      // Set fallback data
      setContactInfo({
        phone: "+91 98765 43210",
        email: "support@beautyapp.com",
        address: "123 Beauty Street, Amritsar, Punjab 143001",
        workingHours: "Mon-Sat: 9:00 AM - 8:00 PM"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const filteredFAQs = INTEGRATED_FAQS.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const submitSupportTicket = async () => {
    if (!supportTicket.subject.trim() || !supportTicket.message.trim() || !supportTicket.email.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supportTicket.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
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

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Success', 
          `Your support ticket has been submitted successfully. Ticket Number: ${data.data.ticketNumber}. We will get back to you soon.`
        );
        setSupportTicket({ subject: '', message: '', email: '' });
      } else {
        throw new Error(data.message || 'Failed to submit ticket');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Error', error.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openChat = () => {
    navigation.navigate('ChatScreen');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header/>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FF6B9D" />
          </TouchableOpacity>
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
      <Header/>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Quick Contact Banner with Chat Button */}
        <View style={styles.quickContactBanner}>
          <Icon name="headset" size={40} color="#FF6B9D" />
          <View style={styles.quickContactText}>
            <Text style={styles.quickContactTitle}>Need Immediate Help?</Text>
            <Text style={styles.quickContactSubtitle}>Our support team is here for you</Text>
          </View>
        </View>

        {/* Live Chat Button */}
        <TouchableOpacity style={styles.liveChatButton} onPress={openChat}>
          <View style={styles.liveChatIcon}>
            <Icon name="chatbubbles" size={24} color="#fff" />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.liveChatContent}>
            <Text style={styles.liveChatTitle}>Start Live Chat</Text>
            <Text style={styles.liveChatSubtitle}>Get instant support from our team</Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#FF6B9D" />
        </TouchableOpacity>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactCard}>
            {contactInfo.phone && (
              <TouchableOpacity style={styles.contactItem}>
                <View style={styles.contactIconWrapper}>
                  <Icon name="call" size={20} color="#FF6B9D" />
                </View>
                <View style={styles.contactTextWrapper}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactText}>{contactInfo.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            {contactInfo.email && (
              <TouchableOpacity style={styles.contactItem}>
                <View style={styles.contactIconWrapper}>
                  <Icon name="mail" size={20} color="#FF6B9D" />
                </View>
                <View style={styles.contactTextWrapper}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactText}>{contactInfo.email}</Text>
                </View>
              </TouchableOpacity>
            )}
            {contactInfo.address && (
              <TouchableOpacity style={styles.contactItem}>
                <View style={styles.contactIconWrapper}>
                  <Icon name="location" size={20} color="#FF6B9D" />
                </View>
                <View style={styles.contactTextWrapper}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactText}>{contactInfo.address}</Text>
                </View>
              </TouchableOpacity>
            )}
            {contactInfo.workingHours && (
              <View style={styles.contactItem}>
                <View style={styles.contactIconWrapper}>
                  <Icon name="time" size={20} color="#FF6B9D" />
                </View>
                <View style={styles.contactTextWrapper}>
                  <Text style={styles.contactLabel}>Working Hours</Text>
                  <Text style={styles.contactText}>{contactInfo.workingHours}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Icon 
                  name={category.icon} 
                  size={16} 
                  color={selectedCategory === category.id ? '#fff' : '#FF6B9D'} 
                />
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ List */}
          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="help-circle-outline" size={50} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No FAQs match your search' : 'No FAQs available'}
              </Text>
            </View>
          ) : (
            filteredFAQs.map((faq) => (
              <View key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleFAQ(faq.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestionContent}>
                    <Icon 
                      name="help-circle" 
                      size={20} 
                      color="#FF6B9D" 
                      style={styles.faqQuestionIcon}
                    />
                    <Text style={styles.questionText}>{faq.question}</Text>
                  </View>
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
            ))
          )}
        </View>

        {/* Support Ticket Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <Text style={styles.sectionSubtitle}>Submit a support ticket and we'll get back to you</Text>
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Your Email *"
              placeholderTextColor="#999"
              value={supportTicket.email}
              onChangeText={(text) => setSupportTicket({...supportTicket, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Subject *"
              placeholderTextColor="#999"
              value={supportTicket.subject}
              onChangeText={(text) => setSupportTicket({...supportTicket, subject: text})}
            />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Describe your issue... *"
              placeholderTextColor="#999"
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
                <>
                  <Icon name="send" size={18} color="#fff" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>        
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
  quickContactBanner: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickContactText: {
    marginLeft: 15,
    flex: 1,
  },
  quickContactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  quickContactSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  liveChatButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFE0EB',
  },
  liveChatIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  liveChatContent: {
    flex: 1,
    marginLeft: 15,
  },
  liveChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  liveChatSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
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
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextWrapper: {
    marginLeft: 15,
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C3E50',
  },
  categoryScroll: {
    marginBottom: 15,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
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
    padding: 15,
  },
  faqQuestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  faqQuestionIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    lineHeight: 20,
  },
  faqAnswer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  answerText: {
    fontSize: 14,
    color: '#5A6C7D',
    lineHeight: 22,
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
    fontSize: 15,
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    color: '#2C3E50',
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitIcon: {
    marginRight: 8,
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