// src/Pages/Booking/CheckoutScreen.js - Fixed address mapping issue
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
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';

const CheckoutScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [serviceItems, setServiceItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Address and Payment States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  
  // New Address Form
  const [newAddress, setNewAddress] = useState({
    type: 'Home',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false
  });

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      
      // Fetch cart items and saved addresses
      const [servicesResponse, productsResponse, addressesResponse] = await Promise.all([
        fetch(`${API_URL}/cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/product-cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/addresses`, { headers: getAuthHeaders() })
      ]);

      const servicesData = await servicesResponse.json();
      const productsData = await productsResponse.json();
      const addressesData = await addressesResponse.json();

      if (servicesData.success) {
        setServiceItems(servicesData.data.items || []);
      }

      if (productsData.success) {
        const items = productsData.data.items || [];
        console.log('Product cart items received:', items);
        setProductItems(items);
      }

      if (addressesData.success) {
        setSavedAddresses(addressesData.data || []);
        // Set default address if available
        const defaultAddress = addressesData.data?.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
    } catch (error) {
      console.error('Fetch checkout data error:', error);
      Alert.alert('Error', 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const productsSubtotal = productItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const servicesSubtotal = serviceItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const subtotal = productsSubtotal + servicesSubtotal;
    const deliveryFee = productItems.length > 0 ? 50 : 0; // Only for products
    const serviceFee = serviceItems.length > 0 ? 25 : 0; // Service fee
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + deliveryFee + serviceFee + tax;

    return { subtotal, deliveryFee, serviceFee, tax, total };
  };

  const handleAddNewAddress = async () => {
    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      Alert.alert('Error', 'Please fill in all address fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/addresses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newAddress),
      });

      const data = await response.json();

      if (data.success) {
        const updatedAddresses = [...savedAddresses, data.data];
        setSavedAddresses(updatedAddresses);
        setSelectedAddress(data.data);
        setNewAddress({
          type: 'Home',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          isDefault: false
        });
        setShowAddressModal(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to add address');
      }
    } catch (error) {
      console.error('Add address error:', error);
      Alert.alert('Error', 'Failed to add address');
    }
  };

const handlePlaceOrder = async () => {
  if (!selectedAddress) {
    Alert.alert('Error', 'Please select a delivery address');
    return;
  }

  if (serviceItems.length === 0 && productItems.length === 0) {
    Alert.alert('Error', 'Your cart is empty');
    return;
  }

  try {
    setSubmitting(true);
    const { total } = calculateTotals();

    // Debug logging
    console.log('Product items before mapping:', productItems);
    
    // Prepare product items with proper validation
    const mappedProductItems = productItems.map(item => {
      console.log('Processing product item:', item);
      
      // Handle different possible structures
      let productId;
      if (item.product && item.product.id) {
        productId = item.product.id;
      } else if (item.product && item.product._id) {
        productId = item.product._id;
      } else if (item.product && typeof item.product === 'string') {
        productId = item.product;
      } else if (item.productId) {
        productId = item.productId;
      } else {
        console.error('No valid product ID found in item:', item);
        throw new Error(`Product ID missing for item: ${JSON.stringify(item)}`);
      }

      console.log('Extracted product ID:', productId);

      return {
        productId: productId,
        quantity: item.quantity || 1,
        price: item.price || 0
      };
    });

    console.log('Mapped product items:', mappedProductItems);

    // Prepare service items
    const mappedServiceItems = serviceItems.map(item => ({
      serviceId: item.service?._id || item.serviceId,
      quantity: item.quantity || 1,
      price: item.price || 0,
      selectedDate: item.selectedDate,
      selectedTime: item.selectedTime
    }));

    // FIXED: Map address fields correctly for the Order model
    const mappedAddress = {
      type: selectedAddress.addressType || selectedAddress.type || 'Home',
      street: selectedAddress.address || selectedAddress.street || '',
      city: selectedAddress.city || '',
      state: selectedAddress.state || '',
      zipCode: selectedAddress.pincode || selectedAddress.zipCode || ''
    };

    console.log('Original address:', selectedAddress);
    console.log('Mapped address:', mappedAddress);

    // Create order data
    const orderData = {
      address: mappedAddress, // Use mapped address instead of raw selectedAddress
      paymentMethod: selectedPaymentMethod,
      serviceItems: mappedServiceItems,
      productItems: mappedProductItems,
      totalAmount: total,
      type: productItems.length > 0 ? 'product' : 'service',
      status: 'placed'
    };

    console.log('Sending order data:', orderData);

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    console.log('Order response:', data);

    if (data.success) {
      // Clear cart after successful order
      await Promise.all([
        fetch(`${API_URL}/cart/clear`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/product-cart/clear`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
      ]);

      navigation.navigate('OrderConfirmation', {
        orderData: {
          ...data.data,
          orderNumber: data.data.orderNumber || `ORD${Date.now()}`,
          totalAmount: total,
          type: productItems.length > 0 ? 'product' : 'service',
          status: 'placed',
          createdAt: new Date().toISOString(),
          trackingId: data.data.trackingId || `TRK${Date.now()}`,
          courier: data.data.courier || 'FedEx',
          estimatedDelivery: data.data.estimatedDelivery || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }
      });
    } else {
      console.error('Order creation failed:', data);
      Alert.alert('Error', data.message || 'Failed to place order');
    }
  } catch (error) {
    console.error('Place order error:', error);
    Alert.alert('Error', error.message || 'Failed to place order');
  } finally {
    setSubmitting(false);
  }
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

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
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { subtotal, deliveryFee, serviceFee, tax, total } = calculateTotals();

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
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressTypeContainer}>
                  <Icon 
                    name={selectedAddress.addressType === 'Home' || selectedAddress.type === 'Home' ? 'home' : 'business'} 
                    size={16} 
                    color="#FF1493" 
                  />
                  <Text style={styles.addressType}>{selectedAddress.addressType || selectedAddress.type}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>
                {selectedAddress.address || selectedAddress.street}, {selectedAddress.city}
              </Text>
              <Text style={styles.addressText}>
                {selectedAddress.state} - {selectedAddress.pincode || selectedAddress.zipCode}
              </Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addAddressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Icon name="add-circle-outline" size={24} color="#FF1493" />
              <Text style={styles.addAddressText}>Add Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          {/* Product Items */}
          {productItems.length > 0 && (
            <View style={styles.itemsGroup}>
              <Text style={styles.itemsGroupTitle}>Products</Text>
              {productItems.map((item) => (
                <View key={item._id} style={styles.orderItem}>
                  <Image
                    source={{ 
                      uri: item.product?.primaryImage || 
                           (item.product?.images && item.product?.images[0]?.url) || 
                           'https://via.placeholder.com/50x50'
                    }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Service Items */}
          {serviceItems.length > 0 && (
            <View style={styles.itemsGroup}>
              <Text style={styles.itemsGroupTitle}>Services</Text>
              {serviceItems.map((item) => (
                <View key={item._id} style={styles.orderItem}>
                  <Image
                    source={{ uri: item.service?.image_url || 'https://via.placeholder.com/50x50' }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.service?.name || 'Service'}</Text>
                    <Text style={styles.itemQuantity}>
                      {item.selectedDate && formatDate(item.selectedDate)} {item.selectedTime && `at ${item.selectedTime}`}
                    </Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity 
            style={styles.paymentOption}
            onPress={() => setShowPaymentModal(true)}
          >
            <View style={styles.paymentOptionLeft}>
              <Icon 
                name={selectedPaymentMethod === 'cod' ? 'cash' : 'card'} 
                size={20} 
                color="#FF1493" 
              />
              <Text style={styles.paymentText}>
                {selectedPaymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Bill Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billDetails}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
            
            {deliveryFee > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>₹{deliveryFee}</Text>
              </View>
            )}
            
            {serviceFee > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Service Fee</Text>
                <Text style={styles.billValue}>₹{serviceFee}</Text>
              </View>
            )}
            
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>GST (18%)</Text>
              <Text style={styles.billValue}>₹{tax}</Text>
            </View>
            
            <View style={[styles.billRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.totalSummary}>
          <Text style={styles.totalSummaryLabel}>Total: ₹{total}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderButton, 
            submitting && styles.disabledButton
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Delivery Address</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Saved Addresses */}
            {savedAddresses.map((address) => (
              <TouchableOpacity
                key={address._id}
                style={[
                  styles.addressOption,
                  selectedAddress?._id === address._id && styles.selectedAddress
                ]}
                onPress={() => {
                  setSelectedAddress(address);
                  setShowAddressModal(false);
                }}
              >
                <View style={styles.addressOptionContent}>
                  <View style={styles.addressTypeContainer}>
                    <Icon 
                      name={address.addressType === 'Home' || address.type === 'Home' ? 'home' : 'business'} 
                      size={16} 
                      color="#FF1493" 
                    />
                    <Text style={styles.addressType}>{address.addressType || address.type}</Text>
                  </View>
                  <Text style={styles.addressText}>
                    {address.address || address.street}, {address.city}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.state} - {address.pincode || address.zipCode}
                  </Text>
                </View>
                {selectedAddress?._id === address._id && (
                  <Icon name="checkmark-circle" size={20} color="#FF1493" />
                )}
              </TouchableOpacity>
            ))}

            {/* Add New Address Form */}
            <View style={styles.newAddressForm}>
              <Text style={styles.formTitle}>Add New Address</Text>
              
              <View style={styles.addressTypeSelector}>
                {['Home', 'Work', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newAddress.type === type && styles.selectedType
                    ]}
                    onPress={() => setNewAddress({...newAddress, type})}
                  >
                    <Text style={[
                      styles.typeText,
                      newAddress.type === type && styles.selectedTypeText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={newAddress.street}
                onChangeText={(text) => setNewAddress({...newAddress, street: text})}
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="City"
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress({...newAddress, city: text})}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="State"
                  value={newAddress.state}
                  onChangeText={(text) => setNewAddress({...newAddress, state: text})}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="ZIP Code"
                value={newAddress.zipCode}
                onChangeText={(text) => setNewAddress({...newAddress, zipCode: text})}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddNewAddress}
              >
                <Text style={styles.addButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Payment Method</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.paymentMethodOption,
                selectedPaymentMethod === 'cod' && styles.selectedPaymentMethod
              ]}
              onPress={() => {
                setSelectedPaymentMethod('cod');
                setShowPaymentModal(false);
              }}
            >
              <Icon name="cash" size={24} color="#FF1493" />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentMethodDesc}>Pay when you receive</Text>
              </View>
              {selectedPaymentMethod === 'cod' && (
                <Icon name="checkmark-circle" size={20} color="#FF1493" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodOption,
                selectedPaymentMethod === 'online' && styles.selectedPaymentMethod
              ]}
              onPress={() => {
                setSelectedPaymentMethod('online');
                setShowPaymentModal(false);
              }}
            >
              <Icon name="card" size={24} color="#FF1493" />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>Online Payment</Text>
                <Text style={styles.paymentMethodDesc}>Pay now with card/UPI</Text>
              </View>
              {selectedPaymentMethod === 'online' && (
                <Icon name="checkmark-circle" size={20} color="#FF1493" />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF5F8',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF1493',
    marginLeft: 6,
  },
  changeText: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#FF1493',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addAddressText: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500',
    marginLeft: 8,
  },
  itemsGroup: {
    marginBottom: 16,
  },
  itemsGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 8,
    backgroundColor: '#FFF5F8',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 12,
    fontWeight: '500',
  },
  billDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billLabel: {
    fontSize: 14,
    color: '#666',
  },
  billValue: {
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
    color: '#FF1493',
  },
  spacer: {
    height: 120,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalSummary: {
    alignItems: 'center',
    marginBottom: 12,
  },
  totalSummaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  placeOrderButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#FFB6C1',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  addressOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedAddress: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  addressOptionContent: {
    flex: 1,
  },
  newAddressForm: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  addressTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    alignItems: 'center',
  },
  selectedType: {
    borderColor: '#FF1493',
    backgroundColor: '#FF1493',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeText: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  addButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#666',
  },
});

export default CheckoutScreen;