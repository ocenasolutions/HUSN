// src/Pages/Professional/ProfessionalTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

const ProfessionalTrackingScreen = ({ route, navigation }) => {
  const { orderId, orderNumber, customerAddress } = route.params;
  const { user, tokens } = useAuth();
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      stopTracking();
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for tracking.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermission(true);
          getCurrentLocation();
        } else {
          setLocationPermission(false);
          Alert.alert(
            'Permission Required',
            'Location permission is required to track your journey to the customer.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // iOS - permissions are handled in Info.plist
        setLocationPermission(true);
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Location permission error:', error);
      Alert.alert('Error', 'Failed to get location permission');
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Get current position error:', error);
        Alert.alert('Error', 'Failed to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const connectSocket = () => {
    const token = tokens?.accessToken || user?.token;
    
    socketRef.current = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to tracking server');
      
      // Register as professional
      socketRef.current.emit('professional:register', {
        professionalId: user._id,
        orderId: orderId,
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from tracking server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('tracking:started', (data) => {
      console.log('Tracking started:', data);
    });
  };

  const startTracking = async () => {
    if (locationPermission !== true) {
      Alert.alert('Error', 'Location permission not granted');
      return;
    }

    try {
      setIsTracking(true);
      
      // Connect socket
      connectSocket();

      // Start location tracking with high accuracy
      watchIdRef.current = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading, speed } = position.coords;
          
          const newLocation = {
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0,
          };
          
          setCurrentLocation(newLocation);

          // Emit location to server
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('location:update', {
              orderId,
              latitude,
              longitude,
              heading: heading || 0,
              speed: speed || 0,
            });
          }

          // Calculate distance to destination
          if (customerAddress.latitude && customerAddress.longitude) {
            const dist = calculateDistance(
              latitude,
              longitude,
              customerAddress.latitude,
              customerAddress.longitude
            );
            setDistance(dist);

            // Check if arrived (within 50 meters)
            if (dist < 0.05 && !hasArrived) {
              handleArrival();
            }
          }
        },
        (error) => {
          console.error('Watch position error:', error);
          Alert.alert('Error', 'Failed to track location');
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // Update every 10 meters
          interval: 3000, // Update every 3 seconds (Android)
          fastestInterval: 2000, // Fastest update interval (Android)
        }
      );

      Alert.alert(
        'Tracking Started',
        'Your location is now being shared with the customer.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Start tracking error:', error);
      Alert.alert('Error', 'Failed to start location tracking');
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    setIsTracking(false);

    // Stop location updates
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleArrival = () => {
    setHasArrived(true);
    
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('tracking:arrived', { orderId });
    }

    Alert.alert(
      'Arrived!',
      'You have arrived at the customer location.',
      [
        {
          text: 'Complete Service',
          onPress: () => completeService(),
        },
      ]
    );
  };

  const completeService = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('tracking:completed', { orderId });
    }

    stopTracking();

    Alert.alert(
      'Service Completed',
      'Great job! The service has been marked as completed.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => {
    return (value * Math.PI) / 180;
  };

  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isTracking) {
              Alert.alert(
                'Stop Tracking?',
                'Are you sure you want to stop tracking? The customer will not be able to see your location.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: () => {
                      stopTracking();
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Live Tracking</Text>
          <Text style={styles.orderNumberText}>Order #{orderNumber}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon
              name={isTracking ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={isTracking ? '#2ECC71' : '#95A5A6'}
            />
            <Text style={styles.statusTitle}>
              {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
            </Text>
          </View>

          {isTracking && (
            <View style={styles.trackingInfo}>
              <View style={styles.infoRow}>
                <Icon name="location" size={20} color="#3498DB" />
                <Text style={styles.infoLabel}>Current Location:</Text>
              </View>
              <Text style={styles.infoValue}>
                {currentLocation
                  ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                  : 'Getting location...'}
              </Text>

              {distance !== null && (
                <>
                  <View style={[styles.infoRow, { marginTop: 16 }]}>
                    <Icon name="navigate" size={20} color="#9B59B6" />
                    <Text style={styles.infoLabel}>Distance to Customer:</Text>
                  </View>
                  <Text style={styles.infoValue}>{formatDistance(distance)}</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Icon name="location-outline" size={24} color="#FF6B9D" />
            <Text style={styles.customerTitle}>Customer Location</Text>
          </View>
          <Text style={styles.customerAddress}>
            {customerAddress.street}, {customerAddress.city}
          </Text>
          <Text style={styles.customerAddress}>
            {customerAddress.state} - {customerAddress.zipCode}
          </Text>
        </View>

        {locationPermission === false && (
          <View style={styles.permissionAlert}>
            <Icon name="warning" size={24} color="#E74C3C" />
            <Text style={styles.permissionText}>
              Location permission is required for tracking
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isTracking && locationPermission === true && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startTracacking}
          >
            <Icon name="play-circle" size={24} color="#FFF" />
            <Text style={styles.startButtonText}>Start Tracking</Text>
          </TouchableOpacity>
        )}

        {isTracking && (
          <View style={styles.actionButtons}>
            {hasArrived ? (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={completeService}
              >
                <Icon name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.completeButtonText}>Complete Service</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.arrivedButton}
                onPress={handleArrival}
              >
                <Icon name="flag" size={24} color="#FFF" />
                <Text style={styles.arrivedButtonText}>Mark as Arrived</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => {
                Alert.alert(
                  'Stop Tracking?',
                  'The customer will no longer see your location.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Stop',
                      style: 'destructive',
                      onPress: stopTracking,
                    },
                  ]
                );
              }}
            >
              <Icon name="stop-circle" size={24} color="#FFF" />
              <Text style={styles.stopButtonText}>Stop Tracking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    flex: 1,
    marginLeft: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  orderNumberText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  trackingInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#2C3E50',
    marginLeft: 28,
  },
  customerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  customerAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  permissionAlert: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionButtons: {
    gap: 12,
  },
  arrivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    borderRadius: 12,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default ProfessionalTrackingScreen;