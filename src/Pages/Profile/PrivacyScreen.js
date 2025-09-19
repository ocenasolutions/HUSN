import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const PrivacyScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [privacyData, setPrivacyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    marketing_emails: true,
    push_notifications: true,
    data_analytics: false,
    third_party_sharing: false,
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPrivacyData();
    if (user) {
      fetchPrivacySettings();
    }
  }, [user]);

  const fetchPrivacyData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/legal/privacy`);
      const data = await response.json();
      
      if (data.success) {
        setPrivacyData(data.data);
      }
      
    } catch (error) {
      console.error('Error fetching privacy data:', error);
      // Fallback data if API fails
      setPrivacyData({
        last_updated: "2024-01-15",
        company_name: "Beauty Hub",
        contact_email: "privacy@beautyhub.com",
        sections: [
          {
            id: 1,
            title: "Information We Collect",
            content: "We collect information you provide directly to us, such as when you create an account, book services, or contact us for support.\n\nPersonal Information:\n• Name, email address, phone number\n• Profile photo and preferences\n• Payment information\n• Service history and reviews\n\nAutomatically Collected Information:\n• Device information and identifiers\n• Usage data and app interactions\n• Location data (with permission)\n• Cookies and similar technologies"
          },
          {
            id: 2,
            title: "How We Use Your Information",
            content: "We use your information to provide, maintain, and improve our services:\n\n• Process bookings and payments\n• Communicate about services and appointments\n• Personalize your experience\n• Send promotional offers (with consent)\n• Analyze usage patterns to improve our app\n• Ensure security and prevent fraud\n• Comply with legal obligations"
          },
          {
            id: 3,
            title: "Information Sharing and Disclosure",
            content: "We do not sell your personal information. We may share your information in these limited circumstances:\n\n• With service providers who perform services on our behalf\n• With beauty professionals for appointment purposes\n• When required by law or to protect our rights\n• In connection with a merger, acquisition, or sale of assets\n• With your explicit consent\n\nAll third parties are required to protect your information and use it only for specified purposes."
          },
          {
            id: 4,
            title: "Data Security",
            content: "We implement appropriate security measures to protect your personal information:\n\n• Encryption of sensitive data in transit and at rest\n• Regular security assessments and updates\n• Limited access to personal information\n• Secure payment processing through certified providers\n• Regular monitoring for unauthorized access\n\nHowever, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security."
          },
          {
            id: 5,
            title: "Your Privacy Rights",
            content: "You have the following rights regarding your personal information:\n\n• Access: Request a copy of your personal data\n• Correction: Update or correct inaccurate information\n• Deletion: Request deletion of your account and data\n• Portability: Receive your data in a machine-readable format\n• Opt-out: Unsubscribe from marketing communications\n• Restrict processing: Limit how we use your information\n\nTo exercise these rights, contact us through the app or email privacy@beautyhub.com."
          },
          {
            id: 6,
            title: "Cookies and Tracking Technologies",
            content: "We use cookies and similar technologies to enhance your experience:\n\n• Essential cookies for app functionality\n• Analytics cookies to understand usage patterns\n• Preference cookies to remember your settings\n• Marketing cookies for personalized ads (with consent)\n\nYou can manage cookie preferences in your device settings, but disabling certain cookies may affect app functionality."
          },
          {
            id: 7,
            title: "Third-Party Services",
            content: "Our app may integrate with third-party services:\n\n• Payment processors (Razorpay, Paytm, etc.)\n• Analytics providers (Google Analytics)\n• Social media platforms\n• Map and location services\n\nThese services have their own privacy policies, and we encourage you to review them. We are not responsible for their privacy practices."
          },
          {
            id: 8,
            title: "Children's Privacy",
            content: "Our services are not intended for children under 18:\n\n• We do not knowingly collect information from children\n• If we become aware of child data collection, we will delete it\n• Parents can contact us to remove their child's information\n• We comply with applicable children's privacy laws"
          },
          {
            id: 9,
            title: "Data Retention",
            content: "We retain your information only as long as necessary:\n\n• Account information: Until you delete your account\n• Booking history: 3 years for business records\n• Payment data: As required by financial regulations\n• Marketing data: Until you opt out\n• Analytics data: Aggregated and anonymized after 2 years\n\nWhen we delete your data, it will be removed from our active systems within 30 days."
          },
          {
            id: 10,
            title: "International Data Transfers",
            content: "Your information may be transferred to and processed in countries other than India:\n\n• We ensure adequate protection through appropriate safeguards\n• Data transfers comply with applicable privacy laws\n• We use standard contractual clauses for international transfers\n• You consent to such transfers by using our services"
          },
          {
            id: 11,
            title: "Updates to This Policy",
            content: "We may update this Privacy Policy from time to time:\n\n• Changes will be posted in the app with the updated date\n• Significant changes will be communicated via email or notification\n• Continued use of our services constitutes acceptance\n• We encourage you to review this policy periodically"
          },
          {
            id: 12,
            title: "Contact Information",
            content: "For privacy-related questions or concerns, contact us:\n\nEmail: privacy@beautyhub.com\nPhone: +91 98765 43210\nAddress: Privacy Officer, Beauty Hub\n123 Beauty Street, Amritsar, Punjab 143001\n\nResponse time: We aim to respond to privacy requests within 30 days."
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const response = await fetch(`${API_URL}/user/privacy-settings`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrivacySettings(data.settings || privacySettings);
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
    }
  };

  const updatePrivacySetting = async (key, value) => {
    try {
      setUpdating(true);
      
      const newSettings = { ...privacySettings, [key]: value };
      setPrivacySettings(newSettings);

      const response = await fetch(`${API_URL}/user/privacy-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        // Revert on failure
        setPrivacySettings(privacySettings);
      }
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      // Revert on failure
      setPrivacySettings(privacySettings);
    } finally {
      setUpdating(false);
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Icon name="shield-checkmark" size={48} color="#FF6B9D" />
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.companyName}>{privacyData.company_name}</Text>
          <Text style={styles.lastUpdated}>
            Last Updated: {new Date(privacyData.last_updated).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Your privacy is important to us. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you use our mobile application 
            and services.
          </Text>
        </View>

        {/* Privacy Settings (for logged in users) */}
        {user && (
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Your Privacy Preferences</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Marketing Emails</Text>
                  <Text style={styles.settingDescription}>Receive promotional offers and updates</Text>
                </View>
                <Switch
                  value={privacySettings.marketing_emails}
                  onValueChange={(value) => updatePrivacySetting('marketing_emails', value)}
                  trackColor={{ false: '#E0E0E0', true: '#FFB3D1' }}
                  thumbColor={privacySettings.marketing_emails ? '#FF6B9D' : '#BDC3C7'}
                  disabled={updating}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Get notified about appointments and updates</Text>
                </View>
                <Switch
                  value={privacySettings.push_notifications}
                  onValueChange={(value) => updatePrivacySetting('push_notifications', value)}
                  trackColor={{ false: '#E0E0E0', true: '#FFB3D1' }}
                  thumbColor={privacySettings.push_notifications ? '#FF6B9D' : '#BDC3C7'}
                  disabled={updating}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Analytics Data</Text>
                  <Text style={styles.settingDescription}>Help improve our app with usage analytics</Text>
                </View>
                <Switch
                  value={privacySettings.data_analytics}
                  onValueChange={(value) => updatePrivacySetting('data_analytics', value)}
                  trackColor={{ false: '#E0E0E0', true: '#FFB3D1' }}
                  thumbColor={privacySettings.data_analytics ? '#FF6B9D' : '#BDC3C7'}
                  disabled={updating}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Third-party Sharing</Text>
                  <Text style={styles.settingDescription}>Share data with trusted partners for better service</Text>
                </View>
                <Switch
                  value={privacySettings.third_party_sharing}
                  onValueChange={(value) => updatePrivacySetting('third_party_sharing', value)}
                  trackColor={{ false: '#E0E0E0', true: '#FFB3D1' }}
                  thumbColor={privacySettings.third_party_sharing ? '#FF6B9D' : '#BDC3C7'}
                  disabled={updating}
                />
              </View>
            </View>
          </View>
        )}

        {/* Privacy Policy Sections */}
        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionsTitle}>Privacy Policy Details</Text>
          {privacyData.sections && privacyData.sections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Icon 
                    name={getSectionIcon(section.title)} 
                    size={20} 
                    color="#FF6B9D" 
                    style={styles.sectionIcon}
                  />
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

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Icon name="mail" size={24} color="#FF6B9D" />
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>Privacy Questions?</Text>
            <Text style={styles.contactText}>
              Contact our privacy team at {privacyData.contact_email} or through our Help Center.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getSectionIcon = (title) => {
  const iconMap = {
    'Information We Collect': 'information-circle',
    'How We Use Your Information': 'analytics',
    'Information Sharing and Disclosure': 'people',
    'Data Security': 'shield-checkmark',
    'Your Privacy Rights': 'key',
    'Cookies and Tracking Technologies': 'globe',
    'Third-Party Services': 'link',
    'Children\'s Privacy': 'person',
    'Data Retention': 'time',
    'International Data Transfers': 'airplane',
    'Updates to This Policy': 'refresh',
    'Contact Information': 'call',
  };
  return iconMap[title] || 'document-text';
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
    marginTop: 15,
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
  settingsSection: {
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  sectionsContainer: {
    marginBottom: 20,
  },
  sectionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
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
  sectionIcon: {
    marginRight: 12,
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
  contactSection: {
    backgroundColor: '#FFE8F0',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 5,
  },
  contactText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default PrivacyScreen;