import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL, SOCKET_URL } from '../../API/config';
import { useFocusEffect } from '@react-navigation/native';
import MapLocationPicker from '../../components/MapLocationPicker';

const RequestRideScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [checkingRide, setCheckingRide] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    checkAuthStatus();
    getCurrentLocation();
    initializeSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkForActiveRide();
    }, [])
  );

  const initializeSocket = async () => {
    let accessToken = tokens?.accessToken;
    
    if (!accessToken) {
      const storedTokens = await AsyncStorage.getItem('tokens');
      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);
        accessToken = parsedTokens.accessToken;
      }
    }

    if (!accessToken) {
      console.log('❌ No access token for socket connection');
      return;
    }

    console.log('🔌 User connecting to socket...', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ User socket connected');
      if (user?._id) {
        socketRef.current.emit('join-room', `user-${user._id}`);
      }
    });

    socketRef.current.on('ride-accepted', (data) => {
      console.log('✅ Ride accepted by driver:', data);
      checkForActiveRide();
      Alert.alert(
        'Driver Assigned! 🚗',
        `${data.driver?.name || 'A driver'} has accepted your request!`
      );
    });

    socketRef.current.on('ride-status-updated', (data) => {
      console.log('📊 Ride status updated:', data);
      checkForActiveRide();
    });

    socketRef.current.on('ride-cancelled', (data) => {
      console.log('🚫 Ride cancelled:', data);
      setActiveRide(null);
      Alert.alert(
        'Ride Cancelled',
        data.cancelledBy === 'driver' 
          ? 'The driver cancelled the ride' 
          : 'Your ride has been cancelled'
      );
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ User socket disconnected');
    });
  };

  const checkAuthStatus = async () => {
    try {
      const storedTokens = await AsyncStorage.getItem('tokens');
      if (!storedTokens || !tokens) {
        Alert.alert(
          'Not Logged In',
          'Please login to request location tracking',
          [
            { text: 'Cancel' },
            { text: 'Login', onPress: () => navigation.navigate('Login') }
          ]
        );
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const checkForActiveRide = async () => {
    try {
      setCheckingRide(true);
      let accessToken = tokens?.accessToken;
      
      if (!accessToken) {
        const storedTokens = await AsyncStorage.getItem('tokens');
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          accessToken = parsedTokens.accessToken;
        }
      }

      if (!accessToken) {
        setCheckingRide(false);
        return;
      }

      const response = await fetch(`${API_URL}/rides/user/active`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      console.log('Active ride check:', data);
      
      if (data.success && data.data) {
        setActiveRide(data.data);
      } else {
        setActiveRide(null);
      }
      
      setCheckingRide(false);
    } catch (error) {
      console.error('Check active ride error:', error);
      setCheckingRide(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
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
      }

      setGettingLocation(false);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('Error', 'Failed to get current location');
      setGettingLocation(false);
    }
  };

  const handleLocationSelect = (selectedLocation) => {
    console.log('📍 Location selected from map:', selectedLocation);
    setCurrentLocation({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    });
    setCurrentAddress(selectedLocation.address);
  };

  const openMapPicker = () => {
    setShowMapPicker(true);
  };

  const requestLocationTracking = async () => {
    console.log('\n=== REQUEST LOCATION TRACKING ===');
    
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location to request tracking');
      return;
    }

    if (!user) {
      console.log('❌ No user in context');
      Alert.alert('Authentication Error', 'Please login to request tracking');
      return;
    }

    try {
      setLoading(true);
      
      let accessToken = tokens?.accessToken;
      
      if (!accessToken) {
        const storedTokens = await AsyncStorage.getItem('tokens');
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          accessToken = parsedTokens.accessToken;
        }
      }
      
      console.log('Access Token exists:', !!accessToken);
      
      if (!accessToken) {
        Alert.alert(
          'Authentication Error',
          'No authentication token found. Please login again.',
          [
            { text: 'Cancel' },
            { text: 'Login', onPress: () => navigation.navigate('Login') }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('User:', user?.name, user?._id);
      console.log('Current Location:', currentLocation);
      
      const requestBody = {
        userLocation: {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: currentAddress
        }
      };

      console.log('Request body:', requestBody);
      
      const url = `${API_URL}/rides/create`;
      console.log('Making request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert(
            'Authentication Error',
            data.message || 'Your session has expired. Please login again.',
            [
              { text: 'Cancel' },
              { 
                text: 'Login', 
                onPress: () => {
                  AsyncStorage.multiRemove(['user', 'tokens']);
                  navigation.navigate('Login');
                }
              }
            ]
          );
          setLoading(false);
          return;
        }
        
        throw new Error(data.message || 'Request failed');
      }
      
      if (data.success) {
        console.log('✅ Location tracking requested successfully!');
        
        const rideId = data.data?._id || data.data?.id;
        console.log('Ride ID:', rideId);
        
        if (!rideId) {
          Alert.alert('Error', 'Request created but no ID returned. Please try again.');
          setLoading(false);
          return;
        }
        
        setActiveRide(data.data);
        setLoading(false);
        
        Alert.alert(
          'Tracking Requested! 🎉',
          'Your location has been shared. Waiting for a driver to accept...',
          [
            {
              text: 'Track Driver',
              onPress: () => {
                navigation.navigate('UserLiveTrackingScreen', { 
                  rideId: String(rideId) 
                });
              }
            },
            {
              text: 'Later',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to request tracking');
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Request error:', error);
      
      let errorMessage = 'Failed to request tracking. Please try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;

    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              let accessToken = tokens?.accessToken;
              
              if (!accessToken) {
                const storedTokens = await AsyncStorage.getItem('tokens');
                if (storedTokens) {
                  const parsedTokens = JSON.parse(storedTokens);
                  accessToken = parsedTokens.accessToken;
                }
              }

              console.log('🚫 Cancelling ride:', activeRide._id);

              const response = await fetch(`${API_URL}/rides/${activeRide._id}/cancel`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ reason: 'User cancelled' })
              });

              const data = await response.json();
              console.log('Cancel response:', data);
              
              if (data.success) {
                setActiveRide(null);
                Alert.alert('Cancelled', 'Your ride request has been cancelled');
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel ride');
              }
            } catch (error) {
              console.error('Cancel ride error:', error);
              Alert.alert('Error', 'Failed to cancel ride');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      requested: '#FF9800',
      accepted: '#4CAF50',
      arrived: '#2196F3',
      started: '#9C27B0',
      completed: '#4CAF50',
      cancelled: '#F44336'
    };
    return colors[status] || '#757575';
  };

  const getStatusText = (status) => {
    const texts = {
      requested: 'Waiting for driver...',
      accepted: 'Driver is on the way',
      arrived: 'Driver has arrived',
      started: 'Ride in progress',
      completed: 'Ride completed',
      cancelled: 'Ride cancelled'
    };
    return texts[status] || status;
  };

  if (checkingRide) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Checking for active rides...</Text>
      </View>
    );
  }

  if (activeRide) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Current Ride</Text>
          <Text style={styles.headerSubtitle}>
            Track your ride status below
          </Text>
        </View>

        <View style={styles.activeRideCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeRide.status) }]}>
            <Text style={styles.statusBadgeText}>{activeRide.status?.toUpperCase()}</Text>
          </View>

          <Text style={styles.statusMessage}>{getStatusText(activeRide.status)}</Text>

          {activeRide.driver && (
            <View style={styles.driverInfo}>
              <Text style={styles.driverLabel}>Driver Information</Text>
              <Text style={styles.driverName}>👤 {activeRide.driver.name}</Text>
              <Text style={styles.driverPhone}>📞 {activeRide.driver.phone}</Text>
              {activeRide.driver.vehicleNumber && (
                <Text style={styles.vehicleInfo}>
                  🚗 {activeRide.driver.vehicleType} - {activeRide.driver.vehicleNumber}
                </Text>
              )}
            </View>
          )}

          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>📍 Your Location</Text>
            <Text style={styles.locationText}>{activeRide.pickupLocation?.address}</Text>
          </View>

          <View style={styles.rideTime}>
            <Text style={styles.rideTimeLabel}>Requested at</Text>
            <Text style={styles.rideTimeValue}>
              {new Date(activeRide.createdAt).toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short'
              })}
            </Text>
          </View>

          <View style={styles.activeButtonContainer}>
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => navigation.navigate('UserLiveTrackingScreen', { 
                rideId: String(activeRide._id) 
              })}
            >
              <Text style={styles.trackButtonText}>📍 Track Driver</Text>
            </TouchableOpacity>

            {['requested', 'accepted'].includes(activeRide.status) && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelRide}
              >
                <Text style={styles.cancelButtonText}>Cancel Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Your Location</Text>
        <Text style={styles.headerSubtitle}>
          {user ? `Hi ${user.name || 'there'}! Share your location to get help.` : 'Share your location'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.locationIcon}>📍</Text>
        </View>

        <Text style={styles.cardTitle}>Your Current Location</Text>
        
        {gettingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B9D" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : currentAddress ? (
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{currentAddress}</Text>
            <View style={styles.locationButtonsRow}>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={openMapPicker}
              >
                <Text style={styles.mapButtonText}>🗺️ Pick on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.locationButtonsColumn}>
            <TouchableOpacity 
              style={styles.getLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.getLocationButtonText}>📍 Get My Location</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={openMapPicker}
            >
              <Text style={styles.mapButtonText}>🗺️ Pick on Map</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {currentLocation && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>1</Text>
            <Text style={styles.infoText}>Share your current location</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={styles.infoText}>Nearest driver will accept your request</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={styles.infoText}>Track the driver in real-time</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.requestButton, loading && styles.requestButtonDisabled]}
        onPress={requestLocationTracking}
        disabled={loading || !currentLocation}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.requestButtonText}>
            {currentLocation ? '🚗 Request Driver Now' : 'Enable Location First'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Map Location Picker Modal */}
      <MapLocationPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={currentLocation}
        title="Select Your Pickup Location"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#7F8C8D'
  },
  header: {
    padding: 20,
    paddingTop: 60
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D'
  },
  card: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  locationIcon: {
    fontSize: 48
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 15
  },
  addressContainer: {
    width: '100%',
    alignItems: 'center'
  },
  addressText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: '100%'
  },
  locationButtonsColumn: {
    gap: 10,
    width: '100%',
    alignItems: 'center'
  },
  refreshButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    textAlign: 'center'
  },
  mapButton: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1
  },
  mapButtonText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center'
  },
  getLocationButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%'
  },
  getLocationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 15
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  infoNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B9D',
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    marginRight: 15
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22
  },
  requestButton: {
    backgroundColor: '#FF6B9D',
    marginHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  requestButtonDisabled: {
    opacity: 0.6
  },
  requestButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700'
  },
  activeRideCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  statusMessage: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 25
  },
  driverInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  driverLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 10,
    fontWeight: '600'
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 5
  },
  driverPhone: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 5
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5
  },
  locationInfo: {
    marginBottom: 20
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8
  },
  locationText: {
    fontSize: 15,
    color: '#7F8C8D',
    lineHeight: 22
  },
  rideTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 20
  },
  rideTimeLabel: {
    fontSize: 14,
    color: '#7F8C8D'
  },
  rideTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50'
  },
  activeButtonContainer: {
    gap: 10
  },
  trackButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  trackButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  cancelButton: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F44336'
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default RequestRideScreen;