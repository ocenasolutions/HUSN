import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';
import mockProductData from './mockData.js';

const { width, height } = Dimensions.get('window');

const ProductDetails = ({ route, navigation }) => {
  const { product: initialProduct } = route.params;
  const { user, tokens } = useAuth();
  
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
    if (user) {
      checkWishlistStatus();
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
      Alert.alert('Login Required', 'Please login to add items to wishlist');
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
          Alert.alert('Success', 'Removed from wishlist');
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
          Alert.alert('Success', 'Added to wishlist!');
        } else {
          Alert.alert('Error', data.message || 'Failed to add to wishlist');
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const addToCart = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    if (product.stockStatus === 'out-of-stock') {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
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
        Alert.alert('Success', 'Product added to cart!', [
          {
            text: 'Continue Shopping',
            style: 'cancel'
          },
          {
            text: 'View Cart',
            onPress: () => navigation.navigate('ProductCart')
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
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
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? "star" : i - rating < 1 ? "star-half" : "star-outline"}
          size={size}
          color="#FFD700"
          style={{ marginRight: 1 }}
        />
      );
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

  // FIXED: Improved image handling logic
  const getProductImages = () => {
    // Function to check if a URL is valid
    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
      } catch {
        return false;
      }
    };

    // First check if product has images array with valid URLs
    if (product.images && product.images.length > 0) {
      const validImages = product.images
        .filter(img => img.url && isValidUrl(img.url))
        .map(img => ({ url: img.url }));
      
      if (validImages.length > 0) {
        return validImages;
      }
    }
    
    // Fallback to primaryImage if it's valid
    if (product.primaryImage && isValidUrl(product.primaryImage)) {
      return [{ url: product.primaryImage }];
    }
    
    // Final fallback
    return [{ url: 'https://via.placeholder.com/400x400?text=No+Image' }];
  };

  const images = getProductImages();
  
  // Debug logging - remove in production
  console.log('Product data:', product);
  console.log('Images array:', images);
  console.log('Selected image:', images[selectedImageIndex]);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      {/* Navigation Header */}
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
        {/* Product Image with Error Handling */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: images[selectedImageIndex]?.url }}
            style={styles.productImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image loading error:', error);
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', images[selectedImageIndex]?.url);
            }}
          />
          {/* Image indicator dots if multiple images */}
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

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name || 'Radiant Glow Serum'}</Text>
          
          <View style={styles.ratingPriceRow}>
            <View style={styles.ratingContainer}>
              {renderStarRating(mockProductData.ratings.average, 16)}
              <Text style={styles.ratingText}>
                {mockProductData.ratings.average} ({mockProductData.ratings.total})
              </Text>
            </View>
            <Text style={styles.price}>Rs.{product.price || '299'}</Text>
          </View>

          {/* Quantity Selector */}
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

          {/* Description Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.descriptionText}>
                {product.description || "Get radiant, glowing skin with this premium serum. Formulated with natural ingredients for all skin types. This lightweight formula absorbs quickly and provides long-lasting hydration while improving skin texture and appearance."}
              </Text>
              
              <Text style={styles.benefitsTitle}>Key Benefits:</Text>
              {mockProductData.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.benefitRow}>
                  <Text style={styles.bulletPoint}>• </Text>
                  <Text style={styles.benefitText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.ingredientsText}>
                {mockProductData.ingredients.join(', ')}
              </Text>
            </View>
          </View>

          {/* How to Use Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>How to use</Text>
            <View style={styles.sectionContent}>
              {mockProductData.usageInstructions.map((instruction, index) => (
                <View key={index} style={styles.instructionRow}>
                  <Text style={styles.stepNumber}>{index + 1}. </Text>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rating & Reviews Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Rating & reviews</Text>
            <View style={styles.sectionContent}>
              <View style={styles.overallRating}>
                <Text style={styles.ratingNumber}>{mockProductData.ratings.average}</Text>
                <View style={styles.ratingDetails}>
                  {renderStarRating(mockProductData.ratings.average, 18)}
                  <Text style={styles.ratingCount}>
                    {mockProductData.ratings.total} ratings
                  </Text>
                </View>
              </View>

              {/* Rating Breakdown */}
              <View style={styles.ratingBreakdown}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = mockProductData.ratings.breakdown[star];
                  const percentage = (count / mockProductData.ratings.total) * 100;
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

              {/* Individual Reviews */}
              {mockProductData.reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.user}</Text>
                    {renderStarRating(review.rating, 12)}
                  </View>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Add to Cart Button */}
<View style={styles.bottomContainer}>
  <View style={styles.priceContainer}>
    <Text style={styles.bottomPrice}>₹{product.price * quantity || (299 * quantity)}</Text>
  </View>
  <TouchableOpacity 
    style={[
      styles.addToCartButton,
      product.stockStatus === 'out-of-stock' && { backgroundColor: '#CCCCCC' }
    ]}
    onPress={addToCart}
    disabled={product.stockStatus === 'out-of-stock'}
  >
    <Text style={styles.addToCartText}>
      {product.stockStatus === 'out-of-stock' ? 'Out of Stock' : 'Add to Cart'}
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

  // Image Section
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
  // Added image indicators for multiple images
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

  // Product Info
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

  // Quantity Row
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

  // Sections
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

  // Description
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#000',
    marginRight: 4,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  // Ingredients
  ingredientsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Usage Instructions
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    marginRight: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  // Reviews
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

  // Rating Breakdown
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

  // Individual Reviews
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

  // Bottom Container
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
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 25,
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 140,
},
addToCartText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
},
});

export default ProductDetails;