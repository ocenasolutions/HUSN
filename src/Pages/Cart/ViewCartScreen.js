// src/Pages/Cart/ViewCartScreen.js
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
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';

const ViewCartScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [serviceItems, setServiceItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchAllCartItems();
  }, []);

  const fetchAllCartItems = async () => {
    try {
      setLoading(true);
      
      // Fetch both service and product cart items concurrently
      const [servicesResponse, productsResponse] = await Promise.all([
        fetch(`${API_URL}/cart`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/product-cart`, {
          headers: getAuthHeaders(),
        })
      ]);

      const servicesData = await servicesResponse.json();
      const productsData = await productsResponse.json();

      if (servicesData.success) {
        setServiceItems(servicesData.data.items || []);
      } else {
        console.error('Services cart error:', servicesData.message);
      }

      if (productsData.success) {
        setProductItems(productsData.data.items || []);
      } else {
        console.error('Products cart error:', productsData.message);
      }
    } catch (error) {
      console.error('Fetch cart items error:', error);
      Alert.alert('Error', 'Something went wrong while fetching cart items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllCartItems();
  };

  const updateProductQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setUpdating(itemId);

      const response = await fetch(`${API_URL}/product-cart/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();

      if (data.success) {
        setProductItems(prevItems =>
          prevItems.map(item =>
            item._id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const updateServiceQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setUpdating(itemId);

      const response = await fetch(`${API_URL}/cart/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();

      if (data.success) {
        setServiceItems(prevItems =>
          prevItems.map(item =>
            item._id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const removeProductItem = async (itemId) => {
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
                headers: getAuthHeaders(),
              });

              if (response.ok) {
                setProductItems(prevItems => 
                  prevItems.filter(item => item._id !== itemId)
                );
              } else {
                Alert.alert('Error', 'Failed to remove item');
              }
            } catch (error) {
              console.error('Remove item error:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const removeServiceItem = async (itemId) => {
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
              const response = await fetch(`${API_URL}/cart/${itemId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
              });

              const data = await response.json();

              if (data.success) {
                setServiceItems(prevItems => 
                  prevItems.filter(item => item._id !== itemId)
                );
              } else {
                Alert.alert('Error', data.message || 'Failed to remove item');
              }
            } catch (error) {
              console.error('Remove item error:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculateProductsTotal = () => {
    return productItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateServicesTotal = () => {
    return serviceItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const renderProductItem = (item) => (
    <View key={item._id} style={styles.cartItem}>
      <Image
        source={{ 
          uri: item.product.primaryImage || 
               (item.product.images && item.product.images[0]?.url) || 
               'https://via.placeholder.com/60x60?text=No+Image'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateProductQuantity(item._id, item.quantity - 1)}
            disabled={updating === item._id || item.quantity <= 1}
          >
            <Icon name="remove" size={16} color="#FF1493" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateProductQuantity(item._id, item.quantity + 1)}
            disabled={updating === item._id}
          >
            <Icon name="add" size={16} color="#FF1493" />
          </TouchableOpacity>
        </View>
      </View>

      {updating === item._id && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color="#FF1493" />
        </View>
      )}
    </View>
  );

  const renderServiceItem = (item) => (
    <View key={item._id} style={styles.cartItem}>
      <Image
        source={{ uri: item.service.image_url || 'https://via.placeholder.com/60x60' }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.service.name}</Text>
        <Text style={styles.itemQuantity}>Date: {formatDate(item.selectedDate)}, Time: {item.selectedTime}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateServiceQuantity(item._id, item.quantity - 1)}
            disabled={updating === item._id || item.quantity <= 1}
          >
            <Icon name="remove" size={16} color="#FF1493" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateServiceQuantity(item._id, item.quantity + 1)}
            disabled={updating === item._id}
          >
            <Icon name="add" size={16} color="#FF1493" />
          </TouchableOpacity>
        </View>
      </View>

      {updating === item._id && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color="#FF1493" />
        </View>
      )}
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
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = productItems.length + serviceItems.length;
  const productsTotal = calculateProductsTotal();
  const servicesTotal = calculateServicesTotal();
  const grandTotal = productsTotal + servicesTotal;

  if (totalItems === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <Icon name="cart-outline" size={80} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse our services and products to add them to your cart
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.browseButtonText}>Browse Services</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Products Section */}
        {productItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products</Text>
            {productItems.map(renderProductItem)}
          </View>
        )}

        {/* Services Section */}
        {serviceItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            {serviceItems.map(renderServiceItem)}
          </View>
        )}

        {/* Summary Section */}
        <View style={styles.summarySection}>
          {productItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal (Products)</Text>
              <Text style={styles.summaryValue}>₹{productsTotal}</Text>
            </View>
          )}
          
          {serviceItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal (Services)</Text>
              <Text style={styles.summaryValue}>₹{servicesTotal}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Navigation */}

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  updatingOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summarySection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  spacer: {
    height: 140,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  checkoutButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
export default ViewCartScreen;