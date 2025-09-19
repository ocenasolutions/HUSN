import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';

const AboutUsScreen = ({ navigation }) => {
  const [aboutData, setAboutData] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      
      const [aboutResponse, teamResponse, socialResponse] = await Promise.all([
        fetch(`${API_URL}/about/company`),
        fetch(`${API_URL}/about/team`),
        fetch(`${API_URL}/about/social`)
      ]);
      
      const aboutResult = await aboutResponse.json();
      const teamResult = await teamResponse.json();
      const socialResult = await socialResponse.json();
      
      setAboutData(aboutResult.data || {});
      setTeamMembers(teamResult.data || []);
      setSocialLinks(socialResult.data || []);
      
    } catch (error) {
      console.error('Error fetching about data:', error);
      // Fallback data if API fails
      setAboutData({
        company_name: "Beauty Hub",
        description: "We are dedicated to providing premium beauty services and products to help you look and feel your best. Our team of experienced professionals uses the latest techniques and high-quality products to ensure exceptional results.",
        mission: "To empower everyone to feel confident and beautiful by providing accessible, high-quality beauty services and products.",
        vision: "To become the leading beauty service provider, known for innovation, excellence, and customer satisfaction.",
        founded_year: "2020",
        locations: "5+ Cities",
        customers_served: "10,000+",
        image_url: "https://via.placeholder.com/400x200/FF6B9D/FFFFFF?text=Beauty+Hub"
      });
      
      setTeamMembers([
        {
          id: 1,
          name: "Sarah Johnson",
          position: "Founder & CEO",
          experience: "10+ years",
          image_url: "https://via.placeholder.com/120x120/FF6B9D/FFFFFF?text=SJ",
          bio: "Expert in beauty industry with passion for helping clients achieve their beauty goals."
        },
        {
          id: 2,
          name: "Emily Davis",
          position: "Head Stylist",
          experience: "8+ years",
          image_url: "https://via.placeholder.com/120x120/54A0FF/FFFFFF?text=ED",
          bio: "Specialized in hair styling and makeup with extensive training in latest trends."
        }
      ]);
      
      setSocialLinks([
        { platform: "Instagram", url: "https://instagram.com/beautyhub", icon: "logo-instagram" },
        { platform: "Facebook", url: "https://facebook.com/beautyhub", icon: "logo-facebook" },
        { platform: "Twitter", url: "https://twitter.com/beautyhub", icon: "logo-twitter" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openSocialLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
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
          <Text style={styles.headerTitle}>About Us</Text>
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
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Company Hero Section */}
        {aboutData.image_url && (
          <View style={styles.heroSection}>
            <Image 
              source={{ uri: aboutData.image_url }} 
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>{aboutData.company_name}</Text>
              <Text style={styles.heroSubtitle}>Beauty & Wellness Services</Text>
            </View>
          </View>
        )}

        {/* Company Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who We Are</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{aboutData.description}</Text>
          </View>
        </View>

        {/* Mission & Vision */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission & Vision</Text>
          <View style={styles.missionVisionCard}>
            <View style={styles.missionSection}>
              <Icon name="rocket" size={24} color="#FF6B9D" />
              <Text style={styles.missionTitle}>Mission</Text>
              <Text style={styles.missionText}>{aboutData.mission}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.visionSection}>
              <Icon name="eye" size={24} color="#54A0FF" />
              <Text style={styles.visionTitle}>Vision</Text>
              <Text style={styles.visionText}>{aboutData.vision}</Text>
            </View>
          </View>
        </View>

        {/* Company Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Achievements</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="calendar" size={30} color="#FF6B9D" />
              <Text style={styles.statNumber}>{aboutData.founded_year}</Text>
              <Text style={styles.statLabel}>Founded</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="location" size={30} color="#54A0FF" />
              <Text style={styles.statNumber}>{aboutData.locations}</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="people" size={30} color="#9B59B6" />
              <Text style={styles.statNumber}>{aboutData.customers_served}</Text>
              <Text style={styles.statLabel}>Happy Customers</Text>
            </View>
          </View>
        </View>

        {/* Team Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meet Our Team</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {teamMembers.map((member) => (
              <View key={member.id} style={styles.teamMemberCard}>
                <Image 
                  source={{ uri: member.image_url }} 
                  style={styles.memberImage}
                  resizeMode="cover"
                />
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPosition}>{member.position}</Text>
                <Text style={styles.memberExperience}>{member.experience}</Text>
                <Text style={styles.memberBio}>{member.bio}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Social Media Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                style={styles.socialButton}
                onPress={() => openSocialLink(social.url)}
              >
                <Icon name={social.icon} size={24} color="#fff" />
                <Text style={styles.socialText}>{social.platform}</Text>
              </TouchableOpacity>
            ))}
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
  heroSection: {
    height: 200,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 16,
    color: '#34495E',
    lineHeight: 24,
    textAlign: 'justify',
  },
  missionVisionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  missionSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginTop: 10,
    marginBottom: 10,
  },
  missionText: {
    fontSize: 14,
    color: '#34495E',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  visionSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  visionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#54A0FF',
    marginTop: 10,
    marginBottom: 10,
  },
  visionText: {
    fontSize: 14,
    color: '#34495E',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 5,
  },
  teamMemberCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginRight: 15,
    width: 200,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  memberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  memberPosition: {
    fontSize: 14,
    color: '#FF6B9D',
    marginBottom: 5,
  },
  memberExperience: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  memberBio: {
    fontSize: 12,
    color: '#34495E',
    textAlign: 'center',
    lineHeight: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  socialText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 50,
  },
});

export default AboutUsScreen;