// src/Pages/Booking/OrderConfirmationScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// import Header from '../../Components/Header';
import Footer from '../../Components/Footer';

const OrderConfirmationScreen = ({ navigation, route }) => {
  const { orderData } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Processing your order...</Text>
          <Text style={styles.loadingSubText}>Please wait while we confirm your order</Text>
        </View>
        {/* <Footer /> */}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.successContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.successIcon}>
            <Icon name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          
          <Text style={styles.successTitle}>Order Placed Successfully!</Text>
          <Text style={styles.successMessage}>
            Thank you for your order. We've received your request and will process it shortly.
          </Text>

          {orderData && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>Order #{orderData.orderNumber}</Text>
              <Text style={styles.orderAmount}>Amount: ₹{orderData.totalAmount}</Text>
            </View>
          )}

          <View style={styles.buttonsContainer}>
            {/* <TouchableOpacity
              style={styles.trackButton}
              onPress={() => navigation.navigate('TrackOrder', { orderData })}
            >
              <Icon name="location" size={20} color="#FFFFFF" />
              <Text style={styles.trackButtonText}>Track Order</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.continueButtonText}>Continue Shopping</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ordersButton}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <Text style={styles.ordersButtonText}>View All Orders</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF1493',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 350,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#FFF5F8',
    borderRadius: 12,
    width: '100%',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF1493',
    marginBottom: 8,
  },
  orderAmount: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  trackButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  continueButtonText: {
    color: '#FF1493',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ordersButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default OrderConfirmationScreen;