// src/Pages/Payment/PaymentGatewayScreen.js - MOBILE INTEGRATED
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

// Import Razorpay for mobile (install: npm install react-native-razorpay)
let RazorpayCheckout = null;
if (Platform.OS !== 'web') {
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch (error) {
    console.warn('Razorpay module not found. Please install: npm install react-native-razorpay');
  }
}

const PaymentGatewayScreen = ({ route, navigation }) => {
  const { orderData } = route.params;
  const { tokens, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('online');

  const paymentMethods = [
    {
      id: 'online',
      name: 'Pay Online',
      icon: 'credit-card-outline',
      description: 'UPI, Cards, Net Banking, Wallets',
      color: '#4CAF50'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: 'cash',
      description: 'Pay when you receive',
      color: '#FF9800'
    }
  ];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      } else {
        // For mobile, check if module is available
        resolve(RazorpayCheckout !== null);
      }
    });
  };

  const handleOnlinePayment = async () => {
    try {
      setLoading(true);

      // Check Razorpay availability
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        Alert.alert('Error', 'Payment gateway not available. Please try again or use Cash on Delivery.');
        setLoading(false);
        return;
      }

      // Get auth token
      const token = tokens?.accessToken || user?.token;
      if (!token) {
        Alert.alert('Error', 'Please login to continue');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      // Create Razorpay order
      const { data } = await axios.post(
        `${API_URL}/payments/create-order`,
        {
          amount: orderData.totalAmount,
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          notes: {
            orderType: orderData.type,
            items: orderData.serviceItems?.length || orderData.productItems?.length
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!data.success) {
        throw new Error('Failed to create payment order');
      }

      // Platform-specific payment flow
      if (Platform.OS === 'web') {
        await handleWebPayment(data.data, token);
      } else {
        await handleMobilePayment(data.data, token);
      }

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  // Web payment handler
  const handleWebPayment = async (orderDetails, token) => {
    const options = {
      key: orderDetails.key,
      amount: orderDetails.amount,
      currency: orderDetails.currency,
      name: 'Oceana',
      description: `Order Payment - ${orderData.type}`,
      order_id: orderDetails.orderId,
      handler: async (response) => {
        await verifyPayment(response, token);
      },
      prefill: {
        name: orderData.address?.fullName || user?.name || '',
        email: user?.email || '',
        contact: orderData.address?.phoneNumber || user?.phoneNumber || ''
      },
      theme: {
        color: '#FF6B9D'
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          Alert.alert('Payment Cancelled', 'You cancelled the payment process');
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', async (response) => {
      await handlePaymentFailure(response, token);
    });
    razorpay.open();
  };

  // Mobile payment handler
  const handleMobilePayment = async (orderDetails, token) => {
    const options = {
      description: `Order Payment - ${orderData.type}`,
      image: 'https://your-app-logo-url.com/logo.png', // Add your app logo URL
      currency: orderDetails.currency,
      key: orderDetails.key,
      amount: orderDetails.amount,
      name: 'Oceana',
      order_id: orderDetails.orderId,
      prefill: {
        name: orderData.address?.fullName || user?.name || '',
        email: user?.email || '',
        contact: orderData.address?.phoneNumber || user?.phoneNumber || ''
      },
      theme: { color: '#FF6B9D' }
    };

    try {
      const paymentData = await RazorpayCheckout.open(options);
      
      // Payment successful
      await verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature
      }, token);

    } catch (error) {
      setLoading(false);
      
      // User cancelled or payment failed
      if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment process');
      } else {
        await handlePaymentFailure({
          error: {
            metadata: {
              order_id: orderDetails.orderId,
              payment_id: error.payment_id || ''
            },
            description: error.description || 'Payment failed',
            reason: error.reason || 'unknown'
          }
        }, token);
      }
    }
  };

  const verifyPayment = async (paymentResponse, token) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/payments/verify`,
        {
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          orderData: orderData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (data.success) {
        setLoading(false);
        navigation.replace('OrderConfirmation', {
          order: data.data.order,
          payment: data.data.payment
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Payment verification failed. Please contact support.');
      setLoading(false);
    }
  };

  const handlePaymentFailure = async (response, token) => {
    try {
      await axios.post(
        `${API_URL}/payments/failure`,
        {
          razorpay_order_id: response.error.metadata.order_id,
          razorpay_payment_id: response.error.metadata.payment_id,
          error_description: response.error.description,
          error_reason: response.error.reason
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      Alert.alert(
        'Payment Failed',
        response.error.description || 'Payment processing failed',
        [{ text: 'Try Again', onPress: () => setLoading(false) }]
      );
    } catch (error) {
      console.error('Failure handling error:', error);
      setLoading(false);
    }
  };

  const handleCODPayment = async () => {
    try {
      setLoading(true);
      const token = tokens?.accessToken || user?.token;

      // Create order with COD
      const { data } = await axios.post(
        `${API_URL}/orders/create`,
        {
          ...orderData,
          paymentMethod: 'cod'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (data.success) {
        navigation.replace('OrderConfirmation', {
          order: data.data,
          payment: { method: 'cod', status: 'pending' }
        });
      }
    } catch (error) {
      console.error('COD order error:', error);
      Alert.alert('Error', 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (selectedMethod === 'online') {
      handleOnlinePayment();
    } else {
      handleCODPayment();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{orderData.subtotal?.toFixed(2)}</Text>
          </View>
          {orderData.deliveryFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₹{orderData.deliveryFee?.toFixed(2)}</Text>
            </View>
          )}
          {orderData.serviceFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>₹{orderData.serviceFee?.toFixed(2)}</Text>
            </View>
          )}
          {orderData.tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>₹{orderData.tax?.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{orderData.totalAmount?.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsCard}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodItem,
                selectedMethod === method.id && styles.methodItemSelected
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.iconContainer, { backgroundColor: method.color + '20' }]}>
                  <Icon name={method.icon} size={28} color={method.color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              <View style={styles.radioButton}>
                {selectedMethod === method.id && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Icon name="shield-check" size={20} color="#4CAF50" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomLabel}>Total Amount</Text>
          <Text style={styles.bottomAmount}>₹{orderData.totalAmount?.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.proceedButton, loading && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.proceedButtonText}>
                {selectedMethod === 'online' ? 'Pay Now' : 'Place Order'}
              </Text>
              <Icon name="arrow-right" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 16
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B9D'
  },
  methodsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 12
  },
  methodItemSelected: {
    borderColor: '#FF6B9D',
    backgroundColor: '#FFF5F8'
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodInfo: {
    flex: 1
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  methodDescription: {
    fontSize: 12,
    color: '#666'
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B9D'
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 100
  },
  securityText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      },
      android: {
        elevation: 8
      }
    })
  },
  bottomLeft: {
    flex: 1
  },
  bottomLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  bottomAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8
  },
  proceedButtonDisabled: {
    backgroundColor: '#CCC'
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8
  }
});

export default PaymentGatewayScreen;