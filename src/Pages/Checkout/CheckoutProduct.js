// src/Pages/Cart/CheckoutProduct.js - WITH WALLET INTEGRATION
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
  Modal,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const CheckoutProduct = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Address and Payment States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');

  // 💰 Wallet States
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // 💰 Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await fetch(`${API_URL}/wallet/balance`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setWalletBalance(data.data.balance || 0);
      }
    } catch (error) {
      console.error('Fetch wallet balance error:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchCheckoutData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const [productsResponse, addressesResponse] = await Promise.all([
        fetch(`${API_URL}/product-cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/addresses`, { headers: getAuthHeaders() })
      ]);

      const productsData = await productsResponse.json();
      const addressesData = await addressesResponse.json();

      if (productsData.success) {
        setProductItems(productsData.data.items || []);
      }

      if (addressesData.success) {
        const addresses = addressesData.data || [];
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        } else if (addresses.length > 0) {
          setSelectedAddress(addresses[0]);
        }
      }

      // 💰 Fetch wallet balance
      await fetchWalletBalance();

    } catch (error) {
      console.error('Fetch checkout data error:', error);
      Alert.alert('Error', 'Failed to load checkout data');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCheckoutData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckoutData(false);
  };

  const navigateToAddresses = () => {
    navigation.navigate('SavedAddresses');
  };

  const calculateTotals = () => {
    const subtotal = productItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const deliveryFee = 50;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + deliveryFee + tax;

    return { subtotal, deliveryFee, tax, total };
  };

  // 💰 Process wallet payment
  const processWalletPayment = async (orderData, totalAmount) => {
    try {
      const response = await fetch(`${API_URL}/wallet/deduct-money`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: totalAmount,
          description: `Payment for order ${orderData.orderNumber}`,
          referenceType: 'order',
          referenceId: orderData._id
        }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, transactionId: data.data.transaction.id };
      } else {
        throw new Error(data.message || 'Wallet payment failed');
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      throw error;
    }
  };

  const initiateRazorpayPayment = async (orderData, totalAmount) => {
    try {
      const paymentOrderResponse = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: `order_${Date.now()}`
        }),
      });

      const paymentOrderData = await paymentOrderResponse.json();

      if (!paymentOrderData.success) {
        throw new Error('Failed to create payment order');
      }

      const options = {
        description: 'Product Order Payment',
        image: 'https://your-app-logo-url.com/logo.png',
        currency: 'INR',
        key: paymentOrderData.data.keyId,
        amount: paymentOrderData.data.amount,
        order_id: paymentOrderData.data.orderId,
        name: 'Your App Name',
        prefill: {
          email: user?.email || '',
          contact: user?.phoneNumber || '',
          name: user?.name || ''
        },
        theme: { color: '#FF1493' }
      };

      const paymentResult = await RazorpayCheckout.open(options);

      const verifyResponse = await fetch(`${API_URL}/payments/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
          orderId: orderData._id
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        return { success: true, paymentId: paymentResult.razorpay_payment_id };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Razorpay payment error:', error);
      if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
        throw new Error('Payment cancelled by user');
      } else if (error.code === RazorpayCheckout.PAYMENT_FAILED) {
        throw new Error('Payment failed. Please try again');
      } else {
        throw error;
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address', [
        { text: 'Add Address', onPress: navigateToAddresses },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    if (productItems.length === 0) {
      Alert.alert('Error', 'Your product cart is empty');
      return;
    }

    // 💰 Check wallet balance for wallet payment
    const { total } = calculateTotals();
    if (selectedPaymentMethod === 'wallet' && walletBalance < total) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${total} but your wallet has only ₹${walletBalance.toFixed(2)}. Please add money to your wallet or choose another payment method.`,
        [
          { text: 'Add Money', onPress: () => navigation.navigate('Wallet') },
          { text: 'Change Payment', onPress: () => setShowPaymentModal(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      setSubmitting(true);

      const mappedProductItems = productItems.map(item => ({
        productId: item.product?.id || item.product?._id || item.product,
        quantity: item.quantity || 1,
        price: item.price || 0
      }));

      const mappedAddress = {
        type: selectedAddress.addressType || selectedAddress.type || 'Home',
        street: selectedAddress.address || selectedAddress.street || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        zipCode: selectedAddress.pincode || selectedAddress.zipCode || ''
      };

      const orderData = {
        address: mappedAddress,
        paymentMethod: selectedPaymentMethod,
        serviceItems: [],
        productItems: mappedProductItems,
        totalAmount: total,
        type: 'product',
        status: 'placed'
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        // 💰 Process payment based on method
        if (selectedPaymentMethod === 'wallet') {
          try {
            const walletPayment = await processWalletPayment(data.data, total);
            
            if (!walletPayment.success) {
              Alert.alert('Payment Failed', 'Wallet payment failed. Please contact support.');
              return;
            }
          } catch (walletError) {
            Alert.alert('Payment Error', walletError.message);
            return;
          }
        } else if (selectedPaymentMethod === 'online') {
          try {
            const paymentResult = await initiateRazorpayPayment(data.data, total);
            
            if (!paymentResult.success) {
              Alert.alert('Payment Failed', 'Online payment failed. Please contact support.');
              return;
            }
          } catch (paymentError) {
            Alert.alert('Payment Error', paymentError.message);
            return;
          }
        }

        await fetch(`${API_URL}/product-cart/clear`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        navigation.navigate('OrderConfirmation', {
          orderData: {
            ...data.data,
            orderNumber: data.data.orderNumber || `ORD${Date.now()}`,
            totalAmount: total,
            type: 'product',
            status: 'placed',
            createdAt: new Date().toISOString(),
            paymentMethod: selectedPaymentMethod,
            trackingId: data.data.trackingId || `TRK${Date.now()}`,
            courier: data.data.courier || 'FedEx',
            estimatedDelivery: data.data.estimatedDelivery || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Place order error:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const getAddressTypeIcon = (type) => {
    switch (type) {
      case 'Home': return 'home';
      case 'Work': return 'business';
      default: return 'location';
    }
  };

  // 💰 Render payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'wallet': return 'wallet';
      case 'online': return 'card';
      case 'cod': return 'cash';
      default: return 'card';
    }
  };

  // 💰 Render payment method label
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'wallet': return 'HUSN Wallet';
      case 'online': return 'Online Payment';
      case 'cod': return 'Cash on Delivery';
      default: return 'Payment Method';
    }
  };

  const renderDeliveryAddress = () => {
    if (savedAddresses.length === 0) {
      return (
        <View style={styles.noAddressContainer}>
          <Icon name="location-outline" size={32} color="#FF1493" />
          <Text style={styles.noAddressTitle}>No Saved Addresses</Text>
          <Text style={styles.noAddressSubtitle}>Add an address to continue</Text>
          <TouchableOpacity 
            style={styles.addAddressButton}
            onPress={navigateToAddresses}
          >
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.addAddressText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        {selectedAddress && (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <View style={styles.addressTypeContainer}>
                <Icon 
                  name={getAddressTypeIcon(selectedAddress.addressType || selectedAddress.type)} 
                  size={16} 
                  color="#FF1493" 
                />
                <Text style={styles.addressType}>
                  {selectedAddress.addressType || selectedAddress.type}
                </Text>
                {selectedAddress.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={navigateToAddresses}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addressDetails}>
              <Text style={styles.fullName}>
                {selectedAddress.fullName || user?.name || 'User'}
              </Text>
              <Text style={styles.phoneNumber}>
                {selectedAddress.phoneNumber || user?.phoneNumber || ''}
              </Text>
              <Text style={styles.addressText}>
                {selectedAddress.address || selectedAddress.street}
                {selectedAddress.landmark && `, ${selectedAddress.landmark}`}
              </Text>
              <Text style={styles.addressText}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode || selectedAddress.zipCode}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderProductItem = (item) => (
    <View key={item._id} style={styles.orderItem}>
      <Image
        source={{ 
          uri: item.product?.primaryImage || 
               (item.product?.images && item.product?.images[0]?.url) || 
               'https://via.placeholder.com/50x50?text=Product'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        {item.product?.brand && (
          <Text style={styles.brandText}>{item.product.brand}</Text>
        )}
      </View>
      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
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
          <Text style={styles.headerTitle}>Product Checkout</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (productItems.length === 0) {
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
          <Text style={styles.headerTitle}>Product Checkout</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Icon name="cube-outline" size={80} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No products in cart</Text>
          <Text style={styles.emptySubtitle}>Add products to proceed</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Product')}
          >
            <Text style={styles.shopButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { subtotal, deliveryFee, tax, total } = calculateTotals();

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
        <Text style={styles.headerTitle}>Product Checkout</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {renderDeliveryAddress()}
        </View>

        {/* Product Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products ({productItems.length})</Text>
          {productItems.map(renderProductItem)}
        </View>

        {/* 💰 Payment Method Section with Wallet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {/* 💰 Wallet Balance Display */}
          <View style={styles.walletBalanceCard}>
            <View style={styles.walletBalanceLeft}>
              <Icon name="wallet" size={20} color="#667eea" />
              <View style={styles.walletBalanceInfo}>
                <Text style={styles.walletBalanceLabel}>HUSN Wallet Balance</Text>
                {loadingWallet ? (
                  <ActivityIndicator size="small" color="#667eea" />
                ) : (
                  <Text style={styles.walletBalanceAmount}>₹{walletBalance.toFixed(2)}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addMoneyButton}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Icon name="add-circle-outline" size={16} color="#667eea" />
              <Text style={styles.addMoneyButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.paymentOption}
            onPress={() => setShowPaymentModal(true)}
          >
            <View style={styles.paymentOptionLeft}>
              <Icon 
                name={getPaymentMethodIcon(selectedPaymentMethod)} 
                size={20} 
                color="#FF1493" 
              />
              <Text style={styles.paymentText}>
                {getPaymentMethodLabel(selectedPaymentMethod)}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* 💰 Insufficient balance warning */}
          {selectedPaymentMethod === 'wallet' && walletBalance < total && (
            <View style={styles.insufficientBalanceWarning}>
              <Icon name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.insufficientBalanceText}>
                Insufficient balance. Need ₹{(total - walletBalance).toFixed(2)} more.
              </Text>
            </View>
          )}
        </View>

        {/* Bill Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billDetails}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
            
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billValue}>₹{deliveryFee}</Text>
            </View>
            
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
            (submitting || !selectedAddress) && styles.disabledButton
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting || !selectedAddress}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {selectedPaymentMethod === 'wallet' ? 'Pay from Wallet' : 
               selectedPaymentMethod === 'online' ? 'Pay Now' : 
               'Place Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 💰 Payment Method Modal */}
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
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 💰 Wallet Option */}
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                selectedPaymentMethod === 'wallet' && styles.selectedPaymentMethodCard
              ]}
              onPress={() => {
                setSelectedPaymentMethod('wallet');
                setShowPaymentModal(false);
              }}
            >
              <View style={styles.paymentMethodIconContainer}>
                <Icon name="wallet" size={28} color={selectedPaymentMethod === 'wallet' ? "#667eea" : "#999"} />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  selectedPaymentMethod === 'wallet' && styles.selectedPaymentMethodText
                ]}>
                  HUSN Wallet
                </Text>
                <Text style={styles.paymentMethodBalance}>
                  Balance: ₹{walletBalance.toFixed(2)}
                </Text>
                <Text style={styles.paymentMethodDesc}>
                  Fast & secure payment
                </Text>
              </View>
              {selectedPaymentMethod === 'wallet' && (
                <Icon name="checkmark-circle" size={24} color="#667eea" />
              )}
            </TouchableOpacity>

            {/* Online Payment Option */}
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                selectedPaymentMethod === 'online' && styles.selectedPaymentMethodCard
              ]}
              onPress={() => {
                setSelectedPaymentMethod('online');
                setShowPaymentModal(false);
              }}
            >
              <View style={styles.paymentMethodIconContainer}>
                <Icon name="card" size={28} color={selectedPaymentMethod === 'online' ? "#FF1493" : "#999"} />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  selectedPaymentMethod === 'online' && styles.selectedPaymentMethodText
                ]}>
                  UPI / Cards / Net Banking
                </Text>
                <Text style={styles.paymentMethodDesc}>
                  Pay securely via Razorpay
                </Text>
              </View>
              {selectedPaymentMethod === 'online' && (
                <Icon name="checkmark-circle" size={24} color="#FF1493" />
              )}
            </TouchableOpacity>

            {/* Cash on Delivery Option */}
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                selectedPaymentMethod === 'cod' && styles.selectedPaymentMethodCard
              ]}
              onPress={() => {
                setSelectedPaymentMethod('cod');
                setShowPaymentModal(false);
              }}
            >
              <View style={styles.paymentMethodIconContainer}>
                <Icon name="cash" size={28} color={selectedPaymentMethod === 'cod' ? "#10B981" : "#999"} />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  selectedPaymentMethod === 'cod' && styles.selectedPaymentMethodText
                ]}>
                  Cash on Delivery
                </Text>
                <Text style={styles.paymentMethodDesc}>
                  Pay when you receive the product
                </Text>
              </View>
              {selectedPaymentMethod === 'cod' && (
                <Icon name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  shopButtonText: {
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  // 💰 Wallet Styles
  walletBalanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderWidth: 1,
    borderColor: '#E0E4FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletBalanceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  walletBalanceLabel: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 4,
  },
  walletBalanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  addMoneyButtonText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
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
    fontWeight: '500',
    color: '#000',
    marginLeft: 12,
  },
  insufficientBalanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  insufficientBalanceText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  selectedPaymentMethodCard: {
    borderColor: '#667eea',
    backgroundColor: '#F8F9FF',
  },
  paymentMethodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedPaymentMethodText: {
    color: '#667eea',
  },
  paymentMethodBalance: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 13,
    color: '#666',
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  noAddressSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1493',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addAddressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    fontWeight: '600',
    color: '#FF1493',
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
    fontSize: 9,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500',
  },
  addressDetails: {
    marginTop: 4,
  },
  fullName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 12,
    color: '#FF1493',
    marginBottom: 6,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 2,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
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
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  brandText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF1493',
  },
  billDetails: {
    marginTop: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF1493',
  },
  spacer: {
    height: 100,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalSummary: {
    marginBottom: 8,
  },
  totalSummaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  placeOrderButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
});

export default CheckoutProduct;