import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const ProductCheckoutScreen = ({ navigation, route }) => {
  const { user, tokens } = useAuth();
  const { cartItems, totalAmount } = route.params;
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const paymentMethods = [
    { id: 'cod', name: 'Cash on Delivery', icon: 'wallet-outline', available: true },
    { id: 'online', name: 'Online Payment', icon: 'card-outline', available: true },
    { id: 'wallet', name: 'Digital Wallet', icon: 'phone-portrait-outline', available: false },
  ];

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/addresses`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        const addressList = data.data || [];
        setAddresses(addressList);
        // Auto-select default address
        const defaultAddr = addressList.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setPlacing(true);
      const response = await fetch(`${API_URL}/product-orders/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          addressId: selectedAddress._id,
          paymentMethod,
          orderNotes: ''
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Order Placed!',
          `Your order #${data.data.orderNumber} has been placed successfully.`,
          [
            {
              text: 'View Order',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { 
                      name: 'MyOrders', 
                      params: { orderId: data.data._id }
                    }
                  ]
                });
              }
            },
            {
              text: 'Continue Shopping',
              onPress: () => {
                navigation.navigate('Product');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const renderCartSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      {cartItems.map((item, index) => (
        <View key={index} style={styles.cartItem}>
          <Image 
            source={{ 
              uri: item.product.primaryImage || 
                   'https://via.placeholder.com/60x60?text=No+Image'
            }} 
            style={styles.cartItemImage}
          />
          <View style={styles.cartItemDetails}>
            <Text style={styles.cartItemName} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={styles.cartItemPrice}>₹{item.price} × {item.quantity}</Text>
          </View>
          <Text style={styles.cartItemTotal}>₹{item.price * item.quantity}</Text>
        </View>
      ))}
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total ({cartItems.length} items)</Text>
        <Text style={styles.totalAmount}>₹{totalAmount}</Text>
      </View>
    </View>
  );

  const renderAddressSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TouchableOpacity
          onPress={() => setAddressModalVisible(true)}
          style={styles.changeButton}
        >
          <Text style={styles.changeButtonText}>
            {selectedAddress ? 'Change' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {selectedAddress ? (
        <View style={styles.selectedAddress}>
          <View style={styles.addressHeader}>
            <Icon name="location" size={16} color="#FF6B9D" />
            <Text style={styles.addressType}>{selectedAddress.addressType}</Text>
            {selectedAddress.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>DEFAULT</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressName}>{selectedAddress.fullName}</Text>
          <Text style={styles.addressPhone}>{selectedAddress.phoneNumber}</Text>
          <Text style={styles.addressText}>
            {selectedAddress.address}
            {selectedAddress.landmark && `, ${selectedAddress.landmark}`}
          </Text>
          <Text style={styles.addressLocation}>
            {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
          </Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.selectAddressButton}
          onPress={() => setAddressModalVisible(true)}
        >
          <Icon name="add-circle-outline" size={24} color="#FF6B9D" />
          <Text style={styles.selectAddressText}>Select Delivery Address</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.paymentMethod,
            paymentMethod === method.id && styles.selectedPaymentMethod,
            !method.available && styles.disabledPaymentMethod
          ]}
          onPress={() => method.available && setPaymentMethod(method.id)}
          disabled={!method.available}
        >
          <View style={styles.paymentMethodLeft}>
            <View style={[
              styles.radioButton,
              paymentMethod === method.id && styles.selectedRadioButton
            ]}>
              {paymentMethod === method.id && <View style={styles.radioDot} />}
            </View>
            <Icon 
              name={method.icon} 
              size={20} 
              color={method.available ? "#666" : "#ccc"} 
            />
            <Text style={[
              styles.paymentMethodName,
              !method.available && styles.disabledPaymentMethodName
            ]}>
              {method.name}
            </Text>
          </View>
          {!method.available && (
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAddressModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addressModalVisible}
      onRequestClose={() => setAddressModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Address</Text>
            <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.addressList}>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address._id}
                style={[
                  styles.addressOption,
                  selectedAddress?._id === address._id && styles.selectedAddressOption
                ]}
                onPress={() => {
                  setSelectedAddress(address);
                  setAddressModalVisible(false);
                }}
              >
                <View style={styles.addressOptionHeader}>
                  <View style={styles.addressTypeContainer}>
                    <Icon name="location" size={16} color="#FF6B9D" />
                    <Text style={styles.addressType}>{address.addressType}</Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <View style={[
                    styles.selectRadio,
                    selectedAddress?._id === address._id && styles.selectedRadio
                  ]}>
                    {selectedAddress?._id === address._id && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={styles.addressName}>{address.fullName}</Text>
                <Text style={styles.addressText}>
                  {address.address}, {address.city}, {address.state} - {address.pincode}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={() => {
                setAddressModalVisible(false);
                navigation.navigate('SavedAddresses');
              }}
            >
              <Icon name="add-circle-outline" size={20} color="#FF6B9D" />
              <Text style={styles.addNewAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCartSummary()}
        {renderAddressSection()}
        {renderPaymentSection()}
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <View style={styles.totalSummary}>
          <Text style={styles.totalText}>Total: ₹{totalAmount}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, placing && styles.placingOrderButton]}
          onPress={placeOrder}
          disabled={placing || !selectedAddress}
        >
          {placing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              Place Order
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {renderAddressModal()}
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
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 4,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  changeButtonText: {
    color: '#FF6B9D',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Cart Summary
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#F0F0F0',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  
  // Address Section
  selectedAddress: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 6,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#54A0FF',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  addressLocation: {
    fontSize: 14,
    color: '#666',
  },
  selectAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D15',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  selectAddressText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Payment Section
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedPaymentMethod: {
    backgroundColor: '#FF6B9D05',
  },
  disabledPaymentMethod: {
    opacity: 0.5,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#FF6B9D',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B9D',
  },
  paymentMethodName: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
  },
  disabledPaymentMethodName: {
    color: '#ccc',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#FF6B9D',
    fontStyle: 'italic',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  totalSummary: {
    marginBottom: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  placeOrderButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placingOrderButton: {
    backgroundColor: '#FF6B9D80',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  addressList: {
    maxHeight: 400,
  },
  addressOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedAddressOption: {
    backgroundColor: '#FF6B9D05',
  },
  addressOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: '#FF6B9D',
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addNewAddressText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProductCheckoutScreen;