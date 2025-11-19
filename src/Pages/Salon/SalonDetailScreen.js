import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  Linking,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import BookAppointmentModal from './BookAppointmentModal';

const { width } = Dimensions.get('window');

const SalonDetailScreen = ({ route, navigation }) => {
  const { salonId } = route.params;
  const { user, tokens } = useAuth();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [showBookingModal, setShowBookingModal] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchSalonDetail();
  }, [salonId]);

  const fetchSalonDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/salons/${salonId}`);
      const result = await response.json();

      if (result.success) {
        setSalon(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load salon details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Fetch salon detail error:', error);
      Alert.alert('Error', 'Failed to load salon details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  const handleCall = useCallback(() => {
    if (salon?.contactNumber) {
      Linking.openURL(`tel:${salon.contactNumber}`);
    }
  }, [salon]);

  const handleEmail = useCallback(() => {
    if (salon?.email) {
      Linking.openURL(`mailto:${salon.email}`);
    }
  }, [salon]);

  const handleGetDirections = useCallback(() => {
    if (salon?.location?.coordinates) {
      const [lng, lat] = salon.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    }
  }, [salon]);

  const handleBookService = useCallback((service) => {
    navigation.navigate('ServiceDetail', { 
      serviceId: service.serviceId._id,
      salonId: salon._id 
    });
  }, [navigation, salon]);

  const handleBookingConfirm = useCallback(async (bookingData) => {
    try {
      // Here you would typically make an API call to create the booking
      console.log('Booking data:', bookingData);
      Alert.alert(
        'Booking Confirmed!',
        `Your appointment has been booked for ${bookingData.date} at ${bookingData.time} for ${bookingData.guestCount} guest(s).`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    }
  }, []);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditSalon', { salonId: salon._id });
  }, [navigation, salon]);

  const handleManageSlots = useCallback(() => {
    navigation.navigate('ManageSlots', { salonId: salon._id });
  }, [navigation, salon]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Salon',
      'Are you sure you want to delete this salon? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/salons/${salon._id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${tokens?.accessToken}`,
                },
              });

              const result = await response.json();

              if (result.success) {
                Alert.alert('Success', 'Salon deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete salon');
              }
            } catch (error) {
              console.error('Delete salon error:', error);
              Alert.alert('Error', 'Failed to delete salon');
            }
          }
        }
      ]
    );
  }, [salon, tokens, navigation]);

  const renderPhotoItem = useCallback(({ item }) => (
    <Image
      source={{ uri: item }}
      style={styles.photoItem}
      resizeMode="cover"
    />
  ), []);

  const renderServiceMenuPhoto = useCallback(({ item }) => (
    <View style={styles.serviceMenuPhotoContainer}>
      <Image
        source={{ uri: typeof item === 'string' ? item : item.url }}
        style={styles.serviceMenuPhoto}
        resizeMode="cover"
      />
      {item.description && (
        <Text style={styles.serviceMenuDescription}>{item.description}</Text>
      )}
    </View>
  ), []);

  const renderServiceItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => handleBookService(item)}
    >
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
        <Text style={styles.serviceDuration}>
          <Icon name="time-outline" size={14} color="#7F8C8D" />
          {' '}{item.duration} min
        </Text>
      </View>
      <View style={styles.servicePriceContainer}>
        <Text style={styles.servicePrice}>₹{item.price}</Text>
        <Icon name="chevron-forward" size={20} color="#FF6B9D" />
      </View>
    </TouchableOpacity>
  ), [handleBookService]);

  const renderOfferItem = useCallback(({ item }) => {
    const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
    
    if (isExpired || !item.active) return null;

    return (
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <Icon name="gift" size={20} color="#E74C3C" />
          <Text style={styles.offerTitle}>{item.title}</Text>
        </View>
        <Text style={styles.offerDescription}>{item.description}</Text>
        <View style={styles.offerFooter}>
          <Text style={styles.offerDiscount}>{item.discount}% OFF</Text>
          {item.validUntil && (
            <Text style={styles.offerValidity}>
              Valid till {new Date(item.validUntil).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  }, []);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading salon details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!salon) return null;

  const activeOffers = salon.offers?.filter(offer => 
    offer.active && (!offer.validUntil || new Date(offer.validUntil) > new Date())
  ) || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        
        {isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity 
              style={styles.manageSlotsButton}
              onPress={handleManageSlots}
            >
              <Icon name="calendar-outline" size={20} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Icon name="create-outline" size={20} color="#3498DB" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Icon name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Photo */}
        <Image
          source={{ uri: salon.coverPhoto }}
          style={styles.coverPhoto}
          resizeMode="cover"
        />

        {/* Main Info */}
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.salonName}>{salon.name}</Text>
            {salon.verified && (
              <Icon name="checkmark-circle" size={24} color="#10B981" />
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Icon name="star" size={18} color="#FFD700" />
            <Text style={styles.ratingText}>
              {salon.rating.toFixed(1)} ({salon.totalReviews} reviews)
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{salon.description}</Text>

          {/* Book Appointment Button */}
          <TouchableOpacity 
            style={styles.bookAppointmentButton}
            onPress={() => setShowBookingModal(true)}
          >
            <Icon name="calendar" size={20} color="#fff" />
            <Text style={styles.bookAppointmentText}>Book Appointment</Text>
          </TouchableOpacity>

          {/* Contact Buttons */}
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleCall}
            >
              <Icon name="call" size={18} color="#fff" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            
            {salon.email && (
              <TouchableOpacity 
                style={[styles.contactButton, styles.emailButton]}
                onPress={handleEmail}
              >
                <Icon name="mail" size={18} color="#fff" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.contactButton, styles.directionsButton]}
              onPress={handleGetDirections}
            >
              <Icon name="navigate" size={18} color="#fff" />
              <Text style={styles.contactButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Offers */}
        {activeOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Offers</Text>
            <FlatList
              data={activeOffers}
              renderItem={renderOfferItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersContainer}
            />
          </View>
        )}

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Services ({salon.services?.length || 0})
          </Text>
          {salon.services?.map((service, index) => (
            <View key={index}>
              {renderServiceItem({ item: service })}
            </View>
          ))}
        </View>

        {/* Service Menu Photos */}
        {salon.serviceMenuPhotos?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Menu</Text>
            <FlatList
              data={salon.serviceMenuPhotos}
              renderItem={renderServiceMenuPhoto}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.serviceMenuContainer}
            />
          </View>
        )}

        {/* Photos */}
        {salon.photos?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <FlatList
              data={salon.photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
            />
          </View>
        )}

        {/* Opening Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opening Hours</Text>
          <View style={styles.hoursContainer}>
            {daysOfWeek.map((day) => {
              const hours = salon.openingHours?.[day];
              return (
                <View key={day} style={styles.hourRow}>
                  <Text style={styles.dayText}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <Text style={[
                    styles.hoursText,
                    hours?.closed && styles.closedText
                  ]}>
                    {hours?.closed ? 'Closed' : `${hours?.open || 'N/A'} - ${hours?.close || 'N/A'}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Amenities */}
        {salon.amenities?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {salon.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Icon 
                    name={getAmenityIcon(amenity)} 
                    size={20} 
                    color="#FF6B9D" 
                  />
                  <Text style={styles.amenityText}>
                    {amenity.replace('-', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.addressCard}>
            <Icon name="location" size={24} color="#FF6B9D" />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressText}>
                {salon.address.street}
              </Text>
              {salon.address.landmark && (
                <Text style={styles.landmarkText}>
                  Near {salon.address.landmark}
                </Text>
              )}
              <Text style={styles.cityText}>
                {salon.address.city}, {salon.address.state} - {salon.address.pincode}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Booking Modal */}
      <BookAppointmentModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        salon={salon}
        onBookingConfirm={handleBookingConfirm}
      />
    </SafeAreaView>
  );
};

