import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const { width, height } = Dimensions.get('window');

const ProductDetails = ({ route, navigation }) => {
  const { product: initialProduct } = route.params;
  const { user, tokens } = useAuth();
  
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState(null);
  
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    ingredients: false,
    usage: false,
    reviews: false
  });

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchProductDetails();
    fetchReviews();
    if (user) {
      checkWishlistStatus();
      checkCartStatus();
    }
  }, []);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products/${product._id || product.id}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setProduct(data.data);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_URL}/reviews/product/${product._id || product.id}`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.data?.reviews || []);
        setReviewSummary(data.data?.summary || null);
      } else {
        setReviews([]);
        setReviewSummary(null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      setReviewSummary(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkCartStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        const inCart = data.data.items.some(item => 
          (item.product?._id || item.product?.id) === (product._id || product.id)
        );
        setIsInCart(inCart);
      }
    } catch (error) {
      console.error('Error checking cart status:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const checkWishlistStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        const wishlistIds = data.data.map(item => item.product._id);
        setIsInWishlist(wishlistIds.includes(product._id || product.id));
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to add items to wishlist',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
      return;
    }

    try {
      if (isInWishlist) {
        const response = await fetch(`${API_URL}/wishlist/${product._id || product.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setIsInWishlist(false);
          Toast.show({
            type: 'success',
            text1: 'Removed from Wishlist',
            text2: 'Item has been removed from your wishlist',
            position: 'bottom',
            visibilityTime: 2000,
            bottomOffset: 100,
          });
        }
      } else {
        const response = await fetch(`${API_URL}/wishlist/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ productId: product._id || product.id })
        });

        const data = await response.json();
        if (data.success) {
          setIsInWishlist(true);
          Toast.show({
            type: 'success',
            text1: '♥ Added to Wishlist!',
            text2: 'You can view it in your wishlist',
            position: 'bottom',
            visibilityTime: 2000,
            bottomOffset: 100,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: data.message || 'Failed to add to wishlist',
            position: 'top',
            visibilityTime: 3000,
            topOffset: 60,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update wishlist',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
    }
  };

  const addToCart = async () => {
    if (!user) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to add items to cart',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
      return;
    }

    if (product.stockStatus === 'out-of-stock') {
      Toast.show({
        type: 'error',
        text1: 'Out of Stock',
        text2: 'This product is currently out of stock',
        position: 'bottom',
        visibilityTime: 3000,
        bottomOffset: 100,
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/product-cart/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId: product._id || product.id,
          quantity: quantity
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsInCart(true);
        Toast.show({
          type: 'success',
          text1: '✓ Added to Cart!',
          text2: 'Product added successfully',
          position: 'bottom',
          visibilityTime: 2000,
          bottomOffset: 100,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to add to cart',
          position: 'top',
          visibilityTime: 3000,
          topOffset: 60,
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to cart. Please try again.',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
    }
  };

  const handleCartAction = () => {
    if (isInCart) {
      navigation.navigate('ProductCart');
    } else {
      addToCart();
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${product.name} - Rs.${product.price}`,
        title: product.name
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderStarRating = (rating, size = 14) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Icon
            key={i}
            name="star"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Icon
            key={i}
            name="star-half"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      } else {
        stars.push(
          <Icon
            key={i}
            name="star-outline"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      }
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getProductImages = () => {
    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
      } catch {
        return false;
      }
    };

    if (product.images && product.images.length > 0) {
      const validImages = product.images
        .filter(img => img.url && isValidUrl(img.url))
        .map(img => ({ url: img.url }));
      
      if (validImages.length > 0) {
        return validImages;
      }
    }
    
    if (product.primaryImage && isValidUrl(product.primaryImage)) {
      return [{ url: product.primaryImage }];
    }
    
    return [{ url: 'https://via.placeholder.com/400x400?text=No+Image' }];
  };

  const images = getProductImages();

  return (
    <SafeAreaView style={styles.container}>
      <Toast />
      
      <Header />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={toggleWishlist}
        >
          <Icon 
            name={isInWishlist ? "heart" : "heart-outline"} 
            size={24} 
            color={isInWishlist ? "#FF69B4" : "#000"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: images[selectedImageIndex]?.url }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.activeIndicator
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name || 'Radiant Glow Serum'}</Text>
          
          <View style={styles.ratingPriceRow}>
            <View style={styles.ratingContainer}>
              {reviewSummary && reviewSummary.total > 0 ? (
                <>
                  {renderStarRating(
                    Object.entries(reviewSummary.breakdown).reduce(
                      (acc, [rating, count]) => acc + (parseInt(rating) * count),
                      0
                    ) / reviewSummary.total,
                    16
                  )}
                  <Text style={styles.ratingText}>
                    {(Object.entries(reviewSummary.breakdown).reduce(
                      (acc, [rating, count]) => acc + (parseInt(rating) * count),
                      0
                    ) / reviewSummary.total).toFixed(1)} ({reviewSummary.total})
                  </Text>
                </>
              ) : (
                <>
                  {renderStarRating(0, 16)}
                  <Text style={styles.ratingText}>No reviews yet</Text>
                </>
              )}
            </View>
            <Text style={styles.price}>₹{product.price}</Text>
          </View>

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Qty</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                <Icon name="remove" size={18} color="#000" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Icon name="add" size={18} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.price}>Rs.{product.price || '299'}</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.descriptionText}>
                {product.description}
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Rating & Reviews</Text>
              {reviews.length > 3 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ReviewsScreen', {
                    itemId: product._id,
                    itemType: 'product',
                    itemName: product.name
                  })}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sectionContent}>
              {reviewsLoading ? (
                <ActivityIndicator size="small" color="#FF6B9D" />
              ) : reviewSummary && reviewSummary.total > 0 ? (
                <>
                  <View style={styles.overallRating}>
                    <Text style={styles.ratingNumber}>
                      {(Object.entries(reviewSummary.breakdown).reduce(
                        (acc, [rating, count]) => acc + (parseInt(rating) * count),
                        0
                      ) / reviewSummary.total).toFixed(1)}
                    </Text>
                    <View style={styles.ratingDetails}>
                      {renderStarRating(
                        Object.entries(reviewSummary.breakdown).reduce(
                          (acc, [rating, count]) => acc + (parseInt(rating) * count),
                          0
                        ) / reviewSummary.total,
                        18
                      )}
                      <Text style={styles.ratingCount}>
                        {reviewSummary.total} rating{reviewSummary.total !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ratingBreakdown}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewSummary.breakdown[star] || 0;
                      const percentage = reviewSummary.total > 0 
                        ? (count / reviewSummary.total) * 100 
                        : 0;
                      return (
                        <View key={star} style={styles.ratingRow}>
                          <Text style={styles.starLabel}>{star}</Text>
                          <View style={styles.ratingBarContainer}>
                            <View style={styles.ratingBar}>
                              <View style={[styles.ratingFill, { width: `${percentage}%` }]} />
                            </View>
                          </View>
                          <Text style={styles.ratingPercentage}>{Math.round(percentage)}%</Text>
                        </View>
                      );
                    })}
                  </View>

                  {reviews.slice(0, 3).map((review) => (
                    <View key={review._id} style={styles.reviewItem}>
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
                            <View style={styles.reviewerNameRow}>
                              <Text style={styles.reviewerName}>
                                {review.user?.name || 'Anonymous'}
                              </Text>
                              {review.isVerifiedPurchase && (
                                <View style={styles.verifiedBadge}>
                                  <Icon name="checkmark-circle" size={12} color="#2ECC71" />
                                  <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                              )}
                            </View>
                            {renderStarRating(review.rating, 12)}
                          </View>
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewText}>{review.comment}</Text>
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
                      <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noReviewsContainer}>
                  <Icon name="chatbubble-outline" size={48} color="#CCC" />
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                  <Text style={styles.noReviewsSubtext}>
                    Be the first to review this product!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.priceContainer}>
          <Text style={styles.bottomPrice}>₹{product.price * quantity || (299 * quantity)}</Text>
        </View>
        <TouchableOpacity 
          style={[
            isInCart ? styles.viewCartButton : styles.addToCartButton,
            product.stockStatus === 'out-of-stock' && styles.disabledButton
          ]}
          onPress={handleCartAction}
          disabled={product.stockStatus === 'out-of-stock'}
        >
          <Icon 
            name={isInCart ? "cart" : "cart-outline"} 
            size={20} 
            color="#FFFFFF" 
            style={styles.buttonIcon}
          />
          <Text style={styles.addToCartText}>
            {product.stockStatus === 'out-of-stock' 
              ? 'Out of Stock' 
              : isInCart 
              ? 'View Cart' 
              : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  wishlistButton: {
    padding: 8,
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
    color: '#666',
  },
  imageContainer: {
    height: height * 0.4,
    backgroundColor: '#F5F5F5',
    marginBottom: 20,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  ratingPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  quantityLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  sectionContent: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginRight: 16,
  },
  ratingDetails: {
    flex: 1,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingBreakdown: {
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starLabel: {
    fontSize: 14,
    color: '#000',
    width: 20,
    marginRight: 8,
  },
  ratingBarContainer: {
    flex: 1,
    marginRight: 8,
  },
  ratingBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  ratingFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingPercentage: {
    fontSize: 12,
    color: '#666',
    width: 35,
    textAlign: 'right',
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  addToCartButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 140,
  },
  viewCartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 140,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2ECC71',
    marginLeft: 4,
  },
  reviewMediaContainer: {
    marginTop: 12,
    marginBottom: 8,
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
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProductDetails;