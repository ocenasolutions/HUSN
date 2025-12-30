// src/Pages/Booking/CheckoutScreen.js
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
import * as Location from 'expo-location';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import MapLocationPicker from '../../components/MapLocationPicker';

const CheckoutScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [serviceItems, setServiceItems] = useState([]);
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);
  const [relevantProfessionals, setRelevantProfessionals] = useState([]);
  const [previousProfessionals, setPreviousProfessionals] = useState([]);
  
  // Address and Payment States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  
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

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchCheckoutData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const [servicesResponse, productsResponse, addressesResponse, previousBookingsResponse] = await Promise.all([
        fetch(`${API_URL}/cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/product-cart`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/addresses`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/orders/my-orders?type=service`, { headers: getAuthHeaders() })
      ]);

      const servicesData = await servicesResponse.json();
      const productsData = await productsResponse.json();
      const addressesData = await addressesResponse.json();
      const previousBookingsData = await previousBookingsResponse.json();

      if (servicesData.success) {
        const items = servicesData.data.items || [];
        setServiceItems(items);
        
        if (items.length > 0) {
          await fetchRelevantProfessionals(items);
        }
      }

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

  // Live Location Functions
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
        
        // Create a temporary address object from live location
        const liveAddress = {
          _id: 'live-location',
          fullName: user?.name || 'User',
          phoneNumber: user?.phoneNumber || '',
          address: addressString,
          city: addr.city || '',
          state: addr.region || '',
          pincode: addr.postalCode || '',
          addressType: 'Current Location',
          isLiveLocation: true,
          coordinates: { latitude, longitude }
        };
        
        setSelectedAddress(liveAddress);
        setUseCurrentLocation(true);
      }

      setGettingLocation(false);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('Error', 'Failed to get current location');
      setGettingLocation(false);
    }
  };

  const handleLocationSelect = (selectedLocation) => {
    setCurrentLocation({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    });
    setCurrentAddress(selectedLocation.address);
    
    // Create address from map selection
    const mapAddress = {
      _id: 'map-location',
      fullName: user?.name || 'User',
      phoneNumber: user?.phoneNumber || '',
      address: selectedLocation.address,
      city: selectedLocation.city || '',
      state: selectedLocation.state || '',
      pincode: selectedLocation.pincode || '',
      addressType: 'Selected Location',
      isLiveLocation: true,
      coordinates: { 
        latitude: selectedLocation.latitude, 
        longitude: selectedLocation.longitude 
      }
    };
    
    setSelectedAddress(mapAddress);
    setUseCurrentLocation(true);
  };

  const openMapPicker = () => {
    setShowMapPicker(true);
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
    const productsSubtotal = productItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const servicesSubtotal = serviceItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const subtotal = productsSubtotal + servicesSubtotal;
    const deliveryFee = productItems.length > 0 ? 50 : 0;
    const serviceFee = serviceItems.length > 0 ? 25 : 0;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + deliveryFee + serviceFee + tax;

    return { subtotal, deliveryFee, serviceFee, tax, total };
  };

  const openBookingModal = (serviceItem) => {
    setSelectedServiceForBooking(serviceItem);
    setSelectedDate(serviceItem.selectedDate || null);
    setSelectedTime(serviceItem.selectedTime || null);
    setSelectedProfessional(serviceItem.professionalId ? {
      id: serviceItem.professionalId,
      name: serviceItem.professionalName
    } : null);
    setShowBookingModal(true);
  };

  const saveBookingDetails = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessional) {
      Alert.alert('Missing Details', 'Please select date, time, and professional');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cart/${selectedServiceForBooking._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          selectedDate,
          selectedTime,
          professionalId: selectedProfessional.id,
          professionalName: selectedProfessional.name
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setServiceItems(prevItems =>
          prevItems.map(item =>
            item._id === selectedServiceForBooking._id
              ? { ...item, selectedDate, selectedTime, professionalId: selectedProfessional.id, professionalName: selectedProfessional.name }
              : item
          )
        );
        setShowBookingModal(false);
        Alert.alert('Success', 'Booking details saved');
      } else {
        Alert.alert('Error', data.message || 'Failed to save booking details');
      }
    } catch (error) {
      console.error('Save booking error:', error);
      Alert.alert('Error', 'Failed to save booking details');
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
        description: 'Order Payment',
        image: 'https://your-app-logo-url.com/logo.png',
        currency: 'INR',
        key: paymentOrderData.data.keyId,
        amount: paymentOrderData.data.amount,
        order_id: paymentOrderData.data.orderId,
        name: 'HUSN',
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

    const incompleteServices = serviceItems.filter(item => 
      !item.selectedDate || !item.selectedTime || !item.professionalId
    );

    if (incompleteServices.length > 0) {
      Alert.alert(
        'Booking Required',
        'Please schedule all services before placing order',
        [{ text: 'OK' }]
      );
      return;
    }

    if (serviceItems.length === 0 && productItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    try {
      setSubmitting(true);
      const { total } = calculateTotals();

      const mappedProductItems = productItems.map(item => ({
        productId: item.product?.id || item.product?._id || item.product,
        quantity: item.quantity || 1,
        price: item.price || 0
      }));

      const mappedServiceItems = serviceItems.map(item => ({
        serviceId: item.service?._id || item.serviceId,
        quantity: item.quantity || 1,
        price: item.price || 0,
        selectedDate: item.selectedDate,
        selectedTime: item.selectedTime,
        professionalId: item.professionalId,
        professionalName: item.professionalName
      }));

      // Build address object - include coordinates if live location
      const mappedAddress = {
        type: selectedAddress.addressType || selectedAddress.type || 'Home',
        street: selectedAddress.address || selectedAddress.street || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        zipCode: selectedAddress.pincode || selectedAddress.zipCode || '',
        ...(selectedAddress.isLiveLocation && selectedAddress.coordinates && {
          coordinates: {
            latitude: selectedAddress.coordinates.latitude,
            longitude: selectedAddress.coordinates.longitude
          }
        })
      };

      const orderData = {
        address: mappedAddress,
        paymentMethod: selectedPaymentMethod,
        serviceItems: mappedServiceItems,
        productItems: mappedProductItems,
        totalAmount: total,
        type: productItems.length > 0 ? 'product' : 'service',
        status: 'placed'
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        if (selectedPaymentMethod === 'online') {
          try {
            const paymentResult = await initiateRazorpayPayment(data.data, total);
            
            if (!paymentResult.success) {
              Alert.alert('Payment Failed', 'Your order was created but payment failed. Please contact support.');
              return;
            }
          } catch (paymentError) {
            Alert.alert('Payment Error', paymentError.message);
            return;
          }
        }

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour}:00`);
      if (hour < 18) slots.push(`${hour}:30`);
    }
    return slots;
  };

  const generateNextDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
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

  const renderDeliveryAddress = () => {
    // Show live location option for services
    if (serviceItems.length > 0) {
      return (
        <View>
          {/* Live Location Option */}
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
              onPress={openMapPicker}
            >
              <Icon name="map" size={20} color="#FF1493" />
              <Text style={styles.mapPickerButtonText}>Pick from Map</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Addresses */}
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
    }

    // Regular address selection for products
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

  const renderServiceItem = (item) => (
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
        
        {item.selectedDate && item.selectedTime ? (
          <View style={styles.bookingDetails}>
            <Icon name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.bookingDetailText}>
              {formatDate(item.selectedDate)} at {item.selectedTime}
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={() => openBookingModal(item)}
          >
            <Icon name="calendar-outline" size={14} color="#FF1493" />
            <Text style={styles.scheduleButtonText}>Schedule Now</Text>
          </TouchableOpacity>
        )}
        
        {item.professionalName && (
          <Text style={styles.professionalText}>by {item.professionalName}</Text>
        )}
      </View>
      <View style={styles.itemPriceContainer}>
        <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
        {(item.selectedDate && item.selectedTime && item.professionalName) && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => openBookingModal(item)}
          >
            <Icon name="create-outline" size={16} color="#FF1493" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (serviceItems.length === 0 && productItems.length === 0) {
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
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Icon name="cart-outline" size={80} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to your cart to proceed</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {serviceItems.length > 0 ? 'Service Location' : 'Delivery Address'}
          </Text>
          {renderDeliveryAddress()}
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          {/* Service Items */}
          {serviceItems.length > 0 && (
            <View style={styles.itemsGroup}>
              <Text style={styles.itemsGroupTitle}>Services ({serviceItems.length})</Text>
              {serviceItems.map(renderServiceItem)}
            </View>
          )}

          {/* Product Items */}
          {productItems.length > 0 && (
            <View style={styles.itemsGroup}>
              <Text style={styles.itemsGroupTitle}>Products ({productItems.length})</Text>
              {productItems.map(renderProductItem)}
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
              {selectedPaymentMethod === 'online' ? 'Pay Now' : 'Place Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
                <Text style={styles.paymentMethodDesc}>Pay securely with Razorpay</Text>
              </View>
              {selectedPaymentMethod === 'online' && (
                <Icon name="checkmark-circle" size={20} color="#FF1493" />
              )}
            </TouchableOpacity>
          </View>
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
            <Text style={styles.modalTitle}>Schedule Service</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Date Selection */}
            <Text style={styles.modalSectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {generateNextDates().map((date, index) => {
                const isSelected = selectedDate && new Date(selectedDate).toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dateCard, isSelected && styles.selectedDateCard]}
                    onPress={() => setSelectedDate(date)}
                  >
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
            <View style={styles.timeGrid}>
              {generateTimeSlots().map((time, index) => {
                const isSelected = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.timeSlot, isSelected && styles.selectedTimeSlot]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeText, isSelected && styles.selectedTimeText]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Professional Selection */}
            <Text style={styles.modalSectionTitle}>Select Professional</Text>
            
            {relevantProfessionals.length === 0 && previousProfessionals.length === 0 && (
              <View style={styles.noProfessionalsContainer}>
                <Icon name="people-outline" size={48} color="#CCC" />
                <Text style={styles.noProfessionalsText}>
                  No professionals available for this service category
                </Text>
                <Text style={styles.noProfessionalsSubtext}>
                  We'll auto-assign the best available professional
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
                  Available Professionals for this Service
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
              <Icon name="shuffle" size={40} color="#FF1493" />
              <View style={styles.professionalInfo}>
                <Text style={styles.professionalName}>Auto-Assign</Text>
                <Text style={styles.professionalRole}>
                  We'll assign the best available professional
                </Text>
              </View>
              {selectedProfessional?.id === 'auto' && (
                <Icon name="checkmark-circle" size={24} color="#FF1493" />
              )}
            </TouchableOpacity>
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
              <Text style={styles.saveButtonText}>Save Booking Details</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  // Live Location Styles
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
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  scheduleButtonText: {
    fontSize: 12,
    color: '#FF1493',
    fontWeight: '500',
    marginLeft: 4,
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
  editButton: {
    marginTop: 8,
    padding: 4,
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
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
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
  fontWeight: '600',
  color: '#000',
  marginBottom: 4,
},
paymentMethodDesc: {
  fontSize: 13,
  color: '#666',
},
modalSectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#000',
  marginTop: 20,
  marginBottom: 12,
},
dateScroll: {
  marginBottom: 20,
},
dateCard: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginRight: 12,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
  minWidth: 70,
},
selectedDateCard: {
  borderColor: '#FF1493',
  backgroundColor: '#FFF5F8',
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
  fontSize: 11,
  color: '#666',
},
selectedDateText: {
  color: '#FF1493',
},
timeGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginBottom: 20,
},
timeSlot: {
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 8,
  marginRight: 8,
  marginBottom: 8,
  backgroundColor: '#FFFFFF',
},
selectedTimeSlot: {
  borderColor: '#FF1493',
  backgroundColor: '#FFF5F8',
},
timeText: {
  fontSize: 14,
  color: '#666',
  fontWeight: '500',
},
selectedTimeText: {
  color: '#FF1493',
  fontWeight: '600',
},
noProfessionalsContainer: {
  alignItems: 'center',
  paddingVertical: 40,
  paddingHorizontal: 20,
},
noProfessionalsText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#666',
  textAlign: 'center',
  marginTop: 16,
  marginBottom: 8,
},
noProfessionalsSubtext: {
  fontSize: 14,
  color: '#999',
  textAlign: 'center',
},
professionalSubtitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#666',
  marginBottom: 12,
  marginTop: 8,
},
professionalCard: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 12,
  marginBottom: 12,
  backgroundColor: '#FFFFFF',
},
selectedProfessionalCard: {
  borderColor: '#FF1493',
  backgroundColor: '#FFF5F8',
},
autoAssignCard: {
  borderStyle: 'dashed',
  borderWidth: 2,
  borderColor: '#FF1493',
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
  marginTop: 6,
},
specializationBadge: {
  backgroundColor: '#F3E8FF',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
  marginRight: 6,
  marginBottom: 4,
},
specializationText: {
  fontSize: 11,
  color: '#9333EA',
  fontWeight: '500',
},
ratingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
},
ratingText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#000',
  marginLeft: 4,
},
bookingsText: {
  fontSize: 11,
  color: '#666',
  marginLeft: 4,
},
modalFooter: {
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
},
saveButton: {
  backgroundColor: '#FF1493',
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
saveButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
});

export default CheckoutScreen;