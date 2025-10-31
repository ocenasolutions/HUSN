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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import Header  from '../../Components/Header';
import { API_URL } from '../../API/config';

const WishlistScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
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

  useEffect(() => {
    fetchWishlistItems();
  }, []);

  const removeFromWishlist = async (productId) => {
    Alert.alert(
      'Remove from Wishlist',
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/wishlist/${productId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });
              
              if (response.ok) {
                setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
                Alert.alert('Success', 'Item removed from wishlist');
              } else {
                Alert.alert('Error', 'Failed to remove item');
              }
            } catch (error) {
              console.error('Error removing from wishlist:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const moveToCart = async (item) => {
    try {
      const response = await fetch(`${API_URL}/wishlist/move-to-cart/${item.product._id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: 1 })
      });
      
      const data = await response.json();
      if (data.success) {
        setWishlistItems(prev => prev.filter(wishItem => wishItem.product._id !== item.product._id));
        Alert.alert('Success', 'Item moved to cart successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to move item to cart');
      }
    } catch (error) {
      console.error('Error moving to cart:', error);
      Alert.alert('Error', 'Failed to move item to cart');
    }
  };

  const renderWishlistItem = ({ item }) => (
    <View style={styles.wishlistItem}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('ProductDetail', { product: item.product })}
        style={styles.itemImageContainer}
      >
        <Image 
          source={{ 
            uri: item.product.primaryImage || 
                (item.product.images && item.product.images[0]?.url) || 
                'https://via.placeholder.com/100x100?text=No+Image'
          }} 
          style={styles.itemImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
      
      <View style={styles.itemContent}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ProductDetail', { product: item.product })}
          style={styles.itemTextContainer}
        >
          <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
          {item.product.brand && (
            <Text style={styles.itemBrand}>{item.product.brand}</Text>
          )}
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>₹{item.product.price}</Text>
            {item.product.originalPrice && item.product.originalPrice > item.product.price && (
              <Text style={styles.originalPrice}>₹{item.product.originalPrice}</Text>
            )}
          </View>
          <Text style={styles.itemCategory}>{item.product.category}</Text>
          
          {item.product.stock <= 5 && item.product.stock > 0 && (
            <Text style={styles.lowStockText}>Only {item.product.stock} left!</Text>
          )}
          {item.product.stock === 0 && (
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.moveToCartButton, item.product.stock === 0 && styles.disabledButton]}
          onPress={() => moveToCart(item)}
          disabled={item.product.stock === 0}
        >
          <Icon name="bag-outline" size={18} color={item.product.stock === 0 ? "#ccc" : "#fff"} />
          <Text style={[styles.moveToCartText, item.product.stock === 0 && styles.disabledButtonText]}>
            Add to Cart
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromWishlist(item.product._id)}
        >
          <Icon name="trash-outline" size={18} color="#fff" />
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
  listContainer: {
    padding: 20,
  },
  wishlistItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemImageContainer: {
    marginRight: 15,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
  },
  itemContent: {
    flex: 1,
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 22,
  },
  itemBrand: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  itemCategory: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  lowStockText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  outOfStockText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  itemActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 80,
  },
  moveToCartButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 75,
  },
  moveToCartText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  removeButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 75,
  },
  removeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
});

export default WishlistScreen;