import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const ProductCartScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [updatingItems, setUpdatingItems] = useState({});

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setCartItems(data.data.items || []);
        setTotalAmount(data.data.totalAmount || 0);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch cart items');
      }
    } catch (error) {
      console.error('Error fetching cart items:', error);
      Alert.alert('Error', 'Failed to fetch cart items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdatingItems(prev => ({ ...prev, [itemId]: true }));

    try {
      const response = await fetch(`${API_URL}/product-cart/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: newQuantity })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setCartItems(prev => 
          prev.map(item => 
            item._id === itemId 
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
        
        // Recalculate total
        const updatedTotal = cartItems.reduce((sum, item) => {
          const quantity = item._id === itemId ? newQuantity : item.quantity;
          return sum + (item.price * quantity);
        }, 0);
        setTotalAmount(updatedTotal);
      } else {
        Alert.alert('Error', data.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const removeItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/product-cart/${itemId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });

              if (response.ok) {
                setCartItems(prev => prev.filter(item => item._id !== itemId));
                // Recalculate total
                const updatedTotal = cartItems
                  .filter(item => item._id !== itemId)
                  .reduce((sum, item) => sum + (item.price * item.quantity), 0);
                setTotalAmount(updatedTotal);
                Alert.alert('Success', 'Item removed from cart');
              } else {
                Alert.alert('Error', 'Failed to remove item');
              }
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const clearCart = async () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/product-cart`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });

              if (response.ok) {
                setCartItems([]);
                setTotalAmount(0);
                Alert.alert('Success', 'Cart cleared successfully');
              } else {
                Alert.alert('Error', 'Failed to clear cart');
              }
            } catch (error) {
              console.error('Error clearing cart:', error);
              Alert.alert('Error', 'Failed to clear cart');
            }
          }
        }
      ]
    );
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }
    navigation.navigate('ProductCheckout', { 
      cartItems, 
      totalAmount 
    });
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image 
        source={{ 
          uri: item.product.primaryImage || 
               (item.product.images && item.product.images[0]?.url) || 
               'https://via.placeholder.com/100x100?text=No+Image'
        }} 
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        {item.product.brand && (
          <Text style={styles.itemBrand}>{item.product.brand}</Text>
        )}
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        
        {item.product.stock <= 5 && (
          <Text style={styles.lowStockWarning}>
            Only {item.product.stock} left in stock!
          </Text>
        )}
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item._id, item.quantity - 1)}
            disabled={item.quantity <= 1 || updatingItems[item._id]}
          >
            <Icon name="remove" size={16} color={item.quantity <= 1 ? "#ccc" : "#666"} />
          </TouchableOpacity>
          
          <View style={styles.quantityDisplay}>
            {updatingItems[item._id] ? (
              <ActivityIndicator size="small" color="#FF6B9D" />
            ) : (
              <Text style={styles.quantityText}>{item.quantity}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.quantityButton, item.quantity >= item.product.stock && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item._id, item.quantity + 1)}
            disabled={item.quantity >= item.product.stock || updatingItems[item._id]}
          >
            <Icon name="add" size={16} color={item.quantity >= item.product.stock ? "#ccc" : "#666"} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item._id)}
        >
          <Icon name="trash-outline" size={20} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bag-outline" size={80} color="#FF6B9D" />
      <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Add some products to get started
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

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.headerRight}>
          {cartItems.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {cartItems.length === 0 ? renderEmptyCart() : (
        <View style={styles.content}>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
          
          {/* Cart Summary */}
          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cartItems.length})</Text>
              <Text style={styles.summaryValue}>₹{totalAmount}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, styles.freeText]}>FREE</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={proceedToCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                Proceed to Checkout (₹{totalAmount})
              </Text>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
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
    width: 40,
    alignItems: 'flex-end',
  },
  clearAllText: {
    color: '#E74C3C',
    fontSize: 14,
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
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 200,
  },
  cartItem: {
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
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 4,
  },
  lowStockWarning: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    marginBottom: 10,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  quantityDisplay: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  removeButton: {
    padding: 8,
  },
  cartSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  freeText: {
    color: '#10B981',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  checkoutButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default ProductCartScreen;