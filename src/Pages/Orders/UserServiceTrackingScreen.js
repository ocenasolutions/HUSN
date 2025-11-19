// src/Pages/Orders/UserServiceTrackingScreen.js - COMPLETE ENHANCED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, SOCKET_URL } from '../../API/config';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const UserServiceTrackingScreen = ({ route, navigation }) => {
  console.log('=== UserServiceTrackingScreen Mounted ===');
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [professionalLocation, setProfessionalLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [isProfessionalMoving, setIsProfessionalMoving] = useState(false);
  
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const locationSubscription = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      console.error('❌ Invalid orderId');
      setLoading(false);
      Alert.alert(
        'Navigation Error',
        'No valid order ID provided.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    console.log('✓ Valid orderId, initializing...');
    initializeTracking();
    startPulseAnimation();
    
    return () => {
      console.log('🧹 Cleaning up UserServiceTrackingScreen...');
      stopTracking();
      if (socketRef.current) {
        socketRef.current.emit('leave-order', orderId);
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  // Calculate distance and ETA when locations change
  useEffect(() => {
    if (userLocation && professionalLocation) {
      const calculatedDistance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        professionalLocation.latitude,
        professionalLocation.longitude
      );
      setDistance(calculatedDistance);
      
      // Estimate ETA (assuming 30 km/h average speed)
      const etaMinutes = Math.round((calculatedDistance / 30) * 60);
      setEta(etaMinutes);

      // Update path
      const newPath = [
        { latitude: professionalLocation.latitude, longitude: professionalLocation.longitude },
        { latitude: userLocation.latitude, longitude: userLocation.longitude }
      ];
      
      setPathCoordinates(newPath);

      // Animate map to show both markers
      if (mapRef.current && calculatedDistance > 0.05) {
        const midLat = (professionalLocation.latitude + userLocation.latitude) / 2;
        const midLng = (professionalLocation.longitude + userLocation.longitude) / 2;
        const latDelta = Math.abs(professionalLocation.latitude - userLocation.latitude) * 2.5;
        const lngDelta = Math.abs(professionalLocation.longitude - userLocation.longitude) * 2.5;

        mapRef.current.animateToRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(latDelta, 0.02),
          longitudeDelta: Math.max(lngDelta, 0.02)
        }, 1000);
      }
    }
  }, [userLocation, professionalLocation]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getAccessToken = async () => {
    try {
      const storedTokens = await AsyncStorage.getItem('tokens');
      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);
        return parsedTokens.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  const initializeTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for live tracking');
        return;
      }

      await fetchOrderDetails();
      await initializeSocket();
      startTracking();
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize tracking');
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        Alert.alert('Authentication Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      console.log('📡 Fetching order details for:', orderId);

      const response = await fetch(`${API_URL}/orders/${orderId}/location`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      console.log('📊 Order details response:', data.success ? 'Success' : 'Failed');
      
      if (data.success) {
        setOrder(data.data);
        
        // Set initial professional location if available
        if (data.data.professionalLiveLocation?.coordinates) {
          const [lng, lat] = data.data.professionalLiveLocation.coordinates;
          console.log('🔧 Setting initial professional location:', { lat, lng });
          setProfessionalLocation({ latitude: lat, longitude: lng });
        }
        
        // Set initial user location if available
        if (data.data.userLiveLocation?.coordinates) {
          const [lng, lat] = data.data.userLiveLocation.coordinates;
          console.log('📍 Setting initial user location:', { lat, lng });
          setUserLocation({ latitude: lat, longitude: lng });
        }
        
        setLoading(false);
      } else {
        setLoading(false);
        Alert.alert('Error', data.message || 'Failed to fetch order details', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('❌ Fetch order error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to fetch order details', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  const initializeSocket = async () => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.log('❌ No access token for socket');
      return;
    }

    console.log('🔌 Connecting user to socket...', SOCKET_URL);
    
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ User tracking socket connected');
      socketRef.current.emit('join-order', orderId);
      console.log('📦 Joined order room:', orderId);
    });

    socketRef.current.on('professional-location-updated', (data) => {
      console.log('🔧 Professional location updated via socket:', data);
      if (data.latitude && data.longitude) {
        setProfessionalLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
        setIsProfessionalMoving(true);
        setTimeout(() => setIsProfessionalMoving(false), 3000);
      }
    });

    socketRef.current.on('professional-journey-started', (data) => {
      console.log('🚗 Professional started journey:', data);
      Alert.alert(
        'Journey Started!',
        'Your service professional is now on the way to your location!',
        [{ text: 'OK' }]
      );
      fetchOrderDetails();
    });

    socketRef.current.on('order-status-updated', (data) => {
      console.log('📊 Order status updated:', data);
      fetchOrderDetails();
      
      const statusMessages = {
        in_progress: 'Service professional is on the way! 🚗',
        out_for_delivery: 'Professional has started working! 🔧',
        completed: 'Service completed! Thank you! ✅'
      };
      
      if (statusMessages[data.status]) {
        Alert.alert('Status Update', statusMessages[data.status]);
      }
      
      if (data.status === 'completed' || data.status === 'delivered') {
        stopTracking();
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    });

    socketRef.current.on('professional-assigned-notification', (data) => {
      console.log('🔧 Professional assigned:', data);
      Alert.alert(
        'Professional Assigned',
        `${data.professionalName} has been assigned to your service${data.trackingStarted ? '. Live tracking is now active!' : ''}`,
        [{ text: 'OK' }]
      );
      fetchOrderDetails();
    });

    socketRef.current.on('tracking-started', (data) => {
      console.log('📍 Tracking started:', data);
      Alert.alert('Live Tracking Started', 'You can now track the professional in real-time');
      fetchOrderDetails();
    });

    socketRef.current.on('tracking-stopped', (data) => {
      console.log('🛑 Tracking stopped:', data);
      stopTracking();
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ User tracking socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });
  };

  const startTracking = async () => {
    try {
      setIsTracking(true);
      console.log('🎯 Starting user location tracking...');

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          console.log('📍 User location update:', { latitude, longitude });
          setUserLocation({ latitude, longitude });

          if (socketRef.current?.connected) {
            socketRef.current.emit('update-user-location', {
              orderId,
              latitude,
              longitude
            });
          }

          updateLocationOnServer(latitude, longitude);
        }
      );

      console.log('✅ User location tracking started');
    } catch (error) {
      console.error('❌ Start tracking error:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      console.log('🛑 User location tracking stopped');
    }
    setIsTracking(false);
  };

  const updateLocationOnServer = async (latitude, longitude) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      await fetch(`${API_URL}/orders/${orderId}/user-location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (error) {
      console.error('Update location error:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: '#4CAF50',
      in_progress: '#2196F3',
      out_for_delivery: '#9C27B0',
      completed: '#4CAF50'
    };
    return colors[status] || '#757575';
  };

  const getStatusText = (status) => {
    const texts = {
      confirmed: 'Professional Assigned',
      in_progress: 'Professional is on the way',
      out_for_delivery: 'Service in progress',
      completed: 'Service completed'
    };
    return texts[status] || status;
  };

  if (!orderId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No order selected</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Loading tracking details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const professional = order.serviceItems.find(item => item.professionalId);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.latitude || 30.9010,
          longitude: userLocation?.longitude || 75.8573,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
        showsTraffic={true}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="You are here"
          >
            <Animated.View style={[styles.userMarker, { transform: [{ scale: pulseAnim }] }]}>
              <Icon name="home" size={24} color="#FFF" />
            </Animated.View>
          </Marker>
        )}

        {/* Professional Location Marker */}
        {professionalLocation && (
          <Marker
            coordinate={professionalLocation}
            title="Professional Location"
            description={professional?.professionalName || 'Professional'}
          >
            <Animated.View style={[
              styles.professionalMarker,
              isProfessionalMoving && { transform: [{ scale: pulseAnim }] }
            ]}>
              <Icon name="person" size={24} color="#FFF" />
            </Animated.View>
          </Marker>
        )}

        {/* Path from Professional to User */}
        {pathCoordinates.length === 2 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="#4CAF50"
            strokeWidth={4}
            lineDashPattern={[1]}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButtonOverlay}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>

        {/* Tracking Status Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <View style={[styles.statusDot, { 
              backgroundColor: isTracking && order.isLiveLocationActive ? '#4CAF50' : '#F44336' 
            }]} />
            <Text style={styles.trackingText}>
              {isTracking && order.isLiveLocationActive ? '🟢 Live Tracking Active' : '🔴 Tracking Inactive'}
            </Text>
          </View>

          {distance !== null && professionalLocation && (
            <View style={styles.distanceInfo}>
              <View style={styles.distanceRow}>
                <Icon name="navigate" size={20} color="#4CAF50" />
                <Text style={styles.distanceText}>{distance.toFixed(2)} km away</Text>
              </View>
              {eta !== null && eta > 0 && (
                <View style={styles.etaRow}>
                  <Icon name="time" size={20} color="#2196F3" />
                  <Text style={styles.etaText}>ETA: ~{eta} min</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusBadgeText}>{order.status?.toUpperCase()}</Text>
          </View>

          <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>

          {professional ? (
            <>
              <View style={styles.divider} />
              <View style={styles.professionalInfo}>
                <Text style={styles.label}>Your Professional</Text>
                <Text style={styles.professionalName}>👤 {professional.professionalName}</Text>
                {professional.professionalPhone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => {
                      const phone = professional.professionalPhone;
                      Alert.alert(
                        'Call Professional',
                        `Call ${professional.professionalName}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) }
                        ]
                      );
                    }}
                  >
                    <Icon name="call" size={16} color="#FFF" />
                    <Text style={styles.callButtonText}>Call Professional</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color="#FF6B9D" />
              <Text style={styles.waitingText}>Waiting for professional assignment...</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.serviceContainer}>
            <Text style={styles.locationLabel}>🛠️ Service</Text>
            {order.serviceItems.map((item, index) => (
              <Text key={index} style={styles.serviceText}>
                {item.serviceId?.name || 'Service'} x{item.quantity}
              </Text>
            ))}
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderValue}>{order.orderNumber}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8'
  },
  map: {
    width: width,
    height: height
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8'
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 20
  },
  backButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    bottom: 20
  },
  backButtonOverlay: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 10
  },
  trackingCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50'
  },
  distanceInfo: {
    gap: 8
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  distanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50'
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3'
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 10
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: height * 0.5
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15
  },
  professionalInfo: {
    marginBottom: 10
  },
  label: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 5
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15
  },
  waitingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#7F8C8D'
  },
  serviceContainer: {
    marginBottom: 15
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 5
  },
  serviceText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 3
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  orderLabel: {
    fontSize: 12,
    color: '#7F8C8D'
  },
  orderValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50'
  },
  userMarker: {
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
    elevation: 5
  },
  professionalMarker: {
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
    elevation: 5
  }
});

export default UserServiceTrackingScreen;