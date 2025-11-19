// src/Pages/Orders/TrackServiceScreen.js - WITH LIVE LOCATION TRACKING
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Linking,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL, SOCKET_URL } from '../../API/config';
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';

const TrackServiceScreen = ({ route, navigation }) => {
  const { orderId, orderNumber, orderType } = route.params;
  const { user, tokens } = useAuth();
  
  // State variables
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [reviewedProfessionals, setReviewedProfessionals] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [eta, setEta] = useState(null);
  const [professionalEnRoute, setProfessionalEnRoute] = useState(false);
  
  // 🆕 NEW: Live location tracking states
  const [professionalLocation, setProfessionalLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [updatedEta, setUpdatedEta] = useState(null);
  
  // Refs
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // 🆕 NEW: Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // 🆕 NEW: Calculate ETA based on distance
  const calculateETA = (distanceKm) => {
    const avgSpeedKmPerHour = 20; // Average city speed
    const timeInMinutes = (distanceKm / avgSpeedKmPerHour) * 60;
    
    const roundedTime = Math.ceil(timeInMinutes / 5) * 5;
    const minETA = roundedTime;
    const maxETA = roundedTime + 10;
    
    if (maxETA <= 20) return { min: 15, max: 20, text: '15-20 minutes' };
    if (maxETA <= 30) return { min: 20, max: 30, text: '20-30 minutes' };
    if (maxETA <= 40) return { min: 30, max: 40, text: '30-40 minutes' };
    if (maxETA <= 50) return { min: 40, max: 50, text: '40-50 minutes' };
    return { min: 50, max: 60, text: '50-60 minutes' };
  };

  const fetchRoute = async (fromLat, fromLng, toLat, toLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url, { timeout: 10000 });
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        const coordinates = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));

        setRouteCoordinates(coordinates);
        
        const distance = (route.distance / 1000).toFixed(2);
        const duration = Math.round(route.duration / 60);
        
        setCurrentDistance(distance);
        setUpdatedEta(calculateETA(parseFloat(distance)));

        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Route fetch error:', error);
      return false;
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = tokens?.accessToken || user?.token;
    
    if (!token || !orderId) {
      console.log('❌ No token or orderId for socket');
      return;
    }

    console.log('🔌 Connecting to socket for order tracking...');
    
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected for tracking');
      socketRef.current.emit('join-order', orderId);
    });

    // 🆕 ENHANCED: Journey started with ETA
    socketRef.current.on('professional-journey-started', (data) => {
      console.log('🚗 Professional journey started:', data);
      
      if (data.orderId === orderId) {
        setEta(data.eta || { text: '20-30 minutes' });
        setCurrentDistance(data.distance);
        setProfessionalEnRoute(true);
        
        // Set professional location
        if (data.professionalLocation) {
          setProfessionalLocation({
            latitude: data.professionalLocation.latitude,
            longitude: data.professionalLocation.longitude
          });
        }
        
        Alert.alert(
          '🚗 Professional is on the way!',
          `Your professional will arrive in ${data.eta.text}${data.distance ? `\n\nDistance: ${data.distance} km` : ''}`,
          [{ text: 'OK', onPress: () => setShowMap(true) }]
        );
        
        fetchOrderDetails();
      }
    });

    // 🆕 NEW: Real-time professional location updates
    socketRef.current.on('professional-location-updated', (data) => {
      console.log('📍 Professional location updated:', data);
      
      if (data.orderId === orderId) {
        const newProfLocation = {
          latitude: data.latitude,
          longitude: data.longitude
        };
        setProfessionalLocation(newProfLocation);
        
        // Recalculate distance and ETA if we have user location
        if (userLocation) {
          const distance = calculateDistance(
            data.latitude,
            data.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          
          setCurrentDistance(distance.toFixed(2));
          setUpdatedEta(calculateETA(distance));
          
          // Fetch updated route
          fetchRoute(
            data.latitude,
            data.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
        }
      }
    });

    // Service started event
    socketRef.current.on('service-started', (data) => {
      console.log('✅ Service started:', data);
      
      if (data.orderId === orderId) {
        fetchOrderDetails();
        setProfessionalEnRoute(false);
        setEta(null);
        setShowMap(false);
        
        Alert.alert(
          '✅ Service Started!',
          'Your service is now in progress',
          [{ text: 'OK' }]
        );
      }
    });

    // Service completed event
    socketRef.current.on('service-completed', (data) => {
      console.log('🎉 Service completed:', data);
      
      if (data.orderId === orderId) {
        fetchOrderDetails();
        
        Alert.alert(
          '🎉 Service Completed!',
          'Your service has been completed successfully',
          [{ text: 'OK' }]
        );
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-order', orderId);
        socketRef.current.disconnect();
      }
    };
  }, [orderId, tokens, user]);

  // Fetch order details and reviews
  useEffect(() => {
    fetchOrderDetails();
    fetchUserReviews();
    
    const interval = setInterval(fetchOrderDetails, 10000);
    
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      clearInterval(interval);
      pulseAnimation.stop();
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('📦 Order fetched:', {
          orderNumber: data.data.orderNumber,
          status: data.data.status,
          hasOtp: !!data.data.serviceOtp,
        });
        setOrder(data.data);
        
        // 🆕 Set user location from order address
        if (data.data.address?.latitude && data.data.address?.longitude) {
          const userLoc = {
            latitude: data.data.address.latitude,
            longitude: data.data.address.longitude
          };
          setUserLocation(userLoc);
        }
        
        // 🆕 Set professional location if available
        if (data.data.professionalLiveLocation?.coordinates) {
          const coords = data.data.professionalLiveLocation.coordinates;
          setProfessionalLocation({
            latitude: coords[1],
            longitude: coords[0]
          });
        }
        
        // Check if professional is en route
        if (data.data.isLiveLocationActive && 
            data.data.status === 'confirmed') {
          setProfessionalEnRoute(true);
          
          // Calculate route if we have both locations
          if (professionalLocation && userLocation) {
            fetchRoute(
              professionalLocation.latitude,
              professionalLocation.longitude,
              userLocation.latitude,
              userLocation.longitude
            );
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const response = await fetch(`${API_URL}/reviews/my-reviews?type=professional&limit=100`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const professionalIds = new Set(
          data.data.reviews
            .filter(r => r.professionalId)
            .map(r => {
              const orderId = r.order?._id || r.order;
              const profId = r.professionalId?._id || r.professionalId;
              return `${orderId}-${profId}`;
            })
        );
        setReviewedProfessionals(professionalIds);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    await fetchUserReviews();
    setRefreshing(false);
  };

  const isProfessionalReviewed = (orderId, professionalId) => {
    return reviewedProfessionals.has(`${orderId}-${professionalId}`);
  };

  const handleRateProfessional = (serviceItem) => {
    const serviceId = serviceItem.serviceId?._id || serviceItem.serviceId;
    const professionalId = serviceItem.professionalId?._id || serviceItem.professionalId;
    const professionalName = serviceItem.professionalName || serviceItem.professionalId?.name || 'Professional';
    const serviceName = serviceItem.serviceId?.name || 'Service';

    if (!professionalId) {
      Alert.alert('Error', 'Professional information not available');
      return;
    }

    const item = {
      itemId: serviceId,
      professionalId: professionalId,
      type: 'professional',
      name: professionalName,
      serviceName: serviceName,
      image: serviceItem.professionalId?.profilePicture || null,
      price: serviceItem.price,
      quantity: serviceItem.quantity,
      reviewed: false
    };

    navigation.navigate('WriteReviewScreen', {
      orderId: order._id,
      item: item,
    });
  };

  const handleRateService = () => {
    navigation.navigate('ReviewableItemsScreen', { 
      orderId: order._id
    });
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    const colors = {
      placed: '#FF9F43',
      pending: '#F39C12',
      confirmed: '#27AE60',
      preparing: '#3498DB',
      shipped: '#3498DB',
      in_progress: '#3498DB',
      out_for_delivery: '#9B59B6',
      completed: '#8E44AD',
      delivered: '#2ECC71',
      cancelled: '#95A5A6',
      rejected: '#E74C3C',
    };
    return colors[statusLower] || '#7F8C8D';
  };

  const getStatusMessage = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'placed':
      case 'pending':
        return 'Your service request is being processed';
      case 'confirmed':
        return professionalEnRoute ? 'Professional is on the way!' : 'Professional confirmed, will arrive soon';
      case 'in_progress':
      case 'out_for_delivery':
        return 'Service is currently in progress';
      case 'completed':
      case 'delivered':
        return 'Service has been completed successfully';
      case 'cancelled':
        return 'Service has been cancelled';
      case 'rejected':
        return 'Service has been rejected';
      default:
        return 'Processing your request';
    }
  };

  const getEstimatedArrivalTime = (status) => {
    const statusLower = status?.toLowerCase();
    
    // 🆕 Use updated ETA if available
    if (updatedEta && professionalEnRoute) {
      return updatedEta.text;
    }
    
    if (eta && professionalEnRoute) {
      return eta.text;
    }
    
    switch (statusLower) {
      case 'placed':
      case 'pending':
        return 'Waiting for confirmation';
      case 'confirmed':
        return '15-20 minutes';
      case 'in_progress':
      case 'out_for_delivery':
        return 'Service in progress';
      case 'completed':
      case 'delivered':
        return 'Service completed';
      case 'cancelled':
      case 'rejected':
        return 'Service cancelled';
      default:
        return 'Processing your request';
    }
  };

  const isOrderCompleted = () => {
    const statusLower = order?.status?.toLowerCase();
    return ['completed', 'delivered'].includes(statusLower);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCallProfessional = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Info', 'Professional contact not available yet');
    }
  };

  // 🆕 NEW: Render live tracking map
  const renderLiveTrackingMap = () => {
    if (!showMap || !professionalLocation || !userLocation) return null;

    const initialRegion = {
      latitude: (professionalLocation.latitude + userLocation.latitude) / 2,
      longitude: (professionalLocation.longitude + userLocation.longitude) / 2,
      latitudeDelta: Math.abs(professionalLocation.latitude - userLocation.latitude) * 2 || 0.05,
      longitudeDelta: Math.abs(professionalLocation.longitude - userLocation.longitude) * 2 || 0.05
    };

    return (
      <View style={styles.mapSection}>
        <View style={styles.mapHeader}>
          <Icon name="navigate" size={20} color="#FF6B9D" />
          <Text style={styles.mapTitle}>Live Tracking</Text>
          <TouchableOpacity onPress={() => setShowMap(false)}>
            <Icon name="close-circle" size={24} color="#999" />
          </TouchableOpacity>
        </View>
        
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
        >
          {/* Professional Location Marker */}
          <Marker
            coordinate={professionalLocation}
            title="Professional"
            description="On the way to you"
          >
            <View style={styles.professionalMarker}>
              <Icon name="person" size={24} color="#FFF" />
            </View>
          </Marker>

          {/* User Location Marker */}
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description={order?.address?.street}
          >
            <View style={styles.userMarker}>
              <Icon name="home" size={24} color="#FFF" />
            </View>
          </Marker>

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#FF6B9D"
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        {/* Distance & ETA Info */}
        {currentDistance && updatedEta && (
          <View style={styles.mapInfoOverlay}>
            <View style={styles.mapInfoCard}>
              <View style={styles.mapInfoRow}>
                <Icon name="navigate" size={16} color="#FF6B9D" />
                <Text style={styles.mapInfoLabel}>Distance:</Text>
                <Text style={styles.mapInfoValue}>{currentDistance} km</Text>
              </View>
              <View style={styles.mapInfoRow}>
                <Icon name="time" size={16} color="#FF6B9D" />
                <Text style={styles.mapInfoLabel}>ETA:</Text>
                <Text style={styles.mapInfoValue}>{updatedEta.text}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderStatusTimeline = () => {
    const statuses = [
      { key: 'pending', label: 'Requested', icon: 'time-outline' },
      { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
      { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
      { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle' },
    ];

    const currentStatusLower = order?.status?.toLowerCase();
    
    let mappedStatus = currentStatusLower;
    if (['placed', 'pending'].includes(currentStatusLower)) {
      mappedStatus = 'pending';
    } else if (['in_progress', 'out_for_delivery'].includes(currentStatusLower)) {
      mappedStatus = 'in_progress';
    } else if (['completed', 'delivered'].includes(currentStatusLower)) {
      mappedStatus = 'completed';
    }

    const currentStatusIndex = statuses.findIndex(s => s.key === mappedStatus);

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Service Progress</Text>
        {statuses.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          
          return (
            <View key={status.key} style={styles.timelineItem}>
              <View style={styles.timelineLeftSection}>
                <Animated.View
                  style={[
                    styles.timelineIconContainer,
                    {
                      backgroundColor: isCompleted ? getStatusColor(status.key) : '#E0E0E0',
                      transform: isCurrent ? [{ scale: pulseAnim }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  <Icon
                    name={status.icon}
                    size={20}
                    color={isCompleted ? '#fff' : '#95A5A6'}
                  />
                </Animated.View>
                {index < statuses.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: isCompleted ? getStatusColor(order.status) : '#E0E0E0' },
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    { 
                      color: isCompleted ? '#2C3E50' : '#95A5A6',
                      fontWeight: isCurrent ? 'bold' : '600'
                    },
                  ]}
                >
                  {status.label}
                </Text>
                {isCurrent && (
                  <Text style={styles.timelineTime}>
                    {formatTime(order.updatedAt)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderServiceProfessional = () => {
    const serviceItem = order?.serviceItems?.[0];
    if (!serviceItem?.professionalId || !serviceItem?.professionalName) {
      return null;
    }

    const isCompleted = isOrderCompleted();
    const professionalId = serviceItem.professionalId?._id || serviceItem.professionalId;
    const reviewed = isProfessionalReviewed(order._id, professionalId);

    return (
      <View style={styles.professionalSection}>
        <Text style={styles.sectionTitle}>Your Service Professional</Text>
        <View style={styles.professionalCard}>
          <View style={styles.professionalAvatar}>
            <Icon name="person" size={32} color="#FF6B9D" />
          </View>
          <View style={styles.professionalInfo}>
            <Text style={styles.professionalName}>{serviceItem.professionalName}</Text>
            <View style={styles.professionalBadges}>
              <View style={styles.verifiedBadge}>
                <Icon name="shield-checkmark" size={12} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified Professional</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Icon name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>4.8</Text>
              </View>
            </View>
          </View>
          {!isCompleted && serviceItem.professionalPhone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallProfessional(serviceItem.professionalPhone)}
            >
              <Icon name="call" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Individual Professional Rating */}
        {isCompleted && !reviewed && (
          <TouchableOpacity
            style={styles.rateProfessionalButton}
            onPress={() => handleRateProfessional(serviceItem)}
          >
            <Icon name="star-outline" size={18} color="#FFD700" />
            <Text style={styles.rateProfessionalText}>Rate {serviceItem.professionalName}</Text>
          </TouchableOpacity>
        )}

        {isCompleted && reviewed && (
          <View style={styles.reviewedBanner}>
            <Icon name="checkmark-circle" size={18} color="#2ECC71" />
            <Text style={styles.reviewedText}>Professional Reviewed ✓</Text>
          </View>
        )}

        {/* 🆕 ENHANCED: ETA Banner with live updates */}
        {professionalEnRoute && (updatedEta || eta) && (
          <Animated.View 
            style={[styles.etaBanner, { transform: [{ scale: pulseAnim }] }]}
          >
            <Icon name="car-sport" size={28} color="#FF6B9D" />
            <View style={styles.etaInfo}>
              <Text style={styles.etaLabel}>Professional is on the way!</Text>
              <Text style={styles.etaTime}>
                Arriving in {updatedEta?.text || eta?.text || '20-30 minutes'}
              </Text>
              {currentDistance && (
                <Text style={styles.etaDistance}>Distance: {currentDistance} km</Text>
              )}
              <TouchableOpacity 
                style={styles.viewMapButton}
                onPress={() => setShowMap(!showMap)}
              >
                <Icon name="map" size={14} color="#FF6B9D" />
                <Text style={styles.viewMapText}>
                  {showMap ? 'Hide Map' : 'View Live Map'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {order.status === 'confirmed' && !professionalEnRoute && (
          <View style={styles.arrivalBanner}>
            <Icon name="time-outline" size={24} color="#27AE60" />
            <View style={styles.arrivalInfo}>
              <Text style={styles.arrivalLabel}>Estimated Arrival</Text>
              <Text style={styles.arrivalTime}>{getEstimatedArrivalTime(order.status)}</Text>
            </View>
          </View>
        )}

        {['in_progress', 'out_for_delivery'].includes(order.status?.toLowerCase()) && !professionalEnRoute && (
          <View style={styles.progressBanner}>
            <Icon name="construct" size={24} color="#3498DB" />
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Service In Progress</Text>
              <Text style={styles.progressText}>The professional is working on your service</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderOtpSection = () => {
    const showOtpStatuses = ['pending', 'confirmed', 'in_progress', 'out_for_delivery'];
    const shouldShowOtp = showOtpStatuses.includes(order?.status?.toLowerCase());
    
    if (!shouldShowOtp || !order?.serviceOtp) return null;

    const isServiceStarted = ['in_progress', 'out_for_delivery'].includes(order?.status?.toLowerCase());

    return (
      <View style={styles.otpSection}>
        <View style={styles.otpHeader}>
          <Icon name="shield-checkmark" size={24} color="#FF6B9D" />
          <Text style={styles.otpHeaderText}>Service OTP</Text>
        </View>
        <View style={styles.otpBox}>
          <Text style={styles.otpCode}>{order.serviceOtp}</Text>
        </View>
        <View style={styles.otpInstructions}>
          <Icon name="information-circle-outline" size={18} color="#7F8C8D" />
          <Text style={styles.otpInstructionsText}>
            {isServiceStarted 
              ? '✅ Service already started with this OTP'
              : 'Share this OTP with the professional to start the service'
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderServiceDetails = () => {
    return (
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        {order?.serviceItems?.map((item, index) => (
          <View key={index} style={styles.serviceItem}>
            <Image
              source={{ uri: item.serviceId?.image_url || 'https://via.placeholder.com/60' }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{item.serviceId?.name || 'Service'}</Text>
              <Text style={styles.serviceQuantity}>Quantity: {item.quantity}</Text>
              {item.selectedDate && (
                <View style={styles.scheduleInfo}>
                  <Icon name="calendar-outline" size={14} color="#FF6B9D" />
                  <Text style={styles.scheduleText}>
                    {formatDate(item.selectedDate)} at {item.selectedTime}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.servicePrice}>₹{item.price}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderOrderSummary = () => {
    return (
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Order Number</Text>
          <Text style={styles.summaryValue}>#{order?.orderNumber}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Order Date</Text>
          <Text style={styles.summaryValue}>{formatDate(order?.createdAt)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Payment Method</Text>
          <Text style={styles.summaryValue}>{order?.paymentMethod?.toUpperCase() || 'COD'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total Amount</Text>
          <Text style={styles.summaryTotalValue}>₹{order?.totalAmount}</Text>
        </View>
      </View>
    );
  };

  const renderRatingActionsFooter = () => {
    if (!isOrderCompleted()) {
      console.log('🚫 Rating button hidden - Order status:', order?.status);
      return null;
    }

    console.log('✅ Rating button visible - Order status:', order?.status);

    return (
      <View style={styles.ratingActionsSection}>
        <Text style={styles.ratingActionsSectionTitle}>How was your experience?</Text>
        <Text style={styles.ratingActionsSubtitle}>Help others by sharing your feedback</Text>
        
        <TouchableOpacity
          style={styles.rateServiceButton}
          onPress={handleRateService}
        >
          <View style={styles.rateServiceButtonContent}>
            <Icon name="star" size={24} color="#FFD700" />
            <View style={styles.rateServiceButtonText}>
              <Text style={styles.rateServiceButtonTitle}>Rate All Items</Text>
              <Text style={styles.rateServiceButtonSubtitle}>
                Review services and professionals
              </Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#FF6B9D" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
        <Footer />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={80} color="#E74C3C" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backToOrdersButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToOrdersText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
        <Footer />
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
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Service</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchOrderDetails}
        >
          <Icon name="refresh" size={24} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B9D']}
          />
        }
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(order.status) + '15' }]}>
          <Icon
            name={order.status === 'confirmed' ? 'checkmark-circle' : 'construct'}
            size={48}
            color={getStatusColor(order.status)}
          />
          <Text style={[styles.statusMessage, { color: getStatusColor(order.status) }]}>
            {getStatusMessage(order.status)}
          </Text>
          <Text style={styles.statusSubMessage}>{getEstimatedArrivalTime(order.status)}</Text>
        </View>

        {/* 🆕 Live Tracking Map */}
        {renderLiveTrackingMap()}

        {/* OTP Section */}
        {renderOtpSection()}

        {/* Service Professional */}
        {renderServiceProfessional()}

        {/* Status Timeline */}
        {renderStatusTimeline()}

        {/* Service Details */}
        {renderServiceDetails()}

        {/* Order Summary */}
        {renderOrderSummary()}

        {/* Rating Actions Footer */}
        {renderRatingActionsFooter()}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Icon name="help-circle-outline" size={24} color="#FF6B9D" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              Contact our support team for any assistance
            </Text>
          </View>
          <TouchableOpacity style={styles.helpButton}>
            <Icon name="headset-outline" size={20} color="#FF6B9D" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Footer />
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  statusBanner: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  statusSubMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // 🆕 NEW: Map Styles
  mapSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF5F8',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8F0',
  },
  mapTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginLeft: 8,
  },
  map: {
    width: '100%',
    height: 300,
  },
  professionalMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapInfoOverlay: {
    padding: 12,
    backgroundColor: '#FFF',
  },
  mapInfoCard: {
    backgroundColor: '#FFF5F8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  mapInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  mapInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  mapInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B9D',
  },
  
  otpSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  otpHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  otpBox: {
    backgroundColor: '#FFF9FB',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  otpCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B9D',
    letterSpacing: 12,
  },
  otpInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
  },
  otpInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  professionalSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  professionalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  professionalBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFA500',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateProfessionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  rateProfessionalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFA500',
  },
  reviewedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  reviewedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2ECC71',
  },
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF5F8',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  etaInfo: {
    flex: 1,
  },
  etaLabel: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 4,
  },
  etaDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    alignSelf: 'flex-start',
  },
  viewMapText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  arrivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  arrivalInfo: {
    flex: 1,
  },
  arrivalLabel: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
    marginBottom: 2,
  },
  arrivalTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '600',
    marginBottom: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#3498DB',
  },
  timelineContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeftSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceQuantity: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 11,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  summaryDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  ratingActionsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingActionsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  ratingActionsSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 20,
    textAlign: 'center',
  },
  rateServiceButton: {
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rateServiceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateServiceButtonText: {
    flex: 1,
  },
  rateServiceButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  rateServiceButtonSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  helpText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 30,
  },
  backToOrdersButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
  },
  backToOrdersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TrackServiceScreen;