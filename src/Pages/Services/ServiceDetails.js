// src/Pages/Services/ServiceDetails.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext'; 

const { width } = Dimensions.get('window');

const ServiceDetails = ({ navigation, route }) => {
  const { service } = route.params;
  const { tokens } = useAuth(); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState('At Home');
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [otherServices, setOtherServices] = useState([]);
  const [otherServicesLoading, setOtherServicesLoading] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Mock data for professionals
  const mockProfessionals = [
    {
      id: '1',
      name: 'Aditya',
      rating: 4.8,
      reviews: 2847,
      experience: '5+ years experience',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b332c5aa?w=150&h=150&fit=crop&crop=face',
      specialty: 'Facial Specialist',
      price: service.price
    },
    {
      id: '2',
      name: 'Jhon',
      rating: 4.9,
      reviews: 3254,
      experience: '7+ years experience',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      specialty: 'Senior Facial Specialist',
      price: service.price + 200
    },
    {
      id: '3',
      name: 'David',
      rating: 4.7,
      reviews: 1892,
      experience: '4+ years experience',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      specialty: 'Skincare Expert',
      price: service.price + 150
    }
  ];

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  useEffect(() => {
    fetchReviews();
    fetchOtherServices();
    if (mockProfessionals.length > 0) {
      setSelectedProfessional(mockProfessionals[0]);
    }
  }, []);
  
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_URL}/services/${service._id}/reviews`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchOtherServices = async () => {
    try {
      setOtherServicesLoading(true);
      const response = await fetch(
        `${API_URL}/services?category=${service.category}&limit=6&exclude=${service._id}`
      );
      const data = await response.json();
      
      if (data.success) {
        setOtherServices(data.data || []);
      }
    } catch (error) {
      console.error('Fetch other services error:', error);
    } finally {
      setOtherServicesLoading(false);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    if (!selectedProfessional) {
      Alert.alert('Error', 'Please select a professional');
      return;
    }

    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication required. Please login again.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          serviceId: service._id,
          quantity,
          selectedDate: selectedDate.toISOString(),
          selectedTime: selectedTime,
          notes,
          serviceType: selectedServiceType,
          professionalId: selectedProfessional.id,
          professionalName: selectedProfessional.name,
          totalPrice: selectedProfessional.price * quantity
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update cart count
        setCartItemCount(prev => prev + 1);
        
        // Show success message with options
        Alert.alert(
          'Added to Cart!', 
          `${service.name} has been added to your cart successfully!`,
          [
            {
              text: 'Continue Shopping',
              style: 'cancel',
            },
            {
              text: 'View Cart',
              onPress: () => navigation.navigate('ViewCart')
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to add service to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={14} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Icon key={i} name="star-half" size={14} color="#FFD700" />);
      } else {
        stars.push(<Icon key={i} name="star-outline" size={14} color="#E5E5E5" />);
      }
    }
    return stars;
  };

  const renderProfessionalItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.professionalCard,
        selectedProfessional?.id === item.id && styles.selectedProfessionalCard
      ]}
      onPress={() => setSelectedProfessional(item)}
    >
      <Image 
        source={{ uri: item.image }}
        style={styles.professionalImage}
        resizeMode="cover"
      />
      <View style={styles.professionalInfo}>
        <Text style={styles.professionalName}>{item.name}</Text>
        <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
        <Text style={styles.professionalExperience}>{item.experience}</Text>
        <View style={styles.professionalRating}>
          <Icon name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating} ({item.reviews})</Text>
        </View>
      </View>
      <View style={styles.selectContainer}>
        {selectedProfessional?.id === item.id ? (
          <Icon name="checkmark-circle" size={24} color="#FF6B9D" />
        ) : (
          <View style={styles.selectButton}>
            <Text style={styles.selectText}>Select</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const totalPrice = selectedProfessional ? selectedProfessional.price * quantity : service.price * quantity;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
    : service.rating || 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{service.name}</Text>
        
        {/* Cart Badge */}
        {cartItemCount > 0 && (
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => navigation.navigate('ViewCart')}
          >
            <Icon name="cart-outline" size={24} color="#2C3E50" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Service Image */}
          <Image 
            source={{ uri: service.image_url || 'https://via.placeholder.com/400x300' }}
            style={styles.serviceImage}
            resizeMode="cover"
          />

          <View style={styles.contentContainer}>
            {/* Service Info */}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              
              <View style={styles.ratingRow}>
                <View style={styles.starsContainer}>
                  {renderStars(parseFloat(averageRating))}
                </View>
                <Text style={styles.ratingText}>
                  {averageRating} ({reviews.length} reviews)
                </Text>
              </View>
            </View>

            {/* Select Professional Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a professional</Text>
              <FlatList
                data={mockProfessionals}
                renderItem={renderProfessionalItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Select Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a time</Text>
              <View style={styles.timeSlots}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-outline" size={18} color="#FF6B9D" />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
<View style={styles.bottomSection}>
  <View style={styles.priceAndButtonRow}>
    <View style={styles.priceContainer}>
      <Text style={styles.durationPrice}>
        ₹{selectedProfessional?.price || service.price}, 60 min
      </Text>
      <Text style={styles.totalLabel}>₹{totalPrice}</Text>
    </View>
    
    <TouchableOpacity
      style={[styles.addToCartButton, loading && styles.disabledButton]}
      onPress={handleAddToCart}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <View style={styles.addToCartContent}>
          <Icon name="cart-outline" size={20} color="#fff" style={styles.cartIcon} />
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
  
  {cartItemCount > 0 && (
    <TouchableOpacity
      style={styles.viewCartButton}
      onPress={() => navigation.navigate('ViewCart')}
    >
      <Text style={styles.viewCartButtonText}>
        View Cart ({cartItemCount})
      </Text>
    </TouchableOpacity>
  )}
</View>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  cartButton: {
    position: 'relative',
    padding: 5,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  serviceImage: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 20,
  },
  serviceInfo: {
    marginBottom: 30,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  // Professional Selection Styles
  professionalCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedProfessionalCard: {
    borderColor: '#FF6B9D',
    backgroundColor: '#FFF5F8',
  },
  professionalImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  professionalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  professionalSpecialty: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  professionalExperience: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  professionalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  selectText: {
    fontSize: 12,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    minWidth: 90,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  // Date Selection Styles
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dateText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
    fontWeight: '500',
  },
  // Bottom Section Styles
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  priceAndButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceContainer: {
    flex: 1,
    marginRight: 15,
  },
  
  durationPrice: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  
  totalLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  priceSection: {
    marginBottom: 15,
  },
  priceRow: {
    marginBottom: 5,
  },
  durationPrice: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  buttonContainer: {
    gap: 10,
  },
   addToCartButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#FF6B9D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  addToCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIcon: {
    marginRight: 8,
  },
 cartIcon: {
    marginRight: 8,
  },
  
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  viewCartButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  
  viewCartButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  
  disabledButton: {
    opacity: 0.6,
  },
});

export default ServiceDetails;