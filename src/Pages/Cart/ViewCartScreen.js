// src/Pages/Cart/ViewCartScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';

const ViewCartScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [serviceItems, setServiceItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState({});

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchAllCartItems = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Fetch both service and product cart items concurrently
      const [servicesResponse, productsResponse] = await Promise.all([
        fetch(`${API_URL}/cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/product-cart`, { headers: getAuthHeaders() })
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
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAllCartItems();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllCartItems(false);
  };

  const updateProductQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeProductItem(itemId);
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [itemId]: true }));

      const response = await fetch(`${API_URL}/product-cart/${itemId}`, {
        method: 'PATCH',
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
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const updateServiceQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeServiceItem(itemId);
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [itemId]: true }));

      const response = await fetch(`${API_URL}/cart/${itemId}`, {
        method: 'PATCH',
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
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const removeProductItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this product from your cart?',
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

              const data = await response.json();
              if (data.success) {
                setProductItems(prevItems => 
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

  const removeServiceItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this service from your cart?',
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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
          uri: item.product?.primaryImage || 
              (item.product?.images && item.product?.images[0]?.url) || 
              'https://via.placeholder.com/80x80'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        {item.product?.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.product.description}
          </Text>
        )}
      </View>
      
      <View style={styles.quantityControls}>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateProductQuantity(item._id, item.quantity - 1)}
            disabled={updating[item._id]}
          >
            <Icon name="remove" size={18} color="#FF1493" />
          </TouchableOpacity>
          
          {updating[item._id] ? (
            <ActivityIndicator size="small" color="#FF1493" style={styles.quantityLoader} />
          ) : (
            <Text style={styles.quantityText}>{item.quantity}</Text>
          )}
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateProductQuantity(item._id, item.quantity + 1)}
            disabled={updating[item._id]}
          >
            <Icon name="add" size={18} color="#FF1493" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderServiceItem = (item) => (
    <View key={item._id} style={styles.cartItem}>
      <Image
        source={{ 
          uri: item.service?.image_url || 'https://via.placeholder.com/80x80'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.service?.name || 'Service'}</Text>
        <Text style={styles.professionalName}>by {item.professionalName}</Text>
        <View style={styles.scheduleInfo}>
          <Icon name="calendar-outline" size={14} color="#7F8C8D" />
          <Text style={styles.scheduleText}>
            {formatDate(item.selectedDate)} at {item.selectedTime}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>Note: {item.notes}</Text>
        )}
        <Text style={styles.itemPrice}>₹{item.price}</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateServiceQuantity(item._id, item.quantity - 1)}
            disabled={updating[item._id]}
          >
            <Icon name="remove" size={18} color="#FF1493" />
          </TouchableOpacity>
          
          {updating[item._id] ? (
            <ActivityIndicator size="small" color="#FF1493" style={styles.quantityLoader} />
          ) : (
            <Text style={styles.quantityText}>{item.quantity}</Text>
          )}
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateServiceQuantity(item._id, item.quantity + 1)}
            disabled={updating[item._id]}
          >
            <Icon name="add" size={18} color="#FF1493" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Icon name="cart-outline" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>
        Browse our services and products to add them to your cart
      </Text>
      <View style={styles.emptyButtons}>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Services')}
>
          <Text style={styles.browseButtonText}>Browse Services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.browseButton, styles.browseButtonSecondary]}
          onPress={() => navigation.navigate('Product')}
>
          <Text style={styles.browseButtonTextSecondary}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = productItems.length + serviceItems.length;

  if (totalItems === 0) {
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
          contentContainerStyle={styles.emptyScrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderEmptyCart()}
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
        {/* Services Section */}
        {serviceItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="cut-outline" size={20} color="#FF1493" />
              <Text style={styles.sectionTitle}>Services ({serviceItems.length})</Text>
            </View>
            
            {serviceItems.map(renderServiceItem)}
            
            <View style={styles.sectionFooter}>
              <View style={styles.sectionTotal}>
                <Text style={styles.totalLabel}>Services Total</Text>
                <Text style={styles.totalAmount}>₹{calculateServicesTotal()}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => navigation.navigate('Checkout')}
              >
                <Icon name="arrow-forward" size={16} color="#fff" />
                <Text style={styles.checkoutButtonText}>Checkout Services</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Products Section */}
        {productItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="cube-outline" size={20} color="#FF1493" />
              <Text style={styles.sectionTitle}>Products ({productItems.length})</Text>
            </View>
            
            {productItems.map(renderProductItem)}
            
            <View style={styles.sectionFooter}>
              <View style={styles.sectionTotal}>
                <Text style={styles.totalLabel}>Products Total</Text>
                <Text style={styles.totalAmount}>₹{calculateProductsTotal()}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => navigation.navigate('Checkout')}
              >
                <Icon name="arrow-forward" size={16} color="#fff" />
                <Text style={styles.checkoutButtonText}>Checkout Products</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  emptyScrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
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
  emptyButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  browseButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  browseButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButtonTextSecondary: {
    color: '#FF1493',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 12,
    color: '#FF1493',
    marginBottom: 4,
    fontWeight: '500',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  notes: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
    marginTop: 4,
  },
  quantityControls: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  quantityLoader: {
    marginHorizontal: 16,
  },
  sectionFooter: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  sectionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF1493',
  },
  checkoutButton: {
    backgroundColor: '#FF1493',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default ViewCartScreen;