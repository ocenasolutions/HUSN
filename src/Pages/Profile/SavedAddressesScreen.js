import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useFocusEffect } from '@react-navigation/native';

const SavedAddressesScreen = ({ navigation, route }) => {
  const { user, tokens } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'Home'
  });
  
  // Autocomplete states
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [stateSuggestions, setStateSuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [pincodeValidating, setPincodeValidating] = useState(false);
  const [pincodeValid, setPincodeValid] = useState(null);
  
  // Location states
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce timer refs
  const cityDebounceTimer = useRef(null);
  const stateDebounceTimer = useRef(null);
  const pincodeDebounceTimer = useRef(null);

  const addressTypes = ['Home', 'Work', 'Other'];

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchAddresses = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await fetch(`${API_URL}/addresses`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load addresses');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert('Error', 'Failed to load addresses. Please check your connection.');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses(false);
  };

  // Fetch city suggestions
  const fetchCitySuggestions = async (query) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/addresses/suggestions/cities?query=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      
      if (data.success) {
        setCitySuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
    }
  };

  // Fetch state suggestions
  const fetchStateSuggestions = async (query) => {
    try {
      const response = await fetch(
        `${API_URL}/addresses/suggestions/states?query=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      
      if (data.success) {
        setStateSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching state suggestions:', error);
    }
  };

  // Validate pincode and autofill city/state
  const validatePincode = async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeValid(false);
      return;
    }

    try {
      setPincodeValidating(true);
      const response = await fetch(
        `${API_URL}/addresses/validate-pincode/${pincode}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      
      if (data.success) {
        setPincodeValid(true);
        // Auto-fill city and state only if they're empty
        setFormData(prev => ({
          ...prev,
          city: prev.city || data.data.city,
          state: prev.state || data.data.state
        }));
        Alert.alert(
          'Pincode Validated',
          `Location: ${data.data.city}, ${data.data.state}\n\nYou can edit these fields if needed.`,
          [{ text: 'OK' }]
        );
      } else {
        setPincodeValid(false);
        Alert.alert('Invalid Pincode', data.message || 'Please enter a valid pincode');
      }
    } catch (error) {
      console.error('Error validating pincode:', error);
      setPincodeValid(false);
    } finally {
      setPincodeValidating(false);
    }
  };

  // Fetch address from live location
  const fetchLiveLocation = async () => {
    try {
      setFetchingLocation(true);
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied', 
          'Location permission is required to use this feature. You can still enter your address manually.',
          [{ text: 'OK' }]
        );
        setFetchingLocation(false);
        return;
      }

      // Show loading message
      Alert.alert(
        'Fetching Location',
        'Getting your current location...',
        [{ text: 'Cancel', onPress: () => setFetchingLocation(false) }]
      );

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      const { latitude, longitude } = location.coords;

      // Fetch address details from backend
      const response = await fetch(
        `${API_URL}/addresses/reverse-geocode?latitude=${latitude}&longitude=${longitude}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (data.success) {
        // Pre-fill the form with location data
        setFormData(prev => ({
          ...prev,
          address: data.data.street || data.data.fullAddress || prev.address,
          city: data.data.city || prev.city,
          state: data.data.state || prev.state,
          pincode: data.data.pincode || prev.pincode,
          landmark: data.data.landmark || prev.landmark
        }));
        
        Alert.alert(
          'Location Fetched!', 
          'Your location has been filled in. Please review and edit any fields as needed.',
          [{ text: 'OK' }]
        );
        
        // If pincode was fetched, mark it as valid
        if (data.data.pincode && /^\d{6}$/.test(data.data.pincode)) {
          setPincodeValid(true);
        }
      } else {
        Alert.alert(
          'Location Fetch Failed', 
          'Could not get address from your location. Please enter your address manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching live location:', error);
      Alert.alert(
        'Error', 
        'Failed to get current location. Please enter your address manually or try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleCityChange = (text) => {
    setFormData(prev => ({ ...prev, city: text }));
    setShowCitySuggestions(true);
    
    if (cityDebounceTimer.current) {
      clearTimeout(cityDebounceTimer.current);
    }
    
    cityDebounceTimer.current = setTimeout(() => {
      fetchCitySuggestions(text);
    }, 300);
  };

  const handleStateChange = (text) => {
    setFormData(prev => ({ ...prev, state: text }));
    setShowStateSuggestions(true);
    
    if (stateDebounceTimer.current) {
      clearTimeout(stateDebounceTimer.current);
    }
    
    stateDebounceTimer.current = setTimeout(() => {
      fetchStateSuggestions(text);
    }, 300);
  };

  const handlePincodeChange = (text) => {
    setFormData(prev => ({ ...prev, pincode: text }));
    setPincodeValid(null);
    
    if (pincodeDebounceTimer.current) {
      clearTimeout(pincodeDebounceTimer.current);
    }
    
    if (text.length === 6) {
      pincodeDebounceTimer.current = setTimeout(() => {
        validatePincode(text);
      }, 500);
    }
  };

  const selectCity = (city) => {
    setFormData(prev => ({ ...prev, city }));
    setShowCitySuggestions(false);
    setCitySuggestions([]);
    Keyboard.dismiss();
  };

  const selectState = (state) => {
    setFormData(prev => ({ ...prev, state }));
    setShowStateSuggestions(false);
    setStateSuggestions([]);
    Keyboard.dismiss();
  };

  const resetForm = () => {
    setFormData({
      fullName: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      address: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'Home'
    });
    setPincodeValid(null);
    setCitySuggestions([]);
    setStateSuggestions([]);
    setShowCitySuggestions(false);
    setShowStateSuggestions(false);
  };

  const openModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        fullName: address.fullName || '',
        phoneNumber: address.phoneNumber || '',
        address: address.address || '',
        landmark: address.landmark || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
        addressType: address.addressType || 'Home'
      });
      setPincodeValid(true);
    } else {
      setEditingAddress(null);
      resetForm();
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAddress(null);
    resetForm();
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.fullName.trim()) errors.push('Full name is required');
    
    if (!formData.phoneNumber.trim()) {
      errors.push('Phone number is required');
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      errors.push('Please enter a valid 10-digit phone number');
    }
    
    if (!formData.address.trim()) errors.push('Address is required');
    if (!formData.city.trim()) errors.push('City is required');
    if (!formData.state.trim()) errors.push('State is required');
    
    if (!formData.pincode.trim()) {
      errors.push('Pincode is required');
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      errors.push('Please enter a valid 6-digit pincode');
    }

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    
    return true;
  };

  const saveAddress = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const url = editingAddress 
        ? `${API_URL}/addresses/${editingAddress._id}` 
        : `${API_URL}/addresses`;
      
      const method = editingAddress ? 'PUT' : 'POST';
      
      const cleanedData = {
        ...formData,
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        fullName: formData.fullName.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        landmark: formData.landmark.trim()
      };
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanedData)
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Success', 
          editingAddress ? 'Address updated successfully' : 'Address added successfully',
          [{ text: 'OK', onPress: () => closeModal() }]
        );
        await fetchAddresses(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(addressId);
              const response = await fetch(`${API_URL}/addresses/${addressId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });

              const data = await response.json();
              if (data.success) {
                setAddresses(prev => prev.filter(addr => addr._id !== addressId));
                Alert.alert('Success', 'Address deleted successfully');
              } else {
                Alert.alert('Error', data.message || 'Failed to delete address');
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const setDefaultAddress = async (addressId) => {
    try {
      const response = await fetch(`${API_URL}/addresses/${addressId}/default`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (data.success) {
        setAddresses(prev => prev.map(addr => ({
          ...addr,
          isDefault: addr._id === addressId
        })));
        Alert.alert('Success', 'Default address updated');
      } else {
        Alert.alert('Error', data.message || 'Failed to set default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const getAddressTypeIcon = (type) => {
    switch (type) {
      case 'Home': return 'home-outline';
      case 'Work': return 'business-outline';
      default: return 'location-outline';
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const renderAddressItem = ({ item }) => (
    <View style={styles.addressItem}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeContainer}>
          <Icon 
            name={getAddressTypeIcon(item.addressType)} 
            size={20} 
            color="#FF1493" 
          />
          <Text style={styles.addressType}>{item.addressType}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openModal(item)}
          >
            <Icon name="pencil-outline" size={16} color="#FF1493" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, deletingId === item._id && styles.disabledButton]}
            onPress={() => deleteAddress(item._id)}
            disabled={deletingId === item._id}
          >
            {deletingId === item._id ? (
              <ActivityIndicator size="small" color="#E74C3C" />
            ) : (
              <Icon name="trash-outline" size={16} color="#E74C3C" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressDetails}>
        <Text style={styles.fullName}>{item.fullName}</Text>
        <Text style={styles.phoneNumber}>{formatPhoneNumber(item.phoneNumber)}</Text>
        <Text style={styles.addressText}>
          {item.address}
          {item.landmark && `, ${item.landmark}`}
        </Text>
        <Text style={styles.cityState}>
          {item.city}, {item.state} - {item.pincode}
        </Text>
      </View>

      {!item.isDefault && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => setDefaultAddress(item._id)}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyAddresses = () => (
    <View style={styles.emptyContainer}>
      <Icon name="location-outline" size={80} color="#FF1493" />
      <Text style={styles.emptyTitle}>No Saved Addresses</Text>
      <Text style={styles.emptySubtitle}>
        Add your addresses to make checkout faster and easier
      </Text>
      <TouchableOpacity
        style={styles.addFirstAddressButton}
        onPress={() => openModal()}
      >
        <Text style={styles.addFirstAddressText}>Add Your First Address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddressModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={closeModal}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </Text>
          <TouchableOpacity 
            onPress={fetchLiveLocation}
            disabled={fetchingLocation}
            style={styles.locationButton}
          >
            {fetchingLocation ? (
              <ActivityIndicator size="small" color="#FF1493" />
            ) : (
              <Icon name="navigate" size={24} color="#FF1493" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.locationHintContainer}>
          <Icon name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.locationHint}>
            Tap the location icon to auto-fill or enter manually below
          </Text>
        </View>

        <ScrollView 
          style={styles.modalBody} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
              placeholder="Enter 10-digit phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="House No, Building, Street, Area"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.landmark}
              onChangeText={(text) => setFormData(prev => ({ ...prev, landmark: text }))}
              placeholder="Nearby landmark"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pincode *</Text>
            <View style={styles.pincodeContainer}>
              <TextInput
                style={[styles.textInput, styles.pincodeInput, { flex: 1 }]}
                value={formData.pincode}
                onChangeText={handlePincodeChange}
                placeholder="6-digit pincode"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={6}
              />
              {pincodeValidating && (
                <ActivityIndicator 
                  size="small" 
                  color="#FF1493" 
                  style={styles.pincodeLoader} 
                />
              )}
              {pincodeValid === true && (
                <Icon 
                  name="checkmark-circle" 
                  size={24} 
                  color="#10B981" 
                  style={styles.pincodeIcon}
                />
              )}
              {pincodeValid === false && (
                <Icon 
                  name="close-circle" 
                  size={24} 
                  color="#E74C3C" 
                  style={styles.pincodeIcon}
                />
              )}
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.city}
                onChangeText={handleCityChange}
                onFocus={() => {
                  setShowCitySuggestions(true);
                  if (formData.city.length >= 2) {
                    fetchCitySuggestions(formData.city);
                  }
                }}
                placeholder="City"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {showCitySuggestions && citySuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
                    {citySuggestions.map((city, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectCity(city)}
                      >
                        <Icon name="location-outline" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.state}
                onChangeText={handleStateChange}
                onFocus={() => {
                  setShowStateSuggestions(true);
                  fetchStateSuggestions(formData.state);
                }}
                placeholder="State"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {showStateSuggestions && stateSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
                    {stateSuggestions.map((state, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectState(state)}
                      >
                        <Icon name="map-outline" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{state}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address Type</Text>
            <View style={styles.addressTypeOptions}>
              {addressTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    formData.addressType === type && styles.selectedTypeOption
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, addressType: type }))}
                >
                  <Icon 
                    name={getAddressTypeIcon(type)} 
                    size={16} 
                    color={formData.addressType === type ? '#fff' : '#FF1493'} 
                  />
                  <Text style={[
                    styles.typeOptionText,
                    formData.addressType === type && styles.selectedTypeOptionText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modalSpacing} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={saveAddress}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingAddress ? 'Update Address' : 'Save Address'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header/>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Icon name="add" size={24} color="#FF1493" />
        </TouchableOpacity>
      </View>

      {addresses.length === 0 ? renderEmptyAddresses() : (
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF1493']}
              tintColor="#FF1493"
            />
          }
        />
      )}

      {renderAddressModal()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
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
  listContainer: {
    padding: 16,
  },
  addressItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addressDetails: {
    marginBottom: 16,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#FF1493',
    marginBottom: 8,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  cityState: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  setDefaultButton: {
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  setDefaultText: {
    color: '#FF1493',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  addFirstAddressButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addFirstAddressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  locationHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  locationHint: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalSpacing: {
    height: 20,
  },
  inputGroup: {
    marginBottom: 20,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F9FA',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  pincodeInput: {
    flex: 1,
  },
  pincodeLoader: {
    position: 'absolute',
    right: 12,
  },
  pincodeIcon: {
    position: 'absolute',
    right: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  addressTypeOptions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF1493',
    backgroundColor: '#fff',
    minWidth: 80,
    justifyContent: 'center',
  },
  selectedTypeOption: {
    backgroundColor: '#FF1493',
  },
  typeOptionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500',
  },
  selectedTypeOptionText: {
    color: '#fff',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  savingButton: {
    backgroundColor: '#FF1493',
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SavedAddressesScreen;