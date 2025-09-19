import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';

const TermsScreen = ({ navigation }) => {
  const [termsData, setTermsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    fetchTermsData();
  }, []);

  const fetchTermsData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/legal/terms`);
      const data = await response.json();
      
      if (data.success) {
        setTermsData(data.data);
      }
      
    } catch (error) {
      console.error('Error fetching terms data:', error);
      // Fallback data if API fails
      setTermsData({
        last_updated: "2024-01-15",
        company_name: "Beauty Hub",
        sections: [
          {
            id: 1,
            title: "Acceptance of Terms",
            content: "By accessing and using our Beauty Hub mobile application and services, you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service govern your use of our beauty services, products, and mobile application."
          },
          {
            id: 2,
            title: "Use of Services",
            content: "You may use our services for lawful purposes only. You agree not to use the service:\n\n• In any way that violates any applicable federal, state, local, or international law or regulation\n• To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the service\n• To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity"
          },
          {
            id: 3,
            title: "Booking and Cancellation Policy",
            content: "When you book a service through our app:\n\n• All bookings are subject to availability\n• You can cancel your booking up to 24 hours before the scheduled appointment without charges\n• Cancellations within 24 hours may incur a cancellation fee\n• No-shows will be charged the full service fee\n• Rescheduling is allowed with at least 12 hours notice"
          },
          {
            id: 4,
            title: "Payment Terms",
            content: "Payment for services can be made through various methods available in the app:\n\n• All prices are listed in Indian Rupees (INR)\n• Payment is required at the time of booking or service completion\n• Refunds will be processed according to our refund policy\n• We reserve the right to change prices with prior notice"
          },
          {
            id: 5,
            title: "User Accounts",
            content: "To access certain features of our service, you must register for an account:\n\n• You are responsible for maintaining the confidentiality of your account\n• You are responsible for all activities under your account\n• You must provide accurate and complete information\n• You must notify us immediately of any unauthorized use"
          },
          {
            id: 6,
            title: "Privacy and Data Protection",
            content: "We take your privacy seriously:\n\n• Personal information is collected and used according to our Privacy Policy\n• We implement appropriate security measures to protect your data\n• We do not sell or share your personal information with third parties without consent\n• You have the right to access, update, or delete your personal information"
          },
          {
            id: 7,
            title: "Service Quality and Satisfaction",
            content: "We strive to provide high-quality services:\n\n• All services are performed by trained professionals\n• If you're not satisfied with a service, please contact us within 24 hours\n• We reserve the right to refuse service in certain circumstances\n• Service outcomes may vary based on individual factors"
          },
          {
            id: 8,
            title: "Limitation of Liability",
            content: "To the maximum extent permitted by law:\n\n• We shall not be liable for any indirect, incidental, or consequential damages\n• Our total liability shall not exceed the amount paid for the specific service\n• We are not responsible for any allergic reactions or adverse effects\n• Users should inform us of any medical conditions or allergies beforehand"
          },
          {
            id: 9,
            title: "Intellectual Property",
            content: "All content and materials available through our service are protected:\n\n• The app and its content are owned by Beauty Hub or its licensors\n• You may not reproduce, distribute, or create derivative works\n• Our trademarks and logos may not be used without permission\n• User-generated content remains your property but grants us usage rights"
          },
          {
            id: 10,
            title: "Modifications to Terms",
            content: "We reserve the right to modify these terms at any time:\n\n• Changes will be effective immediately upon posting\n• Continued use of the service constitutes acceptance of new terms\n• We will notify users of significant changes\n• It is your responsibility to review these terms periodically"
          },
          {
            id: 11,
            title: "Contact Information",
            content: "If you have any questions about these Terms of Service, please contact us:\n\nEmail: legal@beautyhub.com\nPhone: +91 98765 43210\nAddress: 123 Beauty Street, Amritsar, Punjab 143001\n\nFor general support, you can also use the Help Center in our app."
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.companyName}>{termsData.company_name}</Text>
          <Text style={styles.lastUpdated}>
            Last Updated: {new Date(termsData.last_updated).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Please read these Terms of Service carefully before using our mobile application 
            and services. By accessing or using our service, you agree to be bound by these terms.
          </Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {termsData.sections && termsData.sections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionNumber}>{section.id}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Icon 
                  name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#FF6B9D" 
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.sectionContent}>
                  <Text style={styles.contentText}>{section.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Agreement Notice */}
        <View style={styles.agreementNotice}>
          <Icon name="information-circle" size={24} color="#FF6B9D" />
          <View style={styles.noticeTextContainer}>
            <Text style={styles.noticeTitle}>Important Notice</Text>
            <Text style={styles.noticeText}>
              By continuing to use our services, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms of Service.
            </Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions about our Terms?</Text>
          <Text style={styles.contactText}>
            If you have any questions or concerns about these Terms of Service, 
            please don't hesitate to contact our legal team.
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <Icon name="help-circle" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  headerSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 18,
    color: '#FF6B9D',
    fontWeight: '600',
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  introSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  introText: {
    fontSize: 16,
    color: '#34495E',
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionsContainer: {
    marginBottom: 20,
  },
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    backgroundColor: '#FFE8F0',
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
    marginRight: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contentText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 22,
    marginTop: 15,
    textAlign: 'justify',
  },
  agreementNotice: {
    backgroundColor: '#FFE8F0',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  noticeTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default TermsScreen;