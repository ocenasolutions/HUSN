import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const ServiceDetails = ({ route, navigation }) => {
  // Add safety checks for route parameters
  const service = route?.params?.service || {};
  
  // Provide default values for service properties
  const serviceData = {
    title: service.title || 'Service',
    subtitle: service.subtitle || 'Professional service',
    price: service.price || '₹0',
    originalPrice: service.originalPrice || '₹0',
    duration: service.duration || '1-2 hours',
    features: service.features || [], // Default to empty array
    rating: service.rating || 4.5,
    reviews: service.reviews || 0,
    color: service.color || '#667eea',
    icon: service.icon || 'construct-outline',
    description: service.description || 'Professional service with quality guarantee.',
    ...service 
  };

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const servicePackages = [
    {
      id: 1,
      name: 'Basic',
      price: serviceData.price,
      originalPrice: serviceData.originalPrice,
      duration: serviceData.duration,
      features: serviceData.features.slice(0, Math.min(2, serviceData.features.length)),
      popular: false,
    },
    {
      id: 2,
      name: 'Standard',
      price: `₹${parseInt(serviceData.price.replace('₹', '')) + 200}`,
      originalPrice: `₹${parseInt(serviceData.originalPrice.replace('₹', '')) + 200}`,
      duration: '2-4 hours',
      features: [...serviceData.features, 'Priority booking', 'Free follow-up'],
      popular: true,
    },
    {
      id: 3,
      name: 'Premium',
      price: `₹${parseInt(serviceData.price.replace('₹', '')) + 500}`,
      originalPrice: `₹${parseInt(serviceData.originalPrice.replace('₹', '')) + 500}`,
      duration: '3-5 hours',
      features: [...serviceData.features, 'Priority booking', 'Free follow-up', 'Same day service', '30-day warranty'],
      popular: false,
    },
  ];

  // Mock reviews data
  const reviews = [
    {
      id: 1,
      userName: 'Rajesh Kumar',
      rating: 5,
      comment: 'Excellent service! Very professional and thorough.',
      date: '2024-08-15',
      verified: true,
    },
    {
      id: 2,
      userName: 'Priya Sharma',
      rating: 4,
      comment: 'Good service, arrived on time. Will book again.',
      date: '2024-08-10',
      verified: true,
    },
    {
      id: 3,
      userName: 'Amit Singh',
      rating: 5,
      comment: 'Outstanding work quality. Highly recommended!',
      date: '2024-08-05',
      verified: false,
    },
  ];

  const handleBookNow = () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a service package to continue.');
      return;
    }
    setShowBookingModal(true);
  };

  const confirmBooking = () => {
    setShowBookingModal(false);
    Alert.alert(
      'Booking Confirmed!',
      `Your ${serviceData.title} service has been booked successfully. You will receive a confirmation call soon.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  // Handle case where navigation is not available
  const handleGoBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceData.title}</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Icon name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Hero */}
        <View style={styles.serviceHero}>
          <View style={[styles.serviceIconLarge, { backgroundColor: serviceData.color }]}>
            <Icon name={serviceData.icon} size={48} color="#fff" />
          </View>
          <Text style={styles.serviceTitle}>{serviceData.title}</Text>
          <Text style={styles.serviceSubtitle}>{serviceData.subtitle}</Text>
          
          <View style={styles.serviceStats}>
            <View style={styles.statItem}>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{serviceData.rating}</Text>
              </View>
              <Text style={styles.statLabel}>{serviceData.reviews} reviews</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.durationContainer}>
                <Icon name="time-outline" size={16} color="#667eea" />
                <Text style={styles.durationText}>{serviceData.duration}</Text>
              </View>
              <Text style={styles.statLabel}>Service time</Text>
            </View>
          </View>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Service</Text>
          <Text style={styles.description}>{serviceData.description}</Text>
        </View>

        {/* Service Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Package</Text>
          {servicePackages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                selectedPackage?.id === pkg.id && styles.selectedPackage,
                pkg.popular && styles.popularPackage,
              ]}
              onPress={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <View>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageDuration}>{pkg.duration}</Text>
                </View>
                <View style={styles.packagePricing}>
                  <Text style={styles.packagePrice}>{pkg.price}</Text>
                  <Text style={styles.packageOriginalPrice}>{pkg.originalPrice}</Text>
                </View>
              </View>

              <View style={styles.packageFeatures}>
                {pkg.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {selectedPackage?.id === pkg.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerInitial}>
                      {review.userName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <View style={styles.reviewerNameContainer}>
                      <Text style={styles.reviewerName}>{review.userName}</Text>
                      {review.verified && (
                        <Icon name="checkmark-circle" size={14} color="#4CAF50" />
                      )}
                    </View>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
                <View style={styles.reviewRating}>
                  {renderStars(review.rating)}
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>

        {/* Similar Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>You Might Also Like</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.similarService}>
              <View style={[styles.similarServiceIcon, { backgroundColor: '#4CAF50' }]}>
                <Icon name="leaf-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.similarServiceTitle}>Garden Care</Text>
              <Text style={styles.similarServicePrice}>₹399</Text>
            </View>
            
            <View style={styles.similarService}>
              <View style={[styles.similarServiceIcon, { backgroundColor: '#FF9800' }]}>
                <Icon name="car-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.similarServiceTitle}>Car Wash</Text>
              <Text style={styles.similarServicePrice}>₹299</Text>
            </View>
            
            <View style={styles.similarService}>
              <View style={[styles.similarServiceIcon, { backgroundColor: '#E91E63' }]}>
                <Icon name="shirt-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.similarServiceTitle}>Laundry</Text>
              <Text style={styles.similarServicePrice}>₹199</Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.fromText}>Starting from</Text>
          <Text style={styles.bottomPrice}>{serviceData.price}</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            
            <View style={styles.bookingSummary}>
              <Text style={styles.summaryTitle}>{serviceData.title}</Text>
              <Text style={styles.summaryPackage}>Package: {selectedPackage?.name}</Text>
              <Text style={styles.summaryPrice}>Price: {selectedPackage?.price}</Text>
              <Text style={styles.summaryDuration}>Duration: {selectedPackage?.duration}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmBooking}
              >
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  serviceHero: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  serviceIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  serviceSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  serviceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
    marginHorizontal: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  selectedPackage: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  popularPackage: {
    borderColor: '#667eea',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  packageDuration: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  packagePricing: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  packageOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  packageFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  similarService: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  similarServiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarServiceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  similarServicePrice: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceInfo: {
    flex: 1,
  },
  fromText: {
    fontSize: 12,
    color: '#666',
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bookButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: width - 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  bookingSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryPackage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryDuration: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: '#667eea',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ServiceDetails;