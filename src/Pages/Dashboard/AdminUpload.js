// src/Pages/Dashboard/AdminUpload.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const AdminUpload = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [activeTab, setActiveTab] = useState('add'); 
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedServiceForOffer, setSelectedServiceForOffer] = useState(null);
  const [imageMode, setImageMode] = useState('upload');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    discount: '',
    category: 'beauty',
    duration: '',
    featured: false,
    tags: '',
    imageUrl: '', 
  });

  const [offerData, setOfferData] = useState({
    offerTitle: '',
    offerDescription: '',
    offerDiscount: '',
    offerStartDate: '',
    offerEndDate: '',
  });

  const [selectedImage, setSelectedImage] = useState(null);

  // Memoize categories to prevent re-renders
  const categories = useMemo(() => [
    'beauty', 'wellness', 'skincare', 'hair', 'massage', 'facial', 'other'
  ], []);

  // Check if user has valid token
  useEffect(() => {
    if (!tokens?.accessToken) {
      Alert.alert(
        'Authentication Error',
        'Please log in again to access this page.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
  }, [tokens, user, navigation]);

  useEffect(() => {
    if ((activeTab === 'manage' || activeTab === 'offers') && tokens?.accessToken) {
      fetchServices();
    }
  }, [activeTab, tokens]);

  const fetchServices = useCallback(async () => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  const handleImagePicker = useCallback(() => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        setFormData(prev => ({...prev, imageUrl: ''}));
      }
    });
  }, []);

  // Form field handlers
  const handleNameChange = useCallback((text) => {
    setFormData(prev => ({...prev, name: text}));
  }, []);

  const handleDescriptionChange = useCallback((text) => {
    setFormData(prev => ({...prev, description: text}));
  }, []);

  const handlePriceChange = useCallback((text) => {
    setFormData(prev => ({...prev, price: text}));
  }, []);

  const handleDurationChange = useCallback((text) => {
    setFormData(prev => ({...prev, duration: text}));
  }, []);

  const handleOriginalPriceChange = useCallback((text) => {
    setFormData(prev => ({...prev, originalPrice: text}));
  }, []);

  const handleDiscountChange = useCallback((text) => {
    setFormData(prev => ({...prev, discount: text}));
  }, []);

  const handleTagsChange = useCallback((text) => {
    setFormData(prev => ({...prev, tags: text}));
  }, []);

  const handleImageUrlChange = useCallback((text) => {
    setFormData(prev => ({...prev, imageUrl: text}));
  }, []);

  const handleCategoryChange = useCallback((value) => {
    setFormData(prev => ({...prev, category: value}));
  }, []);

  const toggleFeatured = useCallback(() => {
    setFormData(prev => ({...prev, featured: !prev.featured}));
  }, []);

  const handleImageModeUpload = useCallback(() => {
    setImageMode('upload');
    setFormData(prev => ({...prev, imageUrl: ''}));
  }, []);

  const handleImageModeUrl = useCallback(() => {
    setImageMode('url');
    setSelectedImage(null);
  }, []);

  // Offer form handlers
  const handleOfferTitleChange = useCallback((text) => {
    setOfferData(prev => ({...prev, offerTitle: text}));
  }, []);

  const handleOfferDescriptionChange = useCallback((text) => {
    setOfferData(prev => ({...prev, offerDescription: text}));
  }, []);

  const handleOfferDiscountChange = useCallback((text) => {
    setOfferData(prev => ({...prev, offerDiscount: text}));
  }, []);

  const handleOfferStartDateChange = useCallback((text) => {
    setOfferData(prev => ({...prev, offerStartDate: text}));
  }, []);

  const handleOfferEndDateChange = useCallback((text) => {
    setOfferData(prev => ({...prev, offerEndDate: text}));
  }, []);

  const resetOfferForm = useCallback(() => {
    setOfferData({
      offerTitle: '',
      offerDescription: '',
      offerDiscount: '',
      offerStartDate: '',
      offerEndDate: '',
    });
    setSelectedServiceForOffer(null);
    setShowOfferModal(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found. Please log in again.');
      return;
    }

    if (!formData.name || !formData.description || !formData.price || !formData.duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const hasImageFile = selectedImage && imageMode === 'upload';
      const hasImageUrl = formData.imageUrl && imageMode === 'url';

      let requestBody;
      let headers = {
        'Authorization': `Bearer ${tokens.accessToken}`,
      };

      if (hasImageFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('price', formData.price);
        formDataToSend.append('category', formData.category);
        formDataToSend.append('duration', formData.duration);
        formDataToSend.append('featured', formData.featured.toString());
        
        if (formData.originalPrice) {
          formDataToSend.append('originalPrice', formData.originalPrice);
        }
        if (formData.discount) {
          formDataToSend.append('discount', formData.discount);
        }
        if (formData.tags) {
          formDataToSend.append('tags', formData.tags);
        }

        formDataToSend.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName || 'service-image.jpg',
        });

        requestBody = formDataToSend;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        const jsonData = {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          category: formData.category,
          duration: formData.duration,
          featured: formData.featured,
        };

        if (formData.originalPrice) {
          jsonData.originalPrice = formData.originalPrice;
        }
        if (formData.discount) {
          jsonData.discount = formData.discount;
        }
        if (formData.tags) {
          jsonData.tags = formData.tags;
        }
        if (hasImageUrl) {
          jsonData.imageUrl = formData.imageUrl;
        }

        requestBody = JSON.stringify(jsonData);
        headers['Content-Type'] = 'application/json';
      }

      const url = editingService 
        ? `${API_URL}/services/${editingService._id}` 
        : `${API_URL}/services`;
      
      const method = editingService ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (data.success) {
        Alert.alert(
          'Success',
          editingService ? 'Service updated successfully!' : 'Service created successfully!',
          [{ text: 'OK', onPress: resetForm }]
        );
        
        if (activeTab === 'manage' || activeTab === 'offers') {
          fetchServices();
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to save service');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [formData, selectedImage, imageMode, tokens, editingService, activeTab, fetchServices, resetForm]);

  const handleApplyOffer = useCallback(async () => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    if (!offerData.offerTitle || !offerData.offerDiscount || !offerData.offerEndDate) {
      Alert.alert('Error', 'Please fill in offer title, discount, and end date');
      return;
    }

    const discount = parseFloat(offerData.offerDiscount);
    if (discount < 1 || discount > 90) {
      Alert.alert('Error', 'Offer discount must be between 1% and 90%');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/services/${selectedServiceForOffer._id}/apply-offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (data.success) {
        Alert.alert(
          'Success',
          'Offer applied successfully!',
          [{ text: 'OK', onPress: resetOfferForm }]
        );
        fetchServices();
      } else {
        Alert.alert('Error', data.message || 'Failed to apply offer');
      }
    } catch (error) {
      console.error('Error applying offer:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerData, tokens, selectedServiceForOffer, resetOfferForm, fetchServices]);

  const handleRemoveOffer = useCallback(async (serviceId) => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    Alert.alert(
      'Remove Offer',
      'Are you sure you want to remove this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/services/${serviceId}/remove-offer`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${tokens.accessToken}`,
                },
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Offer removed successfully!');
                fetchServices();
              } else {
                Alert.alert('Error', data.message || 'Failed to remove offer');
              }
            } catch (error) {
              console.error('Error removing offer:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        },
      ]
    );
  }, [tokens, fetchServices]);

  const handleEdit = useCallback((service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      originalPrice: service.originalPrice?.toString() || '',
      discount: service.discount?.toString() || '',
      category: service.category,
      duration: service.duration.toString(),
      featured: service.featured,
      tags: service.tags?.join(', ') || '',
      imageUrl: service.image_url || '',
    });
    setSelectedImage(service.image_url ? { uri: service.image_url } : null);
    setImageMode(service.image_url ? 'url' : 'upload');
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteService(service._id) },
      ]
    );
  }, []);

  const deleteService = useCallback(async (serviceId) => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (data.success) {
        Alert.alert('Success', 'Service deleted successfully!');
        fetchServices();
      } else {
        Alert.alert('Error', data.message || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [tokens, fetchServices]);

  const toggleServiceStatus = useCallback(async (service) => {
    if (!tokens?.accessToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/services/${service._id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      if (data.success) {
        fetchServices();
      } else {
        Alert.alert('Error', data.message || 'Failed to update service status');
      }
    } catch (error) {
      console.error('Error toggling service status:', error);
    }
  }, [tokens, fetchServices]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      discount: '',
      category: 'beauty',
      duration: '',
      featured: false,
      tags: '',
      imageUrl: '',
    });
    setSelectedImage(null);
    setEditingService(null);
    setShowModal(false);
    setImageMode('upload');
  }, []);

  const getImageSource = useCallback(() => {
    if (imageMode === 'upload' && selectedImage) {
      return selectedImage.uri;
    } else if (imageMode === 'url' && formData.imageUrl) {
      return formData.imageUrl;
    }
    return null;
  }, [imageMode, selectedImage, formData.imageUrl]);

  const openOfferModal = useCallback((service) => {
    setSelectedServiceForOffer(service);
    if (service.offerActive) {
      setOfferData({
        offerTitle: service.offerTitle || '',
        offerDescription: service.offerDescription || '',
        offerDiscount: service.offerDiscount?.toString() || '',
        offerStartDate: service.offerStartDate ? service.offerStartDate.split('T')[0] : '',
        offerEndDate: service.offerEndDate ? service.offerEndDate.split('T')[0] : '',
      });
    }
    setShowOfferModal(true);
  }, []);

  const renderServiceItem = useCallback(({ item }) => (
    <View style={styles.serviceItem}>
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/100x100' }}
        style={styles.serviceItemImage}
      />
      <View style={styles.serviceItemContent}>
        <Text style={styles.serviceItemName}>{item.name}</Text>
        <Text style={styles.serviceItemCategory}>{item.category}</Text>
        <Text style={styles.serviceItemPrice}>₹{item.price}</Text>
        <View style={styles.serviceItemStatus}>
          <Text style={[
            styles.statusText,
            { color: item.isActive ? '#27AE60' : '#E74C3C' }
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
          {item.featured && (
            <Text style={styles.featuredText}>Featured</Text>
          )}
          {item.offerActive && (
            <Text style={styles.offerText}>Offer Active</Text>
          )}
        </View>
      </View>
      <View style={styles.serviceItemActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Icon name="pencil" size={16} color="#3498DB" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleServiceStatus(item)}
        >
          <Icon name={item.isActive ? "eye-off" : "eye"} size={16} color="#F39C12" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Icon name="trash" size={16} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleEdit, handleDelete, toggleServiceStatus]);

  const renderOfferServiceItem = useCallback(({ item }) => (
    <View style={styles.offerServiceItem}>
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/100x100' }}
        style={styles.serviceItemImage}
      />
      <View style={styles.serviceItemContent}>
        <Text style={styles.serviceItemName}>{item.name}</Text>
        <Text style={styles.serviceItemCategory}>{item.category}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.serviceItemPrice}>₹{item.price}</Text>
          {item.offerActive && (
            <Text style={styles.offerPrice}>₹{item.offerPrice}</Text>
          )}
        </View>
        {item.offerActive ? (
          <View style={styles.offerInfo}>
            <Text style={styles.offerTitle}>{item.offerTitle}</Text>
            <Text style={styles.offerDiscount}>{item.offerDiscount}% OFF</Text>
            <Text style={styles.offerEndDate}>
              Ends: {new Date(item.offerEndDate).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noOfferText}>No active offer</Text>
        )}
      </View>
      <View style={styles.offerActions}>
        {item.offerActive ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.removeOfferButton]}
            onPress={() => handleRemoveOffer(item._id)}
          >
            <Icon name="close-circle" size={16} color="#E74C3C" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addOfferButton]}
            onPress={() => openOfferModal(item)}
          >
            <Icon name="add-circle" size={16} color="#27AE60" />
          </TouchableOpacity>
        )}
        {item.offerActive && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openOfferModal(item)}
          >
            <Icon name="pencil" size={16} color="#3498DB" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [handleRemoveOffer, openOfferModal]);

  const getKeyExtractor = useCallback((item) => item._id, []);

  // Format date for input field
  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  }, []);

  // Memoized form component to prevent unnecessary re-renders
  const AddServiceForm = useMemo(() => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Image Mode Selection */}
      <View style={styles.imageModeContainer}>
        <Text style={styles.label}>Image Option</Text>
        <View style={styles.imageModeButtons}>
          <TouchableOpacity
            style={[styles.imageModeButton, imageMode === 'upload' && styles.imageModeButtonActive]}
            onPress={handleImageModeUpload}
          >
            <Text style={[styles.imageModeButtonText, imageMode === 'upload' && styles.imageModeButtonTextActive]}>
              Upload Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.imageModeButton, imageMode === 'url' && styles.imageModeButtonActive]}
            onPress={handleImageModeUrl}
          >
            <Text style={[styles.imageModeButtonText, imageMode === 'url' && styles.imageModeButtonTextActive]}>
              Image URL
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Upload or URL Input */}
      {imageMode === 'upload' ? (
        <TouchableOpacity style={styles.imageUpload} onPress={handleImagePicker}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon name="camera" size={32} color="#BDC3C7" />
              <Text style={styles.uploadText}>Tap to upload image</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput
            style={styles.input}
            value={formData.imageUrl}
            onChangeText={handleImageUrlChange}
            placeholder="https://example.com/image.jpg"
            autoCapitalize="none"
          />
          {formData.imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: formData.imageUrl }} 
                style={styles.imagePreview}
                onError={() => Alert.alert('Error', 'Invalid image URL')}
              />
            </View>
          ) : null}
        </View>
      )}

      {/* Form Fields */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={handleNameChange}
          placeholder="Enter service name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={handleDescriptionChange}
          placeholder="Enter service description"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Price *</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={handlePriceChange}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Duration (min) *</Text>
          <TextInput
            style={styles.input}
            value={formData.duration}
            onChangeText={handleDurationChange}
            placeholder="30"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Original Price</Text>
          <TextInput
            style={styles.input}
            value={formData.originalPrice}
            onChangeText={handleOriginalPriceChange}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.label}>Discount (%)</Text>
          <TextInput
            style={styles.input}
            value={formData.discount}
            onChangeText={handleDiscountChange}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.category}
            onValueChange={handleCategoryChange}
            style={styles.picker}
          >
            {categories.map((cat) => (
              <Picker.Item 
                key={cat} 
                label={cat.charAt(0).toUpperCase() + cat.slice(1)} 
                value={cat} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={formData.tags}
          onChangeText={handleTagsChange}
          placeholder="relaxing, spa, beauty"
        />
      </View>

      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={toggleFeatured}
      >
        <Icon 
          name={formData.featured ? "checkbox" : "square-outline"} 
          size={24} 
          color="#FF6B9D" 
        />
        <Text style={styles.checkboxLabel}>Featured Service</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {editingService ? 'Update Service' : 'Create Service'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  ), [
    formData,
    selectedImage,
    imageMode,
    loading,
    editingService,
    categories,
    handleNameChange,
    handleDescriptionChange,
    handlePriceChange,
    handleDurationChange,
    handleOriginalPriceChange,
    handleDiscountChange,
    handleTagsChange,
    handleImageUrlChange,
    handleCategoryChange,
    toggleFeatured,
    handleSubmit,
    handleImagePicker,
    handleImageModeUpload,
    handleImageModeUrl,
  ]);

  const ServiceModal = useMemo(() => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetForm}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Service</Text>
          <TouchableOpacity onPress={resetForm}>
            <Icon name="close" size={24} color="#2C3E50" />
          </TouchableOpacity>
        </View>
        {AddServiceForm}
      </SafeAreaView>
    </Modal>
  ), [showModal, resetForm, AddServiceForm]);

  const OfferModal = useMemo(() => (
    <Modal
      visible={showOfferModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetOfferForm}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedServiceForOffer?.offerActive ? 'Edit Offer' : 'Apply Offer'}
          </Text>
          <TouchableOpacity onPress={resetOfferForm}>
            <Icon name="close" size={24} color="#2C3E50" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {selectedServiceForOffer && (
            <View style={styles.serviceInfoCard}>
              <Image 
                source={{ uri: selectedServiceForOffer.image_url || 'https://via.placeholder.com/100x100' }}
                style={styles.serviceInfoImage}
              />
              <View style={styles.serviceInfoContent}>
                <Text style={styles.serviceInfoName}>{selectedServiceForOffer.name}</Text>
                <Text style={styles.serviceInfoPrice}>₹{selectedServiceForOffer.price}</Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Offer Title *</Text>
            <TextInput
              style={styles.input}
              value={offerData.offerTitle}
              onChangeText={handleOfferTitleChange}
              placeholder="Special Weekend Deal"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Offer Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={offerData.offerDescription}
              onChangeText={handleOfferDescriptionChange}
              placeholder="Limited time offer with exclusive benefits"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Discount Percentage (1-90%) *</Text>
            <TextInput
              style={styles.input}
              value={offerData.offerDiscount}
              onChangeText={handleOfferDiscountChange}
              placeholder="25"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={offerData.offerStartDate}
                onChangeText={handleOfferStartDateChange}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.helperText}>Leave empty for immediate start</Text>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                value={offerData.offerEndDate}
                onChangeText={handleOfferEndDateChange}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {offerData.offerDiscount && selectedServiceForOffer && (
            <View style={styles.offerPreview}>
              <Text style={styles.offerPreviewTitle}>Offer Preview</Text>
              <View style={styles.offerPreviewContent}>
                <Text style={styles.originalPricePreview}>
                  Original Price: ₹{selectedServiceForOffer.price}
                </Text>
                <Text style={styles.offerPricePreview}>
                  Offer Price: ₹{Math.round(selectedServiceForOffer.price * (1 - (parseFloat(offerData.offerDiscount) || 0) / 100))}
                </Text>
                <Text style={styles.savingsPreview}>
                  You Save: ₹{selectedServiceForOffer.price - Math.round(selectedServiceForOffer.price * (1 - (parseFloat(offerData.offerDiscount) || 0) / 100))}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleApplyOffer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {selectedServiceForOffer?.offerActive ? 'Update Offer' : 'Apply Offer'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  ), [showOfferModal, resetOfferForm, selectedServiceForOffer, offerData, loading, handleApplyOffer, handleOfferTitleChange, handleOfferDescriptionChange, handleOfferDiscountChange, handleOfferStartDateChange, handleOfferEndDateChange]);

  // Don't render the component if no valid token
  if (!tokens?.accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
            Add Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>
            Manage Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            Manage Offers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'add' ? (
        AddServiceForm
      ) : activeTab === 'manage' ? (
        <View style={styles.manageContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B9D" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : (
            <FlatList
              data={services}
              renderItem={renderServiceItem}
              keyExtractor={getKeyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          )}
        </View>
      ) : (
        <View style={styles.manageContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B9D" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : (
            <>
              <View style={styles.offersHeader}>
                <Text style={styles.offersHeaderText}>
                  Services with Active Offers: {services.filter(s => s.offerActive).length}
                </Text>
              </View>
              <FlatList
                data={services}
                renderItem={renderOfferServiceItem}
                keyExtractor={getKeyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.servicesList}
              />
            </>
          )}
        </View>
      )}

      {ServiceModal}
      {OfferModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },

  // Header
  header: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FF6B9D',
  },
  activeTabText: {
    color: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },

  // Form
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  picker: {
    padding: 10,
  },

  // Image Mode
  imageModeContainer: {
    marginBottom: 20,
  },
  imageModeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  imageModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    alignItems: 'center',
  },
  imageModeButtonActive: {
    backgroundColor: '#FF6B9D',
  },
  imageModeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  imageModeButtonTextActive: {
    color: '#fff',
  },

  // Image Upload
  imageUpload: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#BDC3C7',
  },
  uploadedImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2C3E50',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Services List
  manageContainer: {
    flex: 1,
    padding: 20,
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceItemContent: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceItemCategory: {
    fontSize: 14,
    color: '#7F8C8D',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  serviceItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
  },
  serviceItemStatus: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  featuredText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F39C12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
  },
  offerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  serviceItemActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Offer Management
  offersHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  offersHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  
  offerServiceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  offerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
    marginLeft: 8,
  },
  
  offerInfo: {
    marginTop: 4,
  },
  
  offerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 2,
  },
  
  offerDiscount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 2,
  },
  
  offerEndDate: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  
  noOfferText: {
    fontSize: 14,
    color: '#BDC3C7',
    fontStyle: 'italic',
  },
  
  offerActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  
  addOfferButton: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  
  removeOfferButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },

  // Service Info Card in Offer Modal
  serviceInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  serviceInfoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceInfoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceInfoPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },

  // Offer Preview
  offerPreview: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  offerPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  offerPreviewContent: {
    gap: 4,
  },
  originalPricePreview: {
    fontSize: 14,
    color: '#7F8C8D',
    textDecorationLine: 'line-through',
  },
  offerPricePreview: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  savingsPreview: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: '#7F8C8D',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AdminUpload;