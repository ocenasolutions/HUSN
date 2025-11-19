import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const MapLocationPicker = ({ 
  visible, 
  onClose, 
  onLocationSelect,
  initialLocation = null,
  title = "Select Location"
}) => {
  const [region, setRegion] = useState({
    latitude: 31.6340,
    longitude: 74.8723,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerCoords, setMarkerCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        const { latitude, longitude } = initialLocation;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        setMarkerCoords({ latitude, longitude });
        reverseGeocode(latitude, longitude);
      } else {
        getCurrentLocation();
      }
    }
  }, [visible, initialLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;
      
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      setMarkerCoords({ latitude, longitude });
      await reverseGeocode(latitude, longitude);
      
      setLoading(false);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('Error', 'Failed to get current location');
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (addresses.length > 0) {
        const addr = addresses[0];
        const addressString = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
        
        setAddress(addressString);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoords({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a location to search');
      return;
    }

    try {
      setLoading(true);
      const results = await Location.geocodeAsync(searchQuery);
      
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        
        setMarkerCoords({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
        
        // Animate to location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }, 1000);
      } else {
        Alert.alert('Not Found', 'Location not found. Please try a different search term.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location');
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!markerCoords) {
      Alert.alert('No Location', 'Please select a location on the map');
      return;
    }

    onLocationSelect({
      latitude: markerCoords.latitude,
      longitude: markerCoords.longitude,
      address: address || 'Selected Location'
    });
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
        >
          {markerCoords && (
            <Marker
              coordinate={markerCoords}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setMarkerCoords({ latitude, longitude });
                reverseGeocode(latitude, longitude);
              }}
            />
          )}
        </MapView>

        {/* Current Location Button */}
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          <Text style={styles.currentLocationIcon}>📍</Text>
        </TouchableOpacity>

        {/* Address Display & Confirm */}
        <View style={styles.bottomSheet}>
          <Text style={styles.addressLabel}>Selected Location:</Text>
          <Text style={styles.addressText} numberOfLines={3}>
            {address || 'Tap on the map to select a location'}
          </Text>
          
          <TouchableOpacity
            style={[styles.confirmButton, !markerCoords && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!markerCoords || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  closeButton: {
    padding: 5
  },
  closeButtonText: {
    fontSize: 24,
    color: '#2C3E50'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50'
  },
  placeholder: {
    width: 34
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    gap: 10
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16
  },
  searchButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60
  },
  searchButtonText: {
    fontSize: 20
  },
  map: {
    flex: 1
  },
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 200,
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  currentLocationIcon: {
    fontSize: 24
  },
  bottomSheet: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8
  },
  addressText: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 20,
    minHeight: 50
  },
  confirmButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmButtonDisabled: {
    opacity: 0.5
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  }
});

export default MapLocationPicker;