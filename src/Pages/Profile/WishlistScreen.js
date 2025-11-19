import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import Header  from '../../Components/Header';
import { API_URL } from '../../API/config';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2; 

const WishlistScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useState(new Animated.Value(0))[0];
  const [notificationRequests, setNotificationRequests] = useState(new Set());

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      console.log('Wishlist response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        setWishlistItems(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load wishlist items');
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      Alert.alert('Error', 'Failed to load wishlist items');
    } finally {
      setLoading(false);
    }
  };

const fetchNotificationRequests = async () => {
  try {
    const response = await fetch(`${API_URL}/stock-notifications/my-requests`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    
    if (data.success) {
      const requestedProductIds = new Set(
        data.data.map(req => req.product._id || req.product)
      );
      setNotificationRequests(requestedProductIds);
    }
  } catch (error) {
    console.error('Error fetching notification requests:', error);
  }
};

// Update useEffect to also fetch notification requests:
useEffect(() => {
  fetchWishlistItems();
  fetchNotificationRequests();
}, []);

const handleNotifyMe = async (item) => {
  const productId = item.product?._id || item.product?.id;
  
  if (!productId) {
    Alert.alert('Error', 'Invalid product information');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/stock-notifications/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId })
    });

    const data = await response.json();
    
    if (data.success) {
      setNotificationRequests(prev => new Set([...prev, productId]));
      showToast('You will be notified when this item is back in stock!');
    } else {
      Alert.alert('Error', data.message || 'Failed to set notification');
    }
  } catch (error) {
    console.error('Error setting notification:', error);
    Alert.alert('Error', 'Failed to set notification. Please try again.');
  }
};

  const removeFromWishlist = async (item) => {
    try {
      const productId = item.product?.id || item.product?._id;
      
      if (!productId) {
        console.error('No valid product ID found');
        Alert.alert('Error', 'Invalid product information');
        return;
      }
      
      console.log('Removing product with ID:', productId);
      
      const previousItems = [...wishlistItems];
      setWishlistItems(prev => prev.filter(wishItem => 
        (wishItem.product?.id || wishItem.product?._id) !== productId
      ));
      
      const url = `${API_URL}/wishlist/${productId}`;
      console.log('DELETE URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        setWishlistItems(previousItems);
        Alert.alert('Error', data.message || 'Failed to remove item from wishlist');
        console.error('Remove failed:', data);
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      fetchWishlistItems();
      Alert.alert('Error', 'Failed to remove item from wishlist. Please try again.');
    }
  };

  const moveToCart = async (item) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    const productId = item.product?._id || item.product?.id;
    
    if (!productId) {
      Alert.alert('Error', 'Invalid product information');
      return;
    }

    // Check stock status
    if (item.product?.stock === 0 || item.product?.stockStatus === 'out-of-stock') {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    try {
      setAddingToCart(productId);

      // Add to cart using the same API as ProductDetails screen
      const response = await fetch(`${API_URL}/product-cart/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId: productId,
          quantity: 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove from wishlist after successfully adding to cart
        setWishlistItems(prev => prev.filter(wishItem => 
          (wishItem.product?._id || wishItem.product?.id) !== productId
        ));
        
        showToast('Added to Cart');
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

 const renderWishlistItem = ({ item }) => {
  const productId = item.product?._id || item.product?.id;
  const isAddingThisItem = addingToCart === productId;
  const isOutOfStock = item.product?.stock === 0 || item.product?.stockStatus === 'out-of-stock';
  const hasNotificationRequest = notificationRequests.has(productId);
  
  return (
    <View style={styles.gridItem}>
      <TouchableOpacity 
        style={styles.heartButton}
        onPress={() => removeFromWishlist(item)} 
      >
        <Icon name="heart" size={24} color="#FF6B9D" />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => navigation.navigate('ProductDetail', { product: item.product })}
        style={styles.itemContainer}
      >
        <Image 
          source={{ 
            uri: item.product?.primaryImage || 
                (item.product?.images && item.product.images[0]?.url) || 
                'https://via.placeholder.com/150x150?text=No+Image'
          }} 
          style={[styles.itemImage, isOutOfStock && styles.outOfStockImage]}
          resizeMode="cover"
        />
        
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockBadgeText}>Out of Stock</Text>
          </View>
        )}
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.product?.name || 'Unknown Product'}
          </Text>
          
          {item.product?.brand && (
            <Text style={styles.itemBrand} numberOfLines={1}>{item.product.brand}</Text>
          )}
          
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>₹{item.product?.price || 0}</Text>
            {item.product?.originalPrice && item.product.originalPrice > item.product.price && (
              <Text style={styles.originalPrice}>₹{item.product.originalPrice}</Text>
            )}
          </View>

          {!isOutOfStock && item.product?.stock <= 5 && item.product?.stock > 0 && (
            <Text style={styles.lowStockText}>Only {item.product.stock} left!</Text>
          )}
        </View>
      </TouchableOpacity>

      {isOutOfStock ? (
        <TouchableOpacity
          style={[
            styles.notifyButton,
            hasNotificationRequest && styles.notifyButtonActive
          ]}
          onPress={() => handleNotifyMe(item)}
          disabled={hasNotificationRequest}
        >
          <Icon 
            name={hasNotificationRequest ? "notifications" : "notifications-outline"}
            size={16} 
            color={hasNotificationRequest ? "#4CAF50" : "#FF6B9D"} 
          />
          <Text style={[
            styles.notifyButtonText,
            hasNotificationRequest && styles.notifyButtonTextActive
          ]}>
            {hasNotificationRequest ? 'Will Notify You' : 'Notify Me'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.addToCartButton, 
            isAddingThisItem && styles.disabledButton
          ]}
          onPress={() => moveToCart(item)}
          disabled={isAddingThisItem}
        >
          {isAddingThisItem ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="bag-outline" size={16} color="#fff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};


  const renderEmptyWishlist = () => (
    <View style={styles.emptyContainer}>
      <Icon name="heart-outline" size={80} color="#FF6B9D" />
      <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Start adding items to your wishlist to see them here
      </Text>
      <TouchableOpacity
        style={styles.shopNowButton}
        onPress={() => navigation.navigate('Product')}
      >
        <Text style={styles.shopNowText}>Shop Now</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header/>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header/>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >        
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={styles.headerRight}>
          <Text style={styles.itemCount}>{wishlistItems.length} items</Text>
        </View>   
      </View>

      {wishlistItems.length === 0 ? renderEmptyWishlist() : (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}

      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerRight: {
    alignItems: 'flex-end',
    width: 60,
  },
  itemCount: {
    fontSize: 12,
    color: '#FF6B9D',
    fontWeight: '600',
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
  gridContainer: {
    padding: 15,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  itemContainer: {
    width: '100%',
  },
  itemImage: {
    width: '100%',
    height: ITEM_WIDTH,
    backgroundColor: '#F8F8F8',
  },
  itemDetails: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 18,
    minHeight: 36,
  },
  itemBrand: {
    fontSize: 11,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  lowStockText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  outOfStockText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  shopNowButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#2ECC71',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
   outOfStockImage: {
    opacity: 0.5,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notifyButton: {
    backgroundColor: '#FFF5F8',
    borderWidth: 1.5,
    borderColor: '#FF6B9D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  notifyButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  notifyButtonText: {
    color: '#FF6B9D',
    fontSize: 12,
    fontWeight: '600',
  },
  notifyButtonTextActive: {
    color: '#4CAF50',
  },
});

export default WishlistScreen;