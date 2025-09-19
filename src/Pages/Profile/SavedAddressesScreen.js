import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const SavedAddressesScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
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
  const [saving, setSaving] = useState(false);

  const addressTypes = ['Home', 'Work', 'Other'];

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
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
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        address: address.address,
        landmark: address.landmark || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        addressType: address.addressType
      });
    } else {
      setEditingAddress(null);
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
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAddress(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      address: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'Home'
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    if (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Address is required');
      return false;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'City is required');
      return false;
    }
    if (!formData.state.trim()) {
      Alert.alert('Error', 'State is required');
      return false;
    }
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode)) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
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
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', editingAddress ? 'Address updated successfully' : 'Address added successfully');
        closeModal();
        fetchAddresses();
      } else {
        Alert.alert('Error', data.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
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
              const response = await fetch(`${API_URL}/addresses/${addressId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });

              if (response.ok) {
                setAddresses(prev => prev.filter(addr => addr._id !== addressId));
                Alert.alert('Success', 'Address deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete address');
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address');
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

  const renderAddressItem = ({ item }) => (
    <View style={styles.addressItem}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeContainer}>
          <Icon 
            name={getAddressTypeIcon(item.addressType)} 
            size={20} 
            color="#FF6B9D" 
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
            <Icon name="pencil-outline" size={16} color="#54A0FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteAddress(item._id)}
          >
            <Icon name="trash-outline" size={16} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressDetails}>
        <Text style={styles.fullName}>{item.fullName}</Text>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
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
      <Icon name="location-outline" size={80} color="#FF6B9D" />
      <Text style={styles.emptyTitle}>No Saved Addresses</Text>
      <Text style={styles.emptySubtitle}>
        Add your addresses to make checkout faster
      </Text>
      <TouchableOpacity
        style={styles.addFirstAddressButton}
        onPress={() => openModal()}
      >
        <Text style={styles.addFirstAddressText}>Add Address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddressModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.fullName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                placeholder="Enter full name"
                placeholderTextColor="#B8B8B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#B8B8B8"
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
                placeholderTextColor="#B8B8B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark</Text>
              <TextInput
                style={styles.textInput}
                value={formData.landmark}
                onChangeText={(text) => setFormData(prev => ({ ...prev, landmark: text }))}
                placeholder="Nearby landmark (optional)"
                placeholderTextColor="#B8B8B8"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.city}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#B8B8B8"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.state}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                  placeholder="State"
                  placeholderTextColor="#B8B8B8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={[styles.textInput, { width: '50%' }]}
                value={formData.pincode}
                onChangeText={(text) => setFormData(prev => ({ ...prev, pincode: text }))}
                placeholder="6-digit pincode"
                placeholderTextColor="#B8B8B8"
                keyboardType="numeric"
                maxLength={6}
              />
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
                      color={formData.addressType === type ? '#fff' : '#FF6B9D'} 
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
        </View>
      </View>
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
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Icon name="add" size={24} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      {addresses.length === 0 ? renderEmptyAddresses() : (
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderAddressModal()}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  listContainer: {
    padding: 20,
  },
  addressItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    fontWeight: 'bold',
    color: '#2C3E50',
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
    fontWeight: 'bold',
  },
  addressActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
  addressDetails: {
    marginBottom: 15,
  },
  fullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#54A0FF',
    marginBottom: 8,
    fontWeight: '600',
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
    backgroundColor: '#FF6B9D15',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  setDefaultText: {
    color: '#FF6B9D',
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
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  addFirstAddressButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addFirstAddressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalBody: {
    padding: 20,
    maxHeight: '70%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#F8F8F8',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  addressTypeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    backgroundColor: '#fff',
  },
  selectedTypeOption: {
    backgroundColor: '#FF6B9D',
  },
  typeOptionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  selectedTypeOptionText: {
    color: '#fff',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  savingButton: {
    backgroundColor: '#FF6B9D80',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SavedAddressesScreen;