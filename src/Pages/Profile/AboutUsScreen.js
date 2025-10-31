import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../../Components/Header';

const AboutUsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Header/>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Company Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>            
            <Text style={styles.heroTitle}>Husn</Text>
            <Text style={styles.heroSubtitle}>Luxury Unisex Salon & Spa</Text>
            <View style={styles.locationBadge}>
              <Icon name="location" size={16} color="#FF6B9D" />
              <Text style={styles.locationText}>Sector 18, Chandigarh</Text>
            </View>
          </View>
        </View>

        {/* About Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>
              At <Text style={styles.brandName}>Husn – Luxury Unisex Salon & Spa</Text>, we believe beauty is an experience, not just a service. Located in the heart of Sector 18, Chandigarh, Husn is your premium destination for hair, beauty, and wellness.
            </Text>
            <Text style={styles.descriptionText}>
              Our team of expert professionals brings together creativity, skill, and world-class techniques to deliver services that are as unique as you are. From precision haircuts, styling, and bridal makeovers to rejuvenating facials, luxury spa therapies, and personalized skincare solutions, we ensure every visit leaves you feeling refreshed, confident, and radiant.
            </Text>
            <Text style={styles.descriptionText}>
              At Husn, elegance meets comfort. With a luxurious ambiance, top-quality products, and personalized attention, we create a space where beauty and relaxation go hand in hand. Whether you're preparing for a special occasion or simply indulging in self-care, <Text style={styles.brandName}>Husn – Luxury Unisex Salon & Spa</Text> is your one-stop destination for transforming everyday moments into extraordinary experiences.
            </Text>
          </View>
        </View>

        {/* Services Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.servicesGrid}>
            <View style={styles.serviceCard}>
              <Icon name="cut" size={32} color="#FF6B9D" />
              <Text style={styles.serviceTitle}>Hair Styling</Text>
              <Text style={styles.serviceDesc}>Precision cuts & styling</Text>
            </View>
            <View style={styles.serviceCard}>
              <Icon name="flower" size={32} color="#54A0FF" />
              <Text style={styles.serviceTitle}>Bridal Makeovers</Text>
              <Text style={styles.serviceDesc}>Your special day perfect</Text>
            </View>
            <View style={styles.serviceCard}>
              <Icon name="sparkles" size={32} color="#9B59B6" />
              <Text style={styles.serviceTitle}>Facial Treatments</Text>
              <Text style={styles.serviceDesc}>Rejuvenating facials</Text>
            </View>
            <View style={styles.serviceCard}>
              <Icon name="leaf" size={32} color="#26DE81" />
              <Text style={styles.serviceTitle}>Luxury Spa</Text>
              <Text style={styles.serviceDesc}>Therapeutic wellness</Text>
            </View>
            <View style={styles.serviceCard}>
              <Icon name="heart" size={32} color="#FC5C65" />
              <Text style={styles.serviceTitle}>Skincare</Text>
              <Text style={styles.serviceDesc}>Personalized solutions</Text>
            </View>
            <View style={styles.serviceCard}>
              <Icon name="star" size={32} color="#FD9644" />
              <Text style={styles.serviceTitle}>Premium Care</Text>
              <Text style={styles.serviceDesc}>World-class products</Text>
            </View>
          </View>
        </View>

        {/* Why Choose Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Husn?</Text>
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name="people" size={24} color="#FF6B9D" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Expert Professionals</Text>
                <Text style={styles.featureDesc}>Highly skilled team with years of experience</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name="diamond" size={24} color="#54A0FF" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Luxurious Ambiance</Text>
                <Text style={styles.featureDesc}>Elegant and comfortable environment</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name="shield-checkmark" size={24} color="#26DE81" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Premium Products</Text>
                <Text style={styles.featureDesc}>Top-quality products for best results</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon name="person" size={24} color="#9B59B6" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Personalized Care</Text>
                <Text style={styles.featureDesc}>Customized services for your unique needs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Us</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Icon name="location" size={24} color="#FF6B9D" />
              <View style={styles.contactText}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>Sector 18, Chandigarh</Text>
              </View>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <Icon name="time" size={24} color="#54A0FF" />
              <View style={styles.contactText}>
                <Text style={styles.contactLabel}>Hours</Text>
                <Text style={styles.contactValue}>10:00 AM - 8:00 PM (Daily)</Text>
              </View>
            </View>
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
  heroSection: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 15,
    fontWeight: '500',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  locationText: {
    marginLeft: 6,
    color: '#FF6B9D',
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 15,
    color: '#34495E',
    lineHeight: 24,
    textAlign: 'justify',
    marginBottom: 15,
  },
  brandName: {
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 10,
    textAlign: 'center',
  },
  serviceDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 5,
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
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
    paddingVertical: 10,
  },
  contactText: {
    marginLeft: 15,
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default AboutUsScreen;