const getAmenityIcon = (amenity) => {
  const iconMap = {
    'wifi': 'wifi',
    'parking': 'car',
    'ac': 'snow',
    'card-payment': 'card',
    'upi': 'phone-portrait',
    'wheelchair-accessible': 'accessibility',
    'waiting-area': 'people',
    'music': 'musical-notes',
    'refreshments': 'cafe',
    'magazines': 'book',
    'tv': 'tv',
  };
  return iconMap[amenity] || 'checkmark-circle';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  adminActions: {
    flexDirection: 'row',
    gap: 15,
  },
  manageSlotsButton: {
    padding: 5,
  },
  editButton: {
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  coverPhoto: {
    width: '100%',
    height: 250,
    backgroundColor: '#F8F9FA',
  },
  mainInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  salonName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 8,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#7F8C8D',
    lineHeight: 22,
    marginBottom: 20,
  },
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
    gap: 10,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookAppointmentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emailButton: {
    backgroundColor: '#9B59B6',
  },
  directionsButton: {
    backgroundColor: '#27AE60',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  offersContainer: {
    gap: 15,
  },
  offerCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 15,
    width: width - 80,
    borderWidth: 1,
    borderColor: '#F8D866',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  offerDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 10,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerDiscount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  offerValidity: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  servicePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  serviceMenuContainer: {
    gap: 15,
  },
  serviceMenuPhotoContainer: {
    width: 250,
  },
  serviceMenuPhoto: {
    width: 250,
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  serviceMenuDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 8,
    lineHeight: 18,
  },
  photosContainer: {
    gap: 10,
  },
  photoItem: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  hoursContainer: {
    gap: 10,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  hoursText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  closedText: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  amenityText: {
    fontSize: 13,
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    gap: 15,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  cityText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default SalonDetailScreen;