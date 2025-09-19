import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Header from '../../Components/Header';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

const ProductUploadScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('file');
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    brand: '',
    category: 'skincare',
    price: '',
    originalPrice: '',
    stock: '',
    stockStatus: 'in-stock',
    tags: '',
    variants: [],
    imageUrls: [],
    featured: false
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  const [customVariantName, setCustomVariantName] = useState('');
  const [customVariantValue, setCustomVariantValue] = useState('');
  
  // Offer-related states
  const [showOfferSection, setShowOfferSection] = useState(false);
  const [offerData, setOfferData] = useState({
    offerTitle: '',
    offerDescription: '',
    offerDiscount: '',
    offerStartDate: '',
    offerEndDate: ''
  });
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedProductForOffer, setSelectedProductForOffer] = useState(null);

  const categories = [
    'skincare', 'haircare', 'makeup', 'wellness', 'treatments', 
    'tools', 'supplements', 'accessories', 'bundles'
  ];

  const stockStatuses = [
    { value: 'in-stock', label: 'In Stock', color: '#10B981' },
    { value: 'low-stock', label: 'Low Stock', color: '#F59E0B' },
    { value: 'out-of-stock', label: 'Out of Stock', color: '#EF4444' }
  ];

  const predefinedVariants = {
    'Size': ['Small', 'Medium', 'Large', 'XL'],
    'Color': ['Black', 'White', 'Blue', 'Red', 'Green'],
    'Weight': ['50ml', '100ml', '200ml', '500ml'],
    'Type': ['Cream', 'Lotion', 'Serum', 'Oil']
  };

  const getAuthToken = () => {
    return tokens?.accessToken || user?.token || null;
  };

  useEffect(() => {
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/products?page=1&limit=50&status=all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setExistingProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        Alert.alert('Error', 'Session expired. Please login again.');
        navigation.navigate('Login');
      }
    }
  };

  // Offer-related functions
  const applyOfferToProduct = async (productId, offerInfo) => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      setLoading(true);

      const response = await fetch(`${API_URL}/products/${productId}/apply-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(offerInfo),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Offer applied successfully!');
        fetchExistingProducts(); // Refresh the product list
        setShowOfferModal(false);
        resetOfferForm();
      } else {
        Alert.alert('Error', result.message || 'Failed to apply offer');
      }
    } catch (error) {
      console.error('Apply offer error:', error);
      Alert.alert('Error', 'Failed to apply offer');
    } finally {
      setLoading(false);
    }
  };

  const removeOfferFromProduct = async (productId) => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`${API_URL}/products/${productId}/remove-offer`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Offer removed successfully');
        fetchExistingProducts(); // Refresh the product list
      } else {
        Alert.alert('Error', result.message || 'Failed to remove offer');
      }
    } catch (error) {
      console.error('Remove offer error:', error);
      Alert.alert('Error', 'Failed to remove offer');
    }
  };

  const resetOfferForm = () => {
    setOfferData({
      offerTitle: '',
      offerDescription: '',
      offerDiscount: '',
      offerStartDate: '',
      offerEndDate: ''
    });
  };

  const openOfferModal = (product) => {
    setSelectedProductForOffer(product);
    if (product.offerActive) {
      setOfferData({
        offerTitle: product.offerTitle || '',
        offerDescription: product.offerDescription || '',
        offerDiscount: product.offerDiscount?.toString() || '',
        offerStartDate: product.offerStartDate ? new Date(product.offerStartDate).toISOString().split('T')[0] : '',
        offerEndDate: product.offerEndDate ? new Date(product.offerEndDate).toISOString().split('T')[0] : ''
      });
    } else {
      resetOfferForm();
    }
    setShowOfferModal(true);
  };

  const calculateOfferPrice = (price, discount) => {
    if (!price || !discount) return 0;
    return Math.round(parseFloat(price) * (1 - parseFloat(discount) / 100));
  };

  const selectImages = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 5, 
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        setSelectedImages([...selectedImages, ...response.assets]);
      }
    });
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const addImageUrl = () => {
    if (productData.imageUrls.length >= 5) {
      Alert.alert('Error', 'Maximum 5 images allowed');
      return;
    }
    
    const newUrls = [...productData.imageUrls, ''];
    setProductData({ ...productData, imageUrls: newUrls });
  };

  const updateImageUrl = (index, url) => {
    const newUrls = [...productData.imageUrls];
    newUrls[index] = url;
    setProductData({ ...productData, imageUrls: newUrls });
  };

  const removeImageUrl = (index) => {
    const newUrls = productData.imageUrls.filter((_, i) => i !== index);
    setProductData({ ...productData, imageUrls: newUrls });
  };

  const addPredefinedVariant = (variantName, variantValue) => {
    const newVariant = { name: variantName, value: variantValue };
    const exists = productData.variants.some(v => v.name === variantName && v.value === variantValue);
    if (!exists) {
      setProductData({
        ...productData,
        variants: [...productData.variants, newVariant]
      });
    }
  };

  const addCustomVariant = () => {
    if (!customVariantName.trim() || !customVariantValue.trim()) {
      Alert.alert('Error', 'Please fill both variant name and value');
      return;
    }
    
    const newVariant = { name: customVariantName.trim(), value: customVariantValue.trim() };
    const exists = productData.variants.some(v => v.name === newVariant.name && v.value === newVariant.value);
    
    if (!exists) {
      setProductData({
        ...productData,
        variants: [...productData.variants, newVariant]
      });
      setCustomVariantName('');
      setCustomVariantValue('');
    } else {
      Alert.alert('Error', 'This variant already exists');
    }
  };

  const removeVariant = (index) => {
    const newVariants = productData.variants.filter((_, i) => i !== index);
    setProductData({ ...productData, variants: newVariants });
  };

  const calculateDiscount = () => {
    const price = parseFloat(productData.price);
    const originalPrice = parseFloat(productData.originalPrice);
    
    if (originalPrice && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  };

  const handleStockChange = (text) => {
    const quantity = parseInt(text) || 0;
    let autoStockStatus = 'in-stock';
    
    if (quantity === 0) {
      autoStockStatus = 'out-of-stock';
    } else if (quantity <= 5) {
      autoStockStatus = 'low-stock';
    }
    
    setProductData({ 
      ...productData, 
      stock: text,
      stockStatus: autoStockStatus
    });
  };

  const handleUpload = async () => {
    // Validation
    if (!productData.name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }

    if (!productData.price.trim()) {
      Alert.alert('Error', 'Please enter product price');
      return;
    }

    if (uploadMethod === 'file' && selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    if (uploadMethod === 'url' && productData.imageUrls.filter(url => url.trim()).length === 0) {
      Alert.alert('Error', 'Please enter at least one image URL');
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      navigation.navigate('Login');
      return;
    }

    setLoading(true);

    try {
      let response;

      if (uploadMethod === 'file') {
        // File upload using FormData
        const formData = new FormData();
        
        // Add images
        selectedImages.forEach((image, index) => {
          formData.append('images', {
            uri: image.uri,
            type: image.type,
            name: image.fileName || `product_image_${index}_${Date.now()}.${image.type.split('/')[1]}`,
          });
        });

        // Add product data with explicit stock status and featured
        formData.append('name', productData.name);
        formData.append('description', productData.description || '');
        formData.append('brand', productData.brand || '');
        formData.append('category', productData.category);
        formData.append('price', productData.price);
        if (productData.originalPrice) {
          formData.append('originalPrice', productData.originalPrice);
        }
        formData.append('stock', productData.stock || '0');
        formData.append('stockStatus', productData.stockStatus);
        formData.append('tags', productData.tags);
        formData.append('variants', JSON.stringify(productData.variants));
        formData.append('featured', productData.featured.toString());
        formData.append('status', 'published');

        console.log('Uploading with stock status:', productData.stockStatus);
        console.log('Uploading with featured:', productData.featured);

        response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: formData,
        });
      } else {
        // URL upload using JSON
        const uploadData = {
          name: productData.name,
          description: productData.description || '',
          brand: productData.brand || '',
          category: productData.category,
          price: parseFloat(productData.price),
          originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
          stock: parseInt(productData.stock) || 0,
          stockStatus: productData.stockStatus,
          tags: productData.tags,
          variants: productData.variants,
          imageUrls: productData.imageUrls.filter(url => url.trim()),
          featured: productData.featured,
          status: 'published'
        };

        console.log('Uploading product data:', uploadData);

        response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(uploadData),
        });
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success) {
        Alert.alert('Success', 'Product created successfully!');
        resetForm();
        fetchExistingProducts();
      } else {
        Alert.alert('Error', result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductData({
      name: '',
      description: '',
      brand: '',
      category: 'skincare',
      price: '',
      originalPrice: '',
      stock: '',
      stockStatus: 'in-stock',
      tags: '',
      variants: [],
      imageUrls: [],
      featured: false
    });
    setSelectedImages([]);
    setCustomVariantName('');
    setCustomVariantValue('');
    resetOfferForm();
  };

  const deleteProduct = async (productId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = getAuthToken();
              if (!authToken) {
                Alert.alert('Error', 'Authentication token not found. Please login again.');
                navigation.navigate('Login');
                return;
              }

              const response = await fetch(`${API_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
              });

              const result = await response.json();

              if (result.success) {
                Alert.alert('Success', 'Product deleted successfully');
                fetchExistingProducts();
              } else {
                Alert.alert('Error', result.message || 'Delete failed');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productItem}>
      <Image 
        source={{ uri: item.primaryImage || (item.images && item.images[0]?.url) || 'https://via.placeholder.com/80' }} 
        style={styles.productThumb}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <View style={styles.productNameRow}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          {item.featured && (
            <View style={styles.featuredBadge}>
              <Icon name="star" size={12} color="#FFD700" />
            </View>
          )}
          {item.offerActive && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{item.offerDiscount}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          {item.offerActive && (
            <Text style={styles.offerPrice}>₹{item.offerPrice}</Text>
          )}
        </View>
        <Text style={styles.productCategory}>{item.category}</Text>
        {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
        <View style={styles.stockStatusBadge}>
          <View style={[styles.stockDot, { backgroundColor: getStockStatusColor(item.stockStatus) }]} />
          <Text style={styles.stockStatusText}>{getStockStatusLabel(item.stockStatus)}</Text>
        </View>
        {item.offerActive && item.offerEndDate && (
          <Text style={styles.offerEndDate}>
            Expires: {new Date(item.offerEndDate).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.offerButton]}
          onPress={() => openOfferModal(item)}
        >
          <Icon name={item.offerActive ? "pricetag" : "pricetag-outline"} size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteProduct(item._id)}
        >
          <Icon name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStockStatusColor = (status) => {
    const statusObj = stockStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : '#6B7280';
  };

  const getStockStatusLabel = (status) => {
    const statusObj = stockStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  };

  const discountPercent = calculateDiscount();

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Product</Text>
        </View>

        {/* Upload Method Selector */}
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodButton, uploadMethod === 'file' && styles.activeMethod]}
            onPress={() => setUploadMethod('file')}
          >
            <Icon name="camera" size={18} color={uploadMethod === 'file' ? "#fff" : "#54A0FF"} />
            <Text style={[styles.methodText, uploadMethod === 'file' && styles.activeMethodText]}>
              Upload Images
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.methodButton, uploadMethod === 'url' && styles.activeMethod]}
            onPress={() => setUploadMethod('url')}
          >
            <Icon name="link" size={18} color={uploadMethod === 'url' ? "#fff" : "#54A0FF"} />
            <Text style={[styles.methodText, uploadMethod === 'url' && styles.activeMethodText]}>
              Image Links
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Section */}
        {uploadMethod === 'file' ? (
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageSelector} onPress={selectImages}>
              <Icon name="images-outline" size={40} color="#FF6B9D" />
              <Text style={styles.imageSelectorText}>
                Tap to select images (Max 5)
              </Text>
            </TouchableOpacity>
            
            {selectedImages.length > 0 && (
              <ScrollView horizontal style={styles.selectedImagesContainer}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.selectedImageItem}>
                    <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.urlSection}>
            <Text style={styles.sectionTitle}>Image Links</Text>
            {productData.imageUrls.map((url, index) => (
              <View key={index} style={styles.urlInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={url}
                  onChangeText={(text) => updateImageUrl(index, text)}
                  placeholder="Enter image URL"
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.removeUrlButton}
                  onPress={() => removeImageUrl(index)}
                >
                  <Icon name="trash" size={16} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addUrlButton} onPress={addImageUrl}>
              <Icon name="add" size={20} color="#54A0FF" />
              <Text style={styles.addUrlText}>Add Image URL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Product Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          
          {/* Product Name - Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.textInput}
              value={productData.name}
              onChangeText={(text) => setProductData({ ...productData, name: text })}
              placeholder="Enter product name"
            />
          </View>

          {/* Description - Optional */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={productData.description}
              onChangeText={(text) => setProductData({ ...productData, description: text })}
              placeholder="Product description"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Brand Name - Optional */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Brand Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={productData.brand}
              onChangeText={(text) => setProductData({ ...productData, brand: text })}
              placeholder="Brand name"
            />
          </View>

          {/* Category - Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      productData.category === category && styles.selectedCategory
                    ]}
                    onPress={() => setProductData({ ...productData, category })}
                  >
                    <Text style={[
                      styles.categoryText,
                      productData.category === category && styles.selectedCategoryText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Featured Toggle */}
          <View style={styles.inputGroup}>
            <View style={styles.featuredContainer}>
              <View style={styles.featuredInfo}>
                <Text style={styles.inputLabel}>Featured Product</Text>
                <Text style={styles.featuredSubtext}>Featured products appear first in listings</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, productData.featured && styles.toggleButtonActive]}
                onPress={() => setProductData({ ...productData, featured: !productData.featured })}
              >
                <View style={[styles.toggleSlider, productData.featured && styles.toggleSliderActive]}>
                  <Icon 
                    name={productData.featured ? "star" : "star-outline"} 
                    size={16} 
                    color={productData.featured ? "#FFD700" : "#999"} 
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Section - Required */}
          <View style={styles.priceSection}>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Price * (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={productData.price}
                  onChangeText={(text) => setProductData({ ...productData, price: text })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Original Price (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={productData.originalPrice}
                  onChangeText={(text) => setProductData({ ...productData, originalPrice: text })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Show discount if applicable */}
            {discountPercent > 0 && (
              <View style={styles.discountBadge}>
                <Icon name="pricetag" size={16} color="#4CAF50" />
                <Text style={styles.discountText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>

          {/* Fixed Stock Section */}
          <View style={styles.stockSection}>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Stock Quantity</Text>
                <TextInput
                  style={styles.textInput}
                  value={productData.stock}
                  onChangeText={handleStockChange}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Stock Status</Text>
                <View style={styles.stockStatusContainer}>
                  {stockStatuses.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.stockStatusButton,
                        productData.stockStatus === status.value && styles.selectedStockStatusButton
                      ]}
                      onPress={() => {
                        console.log('Setting stock status to:', status.value);
                        setProductData({ ...productData, stockStatus: status.value });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.radioCircle,
                        productData.stockStatus === status.value && styles.radioCircleSelected
                      ]}>
                        {productData.stockStatus === status.value && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <View style={[styles.stockDot, { backgroundColor: status.color }]} />
                      <Text style={[
                        styles.stockStatusButtonText,
                        productData.stockStatus === status.value && styles.selectedStockStatusButtonText
                      ]}>
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Stock Status Info */}
            <View style={styles.stockStatusInfo}>
              <View style={styles.stockInfoRow}>
                <Icon 
                  name="information-circle-outline" 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.stockInfoText}>
                  Current Status: {stockStatuses.find(s => s.value === productData.stockStatus)?.label}
                </Text>
              </View>
              
              {productData.stock && (
                <Text style={styles.stockQuantityText}>
                  {productData.stock} units available
                </Text>
              )}
            </View>
          </View>

          {/* Tags - Optional */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tags (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={productData.tags}
              onChangeText={(text) => setProductData({ ...productData, tags: text })}
              placeholder="organic, natural, skincare (comma separated)"
            />
          </View>

          {/* Variants Section */}
          <View style={styles.variantSection}>
            <Text style={styles.sectionTitle}>Variants (Optional)</Text>
            
            {/* Show selected variants */}
            {productData.variants.length > 0 && (
              <View style={styles.selectedVariants}>
                {productData.variants.map((variant, index) => (
                  <View key={index} style={styles.variantChip}>
                    <Text style={styles.variantChipText}>
                      {variant.name}: {variant.value}
                    </Text>
                    <TouchableOpacity onPress={() => removeVariant(index)}>
                      <Icon name="close" size={14} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Predefined Variants */}
            <Text style={styles.subSectionTitle}>Quick Add:</Text>
            {Object.keys(predefinedVariants).map((variantName) => (
              <View key={variantName} style={styles.variantGroup}>
                <Text style={styles.variantGroupTitle}>{variantName}:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.variantOptions}>
                    {predefinedVariants[variantName].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={styles.variantOption}
                        onPress={() => addPredefinedVariant(variantName, value)}
                      >
                        <Text style={styles.variantOptionText}>{value}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}

            {/* Custom Variant */}
            <Text style={styles.subSectionTitle}>Add Custom Variant:</Text>
            <View style={styles.customVariantContainer}>
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <TextInput
                    style={styles.textInput}
                    value={customVariantName}
                    onChangeText={setCustomVariantName}
                    placeholder="Variant name (e.g., Material)"
                  />
                </View>
                <View style={styles.halfInput}>
                  <TextInput
                    style={styles.textInput}
                    value={customVariantValue}
                    onChangeText={setCustomVariantValue}
                    placeholder="Value (e.g., Cotton)"
                  />
                </View>
              </View>
              <TouchableOpacity 
                style={styles.addCustomVariantButton} 
                onPress={addCustomVariant}
              >
                <Icon name="add" size={18} color="#fff" />
                <Text style={styles.addCustomVariantText}>Add Custom</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="bag-add" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Add Product
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Products */}
        <View style={styles.existingProductsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Products ({existingProducts.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OfferScreen')}>
              <Text style={styles.viewOffersText}>View All Offers</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={existingProducts.slice(0, 10)}
            renderItem={renderProductItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Offer Management Modal */}
<Modal
  visible={showOfferModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowOfferModal(false)}
>
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.modalOverlay}
  >
    <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProductForOffer?.offerActive ? 'Edit Offer' : 'Add Offer'}
              </Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <Icon name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedProductForOffer && (
                <View style={styles.productPreview}>
                  <Image
                    source={{ 
                      uri: selectedProductForOffer.primaryImage || 
                           (selectedProductForOffer.images?.[0]?.url) || 
                           'https://via.placeholder.com/60'
                    }}
                    style={styles.productPreviewImage}
                  />
                  <View>
                    <Text style={styles.productPreviewName}>{selectedProductForOffer.name}</Text>
                    <Text style={styles.productPreviewPrice}>₹{selectedProductForOffer.price}</Text>
                  </View>
                </View>
              )}

              {/* Offer Form */}
              <View style={styles.offerForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Offer Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={offerData.offerTitle}
                    onChangeText={(text) => setOfferData({ ...offerData, offerTitle: text })}
                    placeholder="e.g., Summer Sale, New Year Deal"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Offer Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={offerData.offerDescription}
                    onChangeText={(text) => setOfferData({ ...offerData, offerDescription: text })}
                    placeholder="Brief description of the offer"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount Percentage * (1-90)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={offerData.offerDiscount}
                    onChangeText={(text) => setOfferData({ ...offerData, offerDiscount: text })}
                    placeholder="e.g., 20"
                    keyboardType="numeric"
                  />
                  {offerData.offerDiscount && selectedProductForOffer && (
                    <View style={styles.pricePreview}>
                      <Text style={styles.pricePreviewText}>
                        Original: ₹{selectedProductForOffer.price} → 
                        Offer: ₹{calculateOfferPrice(selectedProductForOffer.price, offerData.offerDiscount)}
                      </Text>
                      <Text style={styles.savingsPreviewText}>
                        Savings: ₹{selectedProductForOffer.price - calculateOfferPrice(selectedProductForOffer.price, offerData.offerDiscount)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <TextInput
                      style={styles.textInput}
                      value={offerData.offerStartDate}
                      onChangeText={(text) => setOfferData({ ...offerData, offerStartDate: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>End Date *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={offerData.offerEndDate}
                      onChangeText={(text) => setOfferData({ ...offerData, offerEndDate: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedProductForOffer?.offerActive && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.removeOfferButton]}
                  onPress={() => {
                    Alert.alert(
                      'Remove Offer',
                      'Are you sure you want to remove this offer?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            removeOfferFromProduct(selectedProductForOffer._id);
                            setShowOfferModal(false);
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.removeOfferButtonText}>Remove Offer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.applyOfferButton]}
                onPress={() => {
                  if (!offerData.offerTitle.trim()) {
                    Alert.alert('Error', 'Please enter offer title');
                    return;
                  }
                  if (!offerData.offerDiscount.trim() || parseFloat(offerData.offerDiscount) < 1 || parseFloat(offerData.offerDiscount) > 90) {
                    Alert.alert('Error', 'Please enter valid discount (1-90%)');
                    return;
                  }
                  if (!offerData.offerEndDate.trim()) {
                    Alert.alert('Error', 'Please enter offer end date');
                    return;
                  }

                  applyOfferToProduct(selectedProductForOffer._id, {
                    offerTitle: offerData.offerTitle,
                    offerDescription: offerData.offerDescription,
                    offerDiscount: parseFloat(offerData.offerDiscount),
                    offerStartDate: offerData.offerStartDate || null,
                    offerEndDate: offerData.offerEndDate
                  });
                }}
              >
                <Text style={styles.applyOfferButtonText}>
                  {selectedProductForOffer?.offerActive ? 'Update Offer' : 'Apply Offer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  activeMethod: {
    backgroundColor: '#54A0FF',
  },
  methodText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#54A0FF',
  },
  activeMethodText: {
    color: '#fff',
  },
  imageSection: {
    marginBottom: 30,
  },
  imageSelector: {
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  imageSelectorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedImagesContainer: {
    height: 80,
  },
  selectedImageItem: {
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // URL Section
  urlSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  removeUrlButton: {
    marginLeft: 10,
    padding: 8,
  },
  addUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#54A0FF',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  addUrlText: {
    marginLeft: 8,
    color: '#54A0FF',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 10,
    marginTop: 15,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
  },

  // Featured Toggle
  featuredContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleButton: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleSlider: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleSliderActive: {
    left: 30,
  },

  // Categories
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  categoryChip: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedCategory: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  selectedCategoryText: {
    color: '#fff',
  },

  // Price Section
  priceSection: {
    marginBottom: 20,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  discountText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // Fixed Stock Section
  stockSection: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockStatusContainer: {
    marginTop: 8,
    gap: 10,
  },
  stockStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedStockStatusButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FF6B9D',
    shadowColor: '#FF6B9D',
    shadowOpacity: 0.2,
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: '#FF6B9D',
    backgroundColor: '#FFFFFF',
  },
  radioInner: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  stockStatusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  selectedStockStatusButtonText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  stockStatusInfo: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  stockInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  stockQuantityText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 22,
  },

  // Variants Section
  variantSection: {
    marginBottom: 25,
  },
  selectedVariants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  variantChipText: {
    fontSize: 12,
    color: '#1976D2',
    marginRight: 6,
  },
  variantGroup: {
    marginBottom: 15,
  },
  variantGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  variantOptions: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  variantOption: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  variantOptionText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  customVariantContainer: {
    marginTop: 10,
  },
  addCustomVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  addCustomVariantText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },

  // Upload Button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // Existing Products
  existingProductsSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewOffersText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
    marginRight: 8,
  },
  featuredBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 4,
    marginTop: 2,
    marginLeft: 5,
  },
  offerBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 5,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 10,
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  productCategory: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stockStatusText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  offerEndDate: {
    fontSize: 10,
    color: '#E74C3C',
    fontStyle: 'italic',
    marginTop: 2,
  },
  productActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 35,
    height: 35,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerButton: {
    backgroundColor: '#FF6B9D',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },

  // Modal Styles
 modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40, // Add vertical padding
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400, // Set max width instead of percentage
    maxHeight: '85%', // Increased from 80% to 85%
    minHeight: 500, // Add minimum height
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15, // Reduce bottom padding
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1, // This is important - allows content to expand
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10, // Reduce bottom padding
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  productPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  productPreviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  productPreviewPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  offerForm: {
    flex: 1, // Allow form to take available space
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 16, // Reduced from 20 to 16
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
  },
  textArea: {
    height: 60, // Reduced height for modal
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10, // Add gap between inputs
  },
  halfInput: {
    flex: 0.48,
  },
  pricePreview: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  pricePreviewText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  savingsPreviewText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
    gap: 10,
    minHeight: 70, // Ensure minimum footer height
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Minimum touch target
  },
  removeOfferButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeOfferButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  applyOfferButton: {
    backgroundColor: '#FF6B9D',
  },
  applyOfferButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 200,
  },
});

export default ProductUploadScreen;