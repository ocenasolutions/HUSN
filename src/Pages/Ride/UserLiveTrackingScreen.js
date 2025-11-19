import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  BackHandler
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, SOCKET_URL } from '../../API/config';
import { useFocusEffect } from '@react-navigation/native';

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
  
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const locationSubscription = useRef(null);

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
    
    return () => {
      console.log('🧹 Cleaning up UserServiceTrackingScreen...');
      stopTracking();
      if (socketRef.current) {
        socketRef.current.emit('leave-order', orderId);
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  // Update path when locations change
  useEffect(() => {
    if (userLocation && professionalLocation) {
      const newPath = [
        { latitude: professionalLocation.latitude, longitude: professionalLocation.longitude },
        { latitude: userLocation.latitude, longitude: userLocation.longitude }
      ];
      
      console.log('🛣️ Updating path coordinates:', newPath);
      setPathCoordinates(newPath);

      // Animate map to show both markers
      if (mapRef.current) {
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
      startTracking(); // Start user location tracking immediately
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
        
        console.log('✅ Order loaded:', {
          status: data.data.status,
          hasProfessional: data.data.serviceItems.some(item => item.professionalId),
          isTrackingActive: data.data.isLiveLocationActive
        });
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
      }
    });

    socketRef.current.on('order-status-updated', (data) => {
      console.log('📊 Order status updated:', data);
      fetchOrderDetails(); // Refresh order data
      
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
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10 // Or every 10 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          console.log('📍 User location update:', { latitude, longitude });
          setUserLocation({ latitude, longitude });

          // Emit location to server via socket
          if (socketRef.current?.connected) {
            console.log('📡 Emitting user location to socket');
            socketRef.current.emit('update-user-location', {
              orderId,
              latitude,
              longitude
            });
          }

          // Update on server via API
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

  const calculateDistance = () => {
    if (!userLocation || !professionalLocation) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (userLocation.latitude - professionalLocation.latitude) * Math.PI / 180;
    const dLon = (userLocation.longitude - professionalLocation.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(professionalLocation.latitude * Math.PI / 180) *
      Math.cos(userLocation.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance.toFixed(2);
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
      confirmed: 'Service Confirmed - Professional Assigned',
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
        <Text style={styles.loadingText}>Loading order details...</Text>
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
  const distance = calculateDistance();

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.latitude || 0,
          longitude: userLocation?.longitude || 0,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="You are here"
            pinColor="#FF6B9D"
          >
            <View style={styles.userMarker}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </Marker>
        )}

        {/* Professional Location Marker */}
        {professionalLocation && (
          <Marker
            coordinate={professionalLocation}
            title="Professional Location"
            description={professional?.professionalName || 'Professional'}
            pinColor="#4CAF50"
          >
            <View style={styles.professionalMarker}>
              <Text style={styles.markerText}>🔧</Text>
            </View>
          </Marker>
        )}

        {/* Path from Professional to User */}
        {pathCoordinates.length === 2 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="#4CAF50"
            strokeWidth={5}
            lineDashPattern={[10, 5]}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        {/* Tracking Indicator */}
        <View style={styles.trackingIndicator}>
          <View style={[styles.dot, { backgroundColor: isTracking ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.trackingText}>
            {isTracking ? '🟢 Live Tracking Active' : '🔴 Tracking Inactive'}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusBadgeText}>{order.status?.toUpperCase()}</Text>
        </View>

        {/* Distance Card */}
        {distance && professionalLocation && (
          <View style={styles.distanceCard}>
            <Text style={styles.distanceLabel}>Professional Distance</Text>
            <Text style={styles.distanceValue}>{distance} km away</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>

          {professional ? (
            <>
              <View style={styles.divider} />

              <View style={styles.professionalInfo}>
                <Text style={styles.label}>Your Professional</Text>
                <Text style={styles.professionalName}>👤 {professional.professionalName}</Text>
                {professional.professionalPhone && (
                  <Text style={styles.phoneText}>📞 {professional.professionalPhone}</Text>
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

          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Order Number</Text>
            <Text style={styles.timeValue}>{order.orderNumber}</Text>
          </View>

          {order.estimatedServiceTime && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Estimated Time</Text>
              <Text style={styles.timeValue}>{order.estimatedServiceTime}</Text>
            </View>
          )}
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
    top: 60,
    left: 20,
    right: 20,
    bottom: 20
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 10
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50'
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  distanceCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5
  },
  distanceLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 5
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50'
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
    marginBottom: 5
  },
  phoneText: {
    fontSize: 14,
    color: '#2196F3'
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
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  timeLabel: {
    fontSize: 12,
    color: '#7F8C8D'
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50'
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF'
  },
  professionalMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF'
  },
  markerText: {
    fontSize: 20
  }
});

export default UserServiceTrackingScreen;