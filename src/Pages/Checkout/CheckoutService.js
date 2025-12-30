// src/Pages/Booking/CheckoutService.js - WITH WALLET INTEGRATION
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import RazorpayCheckout from 'react-native-razorpay';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import MapLocationPicker from '../../components/MapLocationPicker';

const CheckoutService = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [serviceItems, setServiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [relevantProfessionals, setRelevantProfessionals] = useState([]);
  const [previousProfessionals, setPreviousProfessionals] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Address States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  // Payment Method State - Default to 'online'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('online');
  
  // 💰 Wallet States
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Live Location States
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  // Booking States
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [allServicesScheduled, setAllServicesScheduled] = useState(false);

  // Animation refs
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      
      const [servicesResponse, addressesResponse, previousBookingsResponse] = await Promise.all([
        fetch(`${API_URL}/cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/addresses`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/orders/my-orders?type=service`, { headers: getAuthHeaders() })
      ]);

      const servicesData = await servicesResponse.json();
      const addressesData = await addressesResponse.json();
      const previousBookingsData = await previousBookingsResponse.json();

      if (servicesData.success) {
        const items = servicesData.data.items || [];
        setServiceItems(items);
        
        const allScheduled = items.length > 0 && items.every(item => 
          item.selectedDate && item.selectedTime && item.professionalId
        );
        
        setAllServicesScheduled(allScheduled);
        
        if (allScheduled && items.length > 0) {
          const firstItem = items[0];
          setSelectedDate(new Date(firstItem.selectedDate));
          setSelectedTime(firstItem.selectedTime);
          setSelectedProfessional({
            id: firstItem.professionalId,
            name: firstItem.professionalName
          });
        } else {
          setSelectedProfessional({ 
            id: 'auto', 
            name: 'Auto-assigned Professional' 
          });
        }
        
        if (items.length > 0) {
          await fetchRelevantProfessionals(items);
        }
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

      if (previousBookingsData.success) {
        const bookings = Array.isArray(previousBookingsData.data) 
          ? previousBookingsData.data 
          : (previousBookingsData.data?.orders || []);
        
        const uniqueProfessionals = [];
        const seenIds = new Set();
        
        if (Array.isArray(bookings)) {
          bookings.forEach(booking => {
            if (booking.serviceItems && Array.isArray(booking.serviceItems)) {
              booking.serviceItems.forEach(item => {
                if (item.professionalId && !seenIds.has(item.professionalId)) {
                  seenIds.add(item.professionalId);
                  uniqueProfessionals.push({
                    id: item.professionalId,
                    name: item.professionalName,
                    isPrevious: true
                  });
                }
              });
            }
          });
        }
        
        setPreviousProfessionals(uniqueProfessionals);
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

  const fetchRelevantProfessionals = async (serviceItems) => {
    try {
      const serviceIds = serviceItems
        .map(item => item.service?._id || item.serviceId)
        .filter(Boolean)
        .join(',');

      if (!serviceIds) {
        setRelevantProfessionals([]);
        return;
      }

      const response = await fetch(
        `${API_URL}/professionals/by-services?serviceIds=${serviceIds}`,
        { headers: getAuthHeaders() }
      );

      const data = await response.json();

      if (data.success) {
        setRelevantProfessionals(data.data || []);
      } else {
        setRelevantProfessionals([]);
      }
    } catch (error) {
      console.error('Fetch relevant professionals error:', error);
      setRelevantProfessionals([]);
    }
  };

  const fetchBookedSlots = async (date) => {
    if (!date) return;
    
    try {
      setLoadingSlots(true);
      const dateStr = date.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_URL}/bookings/booked-slots?date=${dateStr}`,
        { headers: getAuthHeaders() }
      );

      const data = await response.json();

      if (data.success) {
        setBookedSlots(data.data || []);
      } else {
        setBookedSlots([]);
      }
    } catch (error) {
      console.error('Fetch booked slots error:', error);
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for service delivery');
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (addresses.length > 0) {
        const addr = addresses[0];
        
        const addressString = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode
        ].filter(Boolean).join(', ');
        
        setCurrentAddress(addressString);
        
        const liveAddress = {
          _id: 'live-location',
          fullName: user?.name || 'User',
          phoneNumber: user?.phoneNumber || '',
          address: addr.street || addr.name || addressString || 'Current Location',
          street: addr.street || addr.name || addressString || 'Current Location',
          city: addr.city || addr.district || 'Unknown City',
          state: addr.region || addr.isoCountryCode || 'Unknown State',
          pincode: addr.postalCode || '000000',
          zipCode: addr.postalCode || '000000',
          addressType: 'Current Location',
          type: 'Current Location',
          isLiveLocation: true,
          coordinates: { 
            latitude, 
            longitude 
          }
        };
        
        setSelectedAddress(liveAddress);
        setUseCurrentLocation(true);
      } else {
        Alert.alert(
          'Location Details Missing',
          'Could not determine address details from your location.',
          [{ text: 'OK' }]
        );
      }

      setGettingLocation(false);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('Error', 'Failed to get current location.');
      setGettingLocation(false);
    }
  };

  const handleLocationSelect = async (selectedLocation) => {
    try {
      setCurrentLocation({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude
      });
      
      let addressDetails = {
        city: selectedLocation.city || '',
        state: selectedLocation.state || '',
        pincode: selectedLocation.pincode || ''
      };
      
      if (!addressDetails.city || !addressDetails.state || !addressDetails.pincode) {
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude
          });
          
          if (addresses.length > 0) {
            const addr = addresses[0];
            addressDetails = {
              city: addr.city || addr.district || selectedLocation.city || 'Unknown City',
              state: addr.region || addr.isoCountryCode || selectedLocation.state || 'Unknown State',
              pincode: addr.postalCode || selectedLocation.pincode || '000000'
            };
          }
        } catch (geocodeError) {
          console.error('Reverse geocoding error:', geocodeError);
          if (!addressDetails.city) addressDetails.city = 'Unknown City';
          if (!addressDetails.state) addressDetails.state = 'Unknown State';
          if (!addressDetails.pincode) addressDetails.pincode = '000000';
        }
      }
      
      setCurrentAddress(selectedLocation.address);
      
      const mapAddress = {
        _id: 'map-location',
        fullName: user?.name || 'User',
        phoneNumber: user?.phoneNumber || '',
        address: selectedLocation.address,
        street: selectedLocation.address,
        city: addressDetails.city,
        state: addressDetails.state,
        pincode: addressDetails.pincode,
        zipCode: addressDetails.pincode,
        addressType: 'Selected Location',
        type: 'Selected Location',
        isLiveLocation: true,
        coordinates: { 
          latitude: selectedLocation.latitude, 
          longitude: selectedLocation.longitude 
        }
      };
      
      setSelectedAddress(mapAddress);
      setUseCurrentLocation(true);
    } catch (error) {
      console.error('Handle location select error:', error);
      Alert.alert('Error', 'Failed to process selected location');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCheckoutData();
    }, [])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckoutData(false);
  };

  const navigateToAddresses = () => {
    navigation.navigate('SavedAddresses');
  };

  const calculateTotals = () => {
    const subtotal = serviceItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const serviceFee = 25;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + serviceFee + tax;

    return { subtotal, serviceFee, tax, total };
  };

  const openBookingModal = () => {
    if (!selectedProfessional) {
      setSelectedProfessional({ 
        id: 'auto', 
        name: 'Auto-assigned Professional' 
      });
    }
    setShowBookingModal(true);
  };

  const saveBookingDetails = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessional) {
      Alert.alert('Missing Details', 'Please select date, time, and professional');
      return;
    }

    try {
      const updatePromises = serviceItems.map(item =>
        fetch(`${API_URL}/cart/${item._id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            selectedDate,
            selectedTime,
            professionalId: selectedProfessional.id,
            professionalName: selectedProfessional.name
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allSuccessful = responses.every(res => res.ok);

      if (allSuccessful) {
        setServiceItems(prevItems =>
          prevItems.map(item => ({
            ...item,
            selectedDate,
            selectedTime,
            professionalId: selectedProfessional.id,
            professionalName: selectedProfessional.name
          }))
        );
        
        setAllServicesScheduled(true);
        setShowBookingModal(false);
        Alert.alert('Success', 'All services scheduled successfully');
      } else {
        Alert.alert('Error', 'Failed to save booking details for some services');
      }
    } catch (error) {
      console.error('Save booking error:', error);
      Alert.alert('Error', 'Failed to save booking details');
    }
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
        description: 'Service Booking Payment',
        image: 'https://wazwanlegacy.s3.us-east-1.amazonaws.com/salons/HUSN+(2).png',
        currency: 'INR',
        key: paymentOrderData.data.keyId,
        amount: paymentOrderData.data.amount,
        order_id: paymentOrderData.data.orderId,
        name: 'HUSN SALON',
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
      Alert.alert('Address Required', 'Please select a service location', [
        { text: 'Add Address', onPress: navigateToAddresses },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    if (!allServicesScheduled) {
      Alert.alert(
        'Booking Required',
        'Please schedule all services before placing order',
        [{ text: 'OK' }]
      );
      return;
    }

    if (serviceItems.length === 0) {
      Alert.alert('Error', 'Your service cart is empty');
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

      const mappedServiceItems = serviceItems.map(item => ({
        serviceId: item.service?._id || item.serviceId,
        quantity: item.quantity || 1,
        price: item.price || 0,
        selectedDate: item.selectedDate,
        selectedTime: item.selectedTime,
        professionalId: item.professionalId,
        professionalName: item.professionalName
      }));

      const mappedAddress = {
        type: selectedAddress.addressType || selectedAddress.type || 'Home',
        street: selectedAddress.street || selectedAddress.address || 'Address not provided',
        city: selectedAddress.city || 'Unknown City',
        state: selectedAddress.state || 'Unknown State',
        zipCode: selectedAddress.pincode || selectedAddress.zipCode || '000000',
        ...(selectedAddress.isLiveLocation && selectedAddress.coordinates && {
          latitude: selectedAddress.coordinates.latitude,
          longitude: selectedAddress.coordinates.longitude
        }),
        ...(!selectedAddress.isLiveLocation && selectedAddress.latitude && selectedAddress.longitude && {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude
        })
      };

      if (!mappedAddress.city || mappedAddress.city === 'Unknown City' ||
          !mappedAddress.state || mappedAddress.state === 'Unknown State') {
        Alert.alert(
          'Address Incomplete',
          'We could not determine complete address details. Please use a saved address.',
          [{ text: 'OK' }]
        );
        setSubmitting(false);
        return;
      }

      const orderData = {
        address: mappedAddress,
        paymentMethod: selectedPaymentMethod,
        serviceItems: mappedServiceItems,
        productItems: [],
        totalAmount: total,
        type: 'service',
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

        await fetch(`${API_URL}/cart/clear`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        navigation.navigate('OrderConfirmation', {
          orderData: {
            ...data.data,
            orderNumber: data.data.orderNumber || `ORD${Date.now()}`,
            totalAmount: total,
            type: 'service',
            status: 'placed',
            createdAt: new Date().toISOString(),
            paymentMethod: selectedPaymentMethod,
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateForSummary = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const time24_00 = `${hour}:00`;
      const time24_30 = `${hour}:30`;
      
      const formatTime = (time) => {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
      };
      
      slots.push(formatTime(time24_00));
      if (hour < 18) {
        slots.push(formatTime(time24_30));
      }
    }
    return slots;
  };

  const generateNextDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatTimeTo24Hour = (time12) => {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const isSlotBooked = (timeSlot) => {
    const time24 = formatTimeTo24Hour(timeSlot);
    return bookedSlots.includes(time24);
  };

  const getAddressTypeIcon = (type) => {
    switch (type) {
      case 'Home': return 'home';
      case 'Work': return 'business';
      case 'Current Location': return 'location';
      case 'Selected Location': return 'pin';
      default: return 'location';
    }
  };

  const getAddressSummary = () => {
    if (!selectedAddress) return 'No address selected';
    const parts = [];
    if (selectedAddress.address || selectedAddress.street) {
      parts.push(selectedAddress.address || selectedAddress.street);
    }
    if (selectedAddress.city) parts.push(selectedAddress.city);
    return parts.join(', ') || 'Address selected';
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
      case 'online': return 'Pay via UPI/Online';
      case 'cod': return 'Cash on Service';
      default: return 'Payment Method';
    }
  };

  const renderServiceLocation = () => {
    return (
      <View>
        <View style={styles.liveLocationSection}>
          <TouchableOpacity
            style={[
              styles.liveLocationCard,
              useCurrentLocation && styles.liveLocationCardActive
            ]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <View style={styles.liveLocationHeader}>
              <Icon 
                name="navigate-circle" 
                size={24} 
                color={useCurrentLocation ? "#FF1493" : "#666"} 
              />
              <Text style={[
                styles.liveLocationTitle,
                useCurrentLocation && styles.liveLocationTitleActive
              ]}>
                Use Current Location
              </Text>
            </View>
            {gettingLocation && (
              <ActivityIndicator size="small" color="#FF1493" style={styles.locationLoader} />
            )}
            {currentAddress && useCurrentLocation && (
              <Text style={styles.currentAddressText}>{currentAddress}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapPickerButton}
            onPress={() => setShowMapPicker(true)}
          >
            <Icon name="map" size={20} color="#FF1493" />
            <Text style={styles.mapPickerButtonText}>Pick from Map</Text>
          </TouchableOpacity>
        </View>

        {savedAddresses.length > 0 && (
          <View style={styles.savedAddressesSection}>
            <Text style={styles.orText}>OR</Text>
            <Text style={styles.savedAddressesTitle}>Saved Addresses</Text>
            
            {selectedAddress && !selectedAddress.isLiveLocation && (
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
            
            <TouchableOpacity 
              style={styles.viewAllAddressesButton}
              onPress={navigateToAddresses}
            >
              <Text style={styles.viewAllAddressesText}>View All Addresses</Text>
              <Icon name="chevron-forward" size={16} color="#FF1493" />
            </TouchableOpacity>
          </View>
        )}

        {savedAddresses.length === 0 && !useCurrentLocation && (
          <View style={styles.noAddressContainer}>
            <Icon name="location-outline" size={32} color="#FF1493" />
            <Text style={styles.noAddressTitle}>No Saved Addresses</Text>
            <Text style={styles.noAddressSubtitle}>Use live location or add an address</Text>
            <TouchableOpacity 
              style={styles.addAddressButton}
              onPress={navigateToAddresses}
            >
              <Icon name="add" size={16} color="#fff" />
              <Text style={styles.addAddressText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderServiceItem = (item, index) => (
    <View key={item._id} style={styles.orderItem}>
      <Image
        source={{ 
          uri: item.service?.image_url || 'https://via.placeholder.com/50x50?text=Service'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.service?.name || 'Service'}</Text>
        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        
        {allServicesScheduled ? (
          <View style={styles.bookingDetails}>
            <Icon name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.bookingDetailText}>
              {formatDate(item.selectedDate)} at {item.selectedTime}
            </Text>
          </View>
        ) : (
          <View style={styles.scheduleWarning}>
            <Icon name="alert-circle" size={14} color="#FF6B6B" />
            <Text style={styles.scheduleWarningText}>Not scheduled</Text>
          </View>
        )}
        
        {item.professionalName && allServicesScheduled && (
          <Text style={styles.professionalText}>by {item.professionalName}</Text>
        )}
      </View>
      <View style={styles.itemPriceContainer}>
        <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
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
          <Text style={styles.headerTitle}>Service Checkout</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (serviceItems.length === 0) {
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
          <Text style={styles.headerTitle}>Service Checkout</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Icon name="cut-outline" size={80} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No services in cart</Text>
          <Text style={styles.emptySubtitle}>Add services to proceed</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.shopButtonText}>Browse Services</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { subtotal, serviceFee, tax, total } = calculateTotals();

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
        <Text style={styles.headerTitle}>Service Checkout</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Service Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Location</Text>
          {renderServiceLocation()}
        </View>

        {/* Service Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services ({serviceItems.length})</Text>
            {!allServicesScheduled && (
              <TouchableOpacity 
                style={styles.scheduleAllButton}
                onPress={openBookingModal}
              >
                <Icon name="calendar" size={16} color="#fff" />
                <Text style={styles.scheduleAllButtonText}>Schedule All</Text>
              </TouchableOpacity>
            )}
            {allServicesScheduled && (
              <TouchableOpacity 
                style={styles.editScheduleButton}
                onPress={openBookingModal}
              >
                <Icon name="create-outline" size={16} color="#FF1493" />
                <Text style={styles.editScheduleButtonText}>Edit Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
          {serviceItems.map((item, index) => renderServiceItem(item, index))}
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
              <Text style={styles.billLabel}>Service Fee</Text>
              <Text style={styles.billValue}>₹{serviceFee}</Text>
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

      {/* Place Order Button with Summary */}
      <View style={styles.bottomContainer}>
        {allServicesScheduled && selectedAddress && (
          <View style={styles.orderSummaryBox}>
            <View style={styles.summaryRow}>
              <Icon name="location" size={14} color="#666" />
              <Text style={styles.summaryText} numberOfLines={1}>
                {getAddressSummary()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="calendar" size={14} color="#666" />
              <Text style={styles.summaryText}>
                {formatDateForSummary(selectedDate)} at {selectedTime}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="person" size={14} color="#666" />
              <Text style={styles.summaryText} numberOfLines={1}>
                {selectedProfessional?.name || 'Professional'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon 
                name={getPaymentMethodIcon(selectedPaymentMethod)} 
                size={14} 
                color="#666" 
              />
              <Text style={styles.summaryText}>
                {getPaymentMethodLabel(selectedPaymentMethod)}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.totalSummary}>
          <Text style={styles.totalSummaryLabel}>Total: ₹{total}</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.placeOrderButton, 
            (submitting || !selectedAddress || !allServicesScheduled) && styles.disabledButton
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting || !selectedAddress || !allServicesScheduled}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {selectedPaymentMethod === 'wallet' ? 'Pay from Wallet' : 
               selectedPaymentMethod === 'online' ? 'Pay Now' : 
               'Place Service Order'}
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

            {/* Cash on Service Option */}
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
                  Cash on Service
                </Text>
                <Text style={styles.paymentMethodDesc}>
                  Pay when service is completed
                </Text>
              </View>
              {selectedPaymentMethod === 'cod' && (
                <Icon name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schedule All Services</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.scheduleInfoBanner}>
              <Icon name="information-circle" size={20} color="#FF1493" />
              <Text style={styles.scheduleInfoText}>
                This schedule will apply to all {serviceItems.length} service{serviceItems.length > 1 ? 's' : ''} in your cart
              </Text>
            </View>

            {/* Date Selection */}
            <Text style={styles.modalSectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {generateNextDates().map((date, index) => {
                const isSelected = selectedDate && new Date(selectedDate).toDateString() === date.toDateString();
                const isToday = index === 0;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dateCard, isSelected && styles.selectedDateCard]}
                    onPress={() => {
                      setSelectedDate(date);
                      fetchBookedSlots(date);
                    }}
                  >
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                      </View>
                    )}
                    <Text style={[styles.dateDay, isSelected && styles.selectedDateText]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateNumber, isSelected && styles.selectedDateText]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[styles.dateMonth, isSelected && styles.selectedDateText]}>
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time Selection */}
            <Text style={styles.modalSectionTitle}>Select Time</Text>
            {loadingSlots && (
              <View style={styles.loadingSlotsContainer}>
                <ActivityIndicator size="small" color="#FF1493" />
                <Text style={styles.loadingSlotsText}>Checking availability...</Text>
              </View>
            )}
            <View style={styles.timeGrid}>
              {generateTimeSlots().map((timeSlot, index) => {
                const isSelected = selectedTime === timeSlot;
                const isBooked = isSlotBooked(timeSlot);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot, 
                      isSelected && styles.selectedTimeSlot,
                      isBooked && styles.bookedTimeSlot
                    ]}
                    onPress={() => !isBooked && setSelectedTime(timeSlot)}
                    disabled={isBooked}
                  >
                    <Text style={[
                      styles.timeText, 
                      isSelected && styles.selectedTimeText,
                      isBooked && styles.bookedTimeText
                    ]}>
                      {timeSlot}
                    </Text>
                    {isBooked && (
                      <View style={styles.bookedIndicator}>
                        <Icon name="close-circle" size={12} color="#EF4444" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Professional Selection */}
            <Text style={styles.modalSectionTitle}>Select Professional</Text>
            
            {/* Auto-assign option */}
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.professionalCard, 
                  styles.autoAssignCard,
                  selectedProfessional?.id === 'auto' && styles.selectedProfessionalCard
                ]}
                onPress={() => setSelectedProfessional({ 
                  id: 'auto', 
                  name: 'Auto-assigned Professional' 
                })}
              >
                <View style={styles.autoAssignIconContainer}>
                  <Animated.View
                    style={[
                      styles.shimmerEffect,
                      {
                        opacity: shimmerAnim,
                      },
                    ]}
                  />
                  <Icon name="shuffle" size={32} color="#FF1493" />
                </View>
                <View style={styles.professionalInfo}>
                  <Text style={styles.professionalName}>Auto-Assign (Recommended)</Text>
                  <View style={styles.autoAssignSubContainer}>
                    <Text style={styles.autoAssignEmoji}>✨</Text>
                    <Text style={styles.professionalRole}>
                      We'll assign our best professional for your service
                    </Text>
                  </View>
                </View>
                {selectedProfessional?.id === 'auto' && (
                  <Icon name="checkmark-circle" size={24} color="#FF1493" />
                )}
              </TouchableOpacity>
            </Animated.View>

            {relevantProfessionals.length === 0 && previousProfessionals.length === 0 && (
              <View style={styles.noProfessionalsContainer}>
                <Icon name="people-outline" size={48} color="#CCC" />
                <Text style={styles.noProfessionalsText}>
                  No professionals available for manual selection
                </Text>
                <Text style={styles.noProfessionalsSubtext}>
                  Don't worry! Auto-assign will find the perfect professional for you
                </Text>
              </View>
            )}

            {previousProfessionals.length > 0 && (
              <>
                <Text style={styles.professionalSubtitle}>Previously Booked</Text>
                {previousProfessionals.map((prof, index) => {
                  const isRelevant = relevantProfessionals.some(rp => rp._id === prof.id);
                  if (!isRelevant) return null;
                  
                  const isSelected = selectedProfessional?.id === prof.id;
                  return (
                    <TouchableOpacity
                      key={`prev-${index}`}
                      style={[styles.professionalCard, isSelected && styles.selectedProfessionalCard]}
                      onPress={() => setSelectedProfessional(prof)}
                    >
                      <Icon name="person-circle" size={40} color={isSelected ? "#FF1493" : "#999"} />
                      <View style={styles.professionalInfo}>
                        <Text style={[styles.professionalName, isSelected && styles.selectedProfessionalText]}>
                          {prof.name}
                        </Text>
                        <View style={styles.previousBadge}>
                          <Icon name="time" size={12} color="#10B981" />
                          <Text style={styles.previousBadgeText}>Previously booked</Text>
                        </View>
                      </View>
                      {isSelected && <Icon name="checkmark-circle" size={24} color="#FF1493" />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {relevantProfessionals.length > 0 && (
              <>
                <Text style={styles.professionalSubtitle}>
                  Available Professionals
                </Text>
                {relevantProfessionals.map((prof, index) => {
                  const isSelected = selectedProfessional?.id === prof._id;
                  const isPrevious = previousProfessionals.some(p => p.id === prof._id);
                  if (isPrevious) return null;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.professionalCard, isSelected && styles.selectedProfessionalCard]}
                      onPress={() => setSelectedProfessional({ id: prof._id, name: prof.name })}
                    >
                      <Icon name="person-circle" size={40} color={isSelected ? "#FF1493" : "#999"} />
                      <View style={styles.professionalInfo}>
                        <Text style={[styles.professionalName, isSelected && styles.selectedProfessionalText]}>
                          {prof.name}
                        </Text>
                        {prof.specializations && prof.specializations.length > 0 && (
                          <View style={styles.specializationsContainer}>
                            {prof.specializations.slice(0, 2).map((spec, idx) => (
                              <View key={idx} style={styles.specializationBadge}>
                                <Text style={styles.specializationText}>{spec}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {prof.rating > 0 && (
                          <View style={styles.ratingContainer}>
                            <Icon name="star" size={12} color="#FFB800" />
                            <Text style={styles.ratingText}>{prof.rating.toFixed(1)}</Text>
                            {prof.totalBookings > 0 && (
                              <Text style={styles.bookingsText}>({prof.totalBookings} bookings)</Text>
                            )}
                          </View>
                        )}
                      </View>
                      {isSelected && <Icon name="checkmark-circle" size={24} color="#FF1493" />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedDate || !selectedTime || !selectedProfessional) && styles.disabledButton
              ]}
              onPress={saveBookingDetails}
              disabled={!selectedDate || !selectedTime || !selectedProfessional}
            >
              <Text style={styles.saveButtonText}>
                Schedule {serviceItems.length} Service{serviceItems.length > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Map Location Picker Modal */}
      <MapLocationPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={currentLocation}
        title="Select Service Location"
      />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scheduleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1493',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scheduleAllButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  editScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  editScheduleButtonText: {
    color: '#FF1493',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
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
  liveLocationSection: {
    marginBottom: 16,
  },
  liveLocationCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  liveLocationCardActive: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  liveLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 12,
  },
  liveLocationTitleActive: {
    color: '#FF1493',
  },
  locationLoader: {
    marginTop: 12,
  },
  currentAddressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFF5F8',
  },
  mapPickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF1493',
    marginLeft: 8,
  },
  savedAddressesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  savedAddressesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  viewAllAddressesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 8,
    marginTop: 12,
  },
  viewAllAddressesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF1493',
    marginRight: 6,
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
  bookingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingDetailText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  scheduleWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  scheduleWarningText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '600',
  },
  professionalText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
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
    height: 120,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderSummaryBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  totalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalSummaryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF1493',
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
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
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
  },
  scheduleInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  scheduleInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#FF1493',
    marginLeft: 12,
    lineHeight: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
  },
  dateScroll: {
    marginBottom: 16,
  },
  dateCard: {
    width: 80,
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    position: 'relative',
  },
  selectedDateCard: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  todayBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  dateDay: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  dateMonth: {
    fontSize: 12,
    color: '#666',
  },
  selectedDateText: {
    color: '#FF1493',
  },
  loadingSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF5F8',
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingSlotsText: {
    fontSize: 14,
    color: '#FF1493',
    marginLeft: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedTimeSlot: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  bookedTimeSlot: {
    borderColor: '#FFE5E5',
    backgroundColor: '#FFF0F0',
    opacity: 0.6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedTimeText: {
    color: '#FF1493',
  },
  bookedTimeText: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  bookedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  autoAssignCard: {
    borderWidth: 2,
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
    marginBottom: 16,
  },
  autoAssignIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE5F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
  },
  autoAssignSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  autoAssignEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  selectedProfessionalCard: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5F8',
  },
  professionalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  professionalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  selectedProfessionalText: {
    color: '#FF1493',
  },
  professionalRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  previousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  previousBadgeText: {
    fontSize: 11,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  specializationBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  specializationText: {
    fontSize: 11,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB800',
    marginLeft: 4,
  },
  bookingsText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  professionalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
  },
  noProfessionalsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  noProfessionalsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  noProfessionalsSubtext: {
    fontSize: 13,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CheckoutService;