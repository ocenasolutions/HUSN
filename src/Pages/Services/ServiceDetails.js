import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext'; 

const ServiceDetails = ({ navigation, route }) => {
  const { service } = route.params;
  const { user, tokens } = useAuth(); 
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);  
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('all');

  useEffect(() => {
    checkIfInCart();
    fetchReviews();
  }, []);

  const checkIfInCart = async () => {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const inCart = data.data.items.some(item => item.service?._id === service._id);
        setIsInCart(inCart);
      }
    } catch (error) {
      console.error('Check cart error:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_URL}/reviews/service/${service._id}`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.data?.reviews || []);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!tokens?.accessToken) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }
    try {
      setLoading(true);
      const cartData = {
        serviceId: service._id,
        quantity,
        price: service.price
      };

      const response = await fetch(`${API_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify(cartData),
      });
      const data = await response.json();
      if (data.success) {
        setIsInCart(true);
        Alert.alert(
          '✓ Added to Cart!', 
          `${service.name} has been added to your cart. You can schedule time and select professional during checkout.`,
          [
            {
              text: 'Continue Shopping',
              onPress: () => navigation.goBack()
            },
            {
              text: 'View Cart',
              onPress: () => navigation.navigate('ViewCart')
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCart = () => {
    navigation.navigate('ViewCart');
  };
  const totalPrice = service.price * quantity;

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

  const getFilteredReviews = () => {
    if (selectedRatingFilter === 'all') {
      return reviews;
    }
    return reviews.filter(review => review.rating === parseInt(selectedRatingFilter));
  };

  const getDisplayedReviews = () => {
    const filtered = getFilteredReviews();
    return showAllReviews ? filtered : filtered.slice(0, 3);
  };

  const getReviewCountByRating = (rating) => {
    return reviews.filter(review => review.rating === rating).length;
  };

  const filteredReviews = getFilteredReviews();
  const displayedReviews = getDisplayedReviews();

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
      </View>
      
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Image 
            source={{ uri: service.image_url || 'https://via.placeholder.com/400x300' }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
          <View style={styles.contentContainer}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              {service.rating && service.rating > 0 && (
                <View style={styles.ratingRow}>
                  <View style={styles.starsContainer}>
                    {renderStars(service.rating)}
                  </View>
                  <Text style={styles.ratingText}>
                    {service.rating.toFixed(1)} ({service.reviewCount || 0} {service.reviewCount === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>
              )}
              <View style={styles.durationContainer}>
                <Icon name="time-outline" size={18} color="#FF6B9D" />
                <Text style={styles.durationText}>{service.duration || 60} minutes</Text>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.priceValue}>₹{service.price}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Icon name="information-circle-outline" size={20} color="#FF6B9D" />
              <Text style={styles.infoText}>
                Select your preferred time slot and professional during checkout
              </Text>
            </View>
            {/* REVIEWS SECTION WITH FILTER */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Customer Reviews ({reviews.length})
              </Text>
              
              {/* RATING FILTER */}
              {reviews.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      selectedRatingFilter === 'all' && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedRatingFilter('all')}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedRatingFilter === 'all' && styles.filterChipTextActive
                    ]}>
                      All ({reviews.length})
                    </Text>
                  </TouchableOpacity>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = getReviewCountByRating(rating);
                    if (count === 0) return null;
                    
                    return (
                      <TouchableOpacity
                        key={rating}
                        style={[
                          styles.filterChip,
                          selectedRatingFilter === rating.toString() && styles.filterChipActive
                        ]}
                        onPress={() => setSelectedRatingFilter(rating.toString())}
                      >
                        <Icon name="star" size={14} color={selectedRatingFilter === rating.toString() ? "#FFF" : "#FFD700"} />
                        <Text style={[
                          styles.filterChipText,
                          selectedRatingFilter === rating.toString() && styles.filterChipTextActive
                        ]}>
                          {rating} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              {reviewsLoading ? (
                <ActivityIndicator size="small" color="#FF6B9D" style={{ marginTop: 20 }} />
              ) : displayedReviews.length > 0 ? (
                <>
                  {displayedReviews.map((review, index) => (
                    <View key={review._id || index} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          {review.user?.profilePicture ? (
                            <Image
                              source={{ uri: review.user.profilePicture }}
                              style={styles.reviewerAvatar}
                            />
                          ) : (
                            <View style={styles.reviewerAvatarPlaceholder}>
                              <Text style={styles.avatarText}>
                                {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.reviewerDetails}>
                            <Text style={styles.reviewerName}>
                              {review.user?.name || 'Anonymous'}
                            </Text>
                            <View style={styles.reviewStars}>
                              {renderStars(review.rating)}
                            </View>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment} numberOfLines={showAllReviews ? undefined : 3}>
                          {review.comment}
                        </Text>
                      )}
                      {review.isVerifiedPurchase && (
                        <View style={styles.verifiedBadge}>
                          <Icon name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.verifiedText}>Verified Purchase</Text>
                        </View>
                      )}
                      
                      {review.media && review.media.length > 0 && (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          style={styles.reviewMediaContainer}
                        >
                          {review.media.map((media, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: media.url }}
                              style={styles.reviewMediaImage}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ))}

                  {/* LOAD MORE BUTTON */}
                  {filteredReviews.length > 3 && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton}
                      onPress={() => setShowAllReviews(!showAllReviews)}
                    >
                      <Text style={styles.loadMoreText}>
                        {showAllReviews ? 'Show Less' : `Load More (${filteredReviews.length - 3} more)`}
                      </Text>
                      <Icon 
                        name={showAllReviews ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color="#FF6B9D" 
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.noReviewsContainer}>
                  <Icon name="chatbubble-outline" size={32} color="#CCC" />
                  <Text style={styles.noReviewsText}>
                    {selectedRatingFilter === 'all' ? 'No reviews yet' : `No ${selectedRatingFilter}-star reviews`}
                  </Text>
                  <Text style={styles.noReviewsSubtext}>
                    {selectedRatingFilter === 'all' ? 'Be the first to review this service' : 'Try selecting a different rating filter'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Professional service at your doorstep</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Flexible time slot selection</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Choose your preferred professional</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Premium quality products</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <View style={styles.priceAndButtonRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.durationPrice}>
                ₹{service.price}, {service.duration || 60} min
              </Text>
              <Text style={styles.totalLabel}>₹{totalPrice}</Text>
            </View>
            
            <TouchableOpacity
              style={[
                isInCart ? styles.viewCartButton : styles.addToCartButton,
                loading && styles.disabledButton
              ]}
              onPress={isInCart ? handleViewCart : handleAddToCart}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon 
                    name={isInCart ? "cart" : "cart-outline"} 
                    size={18} 
                    color="#fff" 
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>
                    {isInCart ? 'View Cart' : 'Add to Cart'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  serviceImage: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 20,
  },
  serviceInfo: {
    marginBottom: 20,
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
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceLabel: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE5EF',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 10,
  },
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  priceAndButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addToCartButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 140,
    justifyContent: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewCartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 140,
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  reviewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  reviewerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  reviewComment: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewMediaContainer: {
    marginTop: 12,
  },
  reviewMediaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  // NEW STYLES FOR FILTER AND LOAD MORE
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#FF6B9D',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF5F8',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE5EF',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B9D',
    marginRight: 6,
  },
});

export default ServiceDetails;