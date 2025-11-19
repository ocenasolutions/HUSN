// src/Pages/Dashboard/Dashboard.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth >= 750;

const Dashboard = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('Services');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState({
    products: true,
    services: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  
  const [productCartItems, setProductCartItems] = useState(new Map());
  const [productCartCount, setProductCartCount] = useState(0);
  const [servicesInCart, setServicesInCart] = useState(new Set());
  const [serviceCartCount, setServiceCartCount] = useState(0);
  
  const [wishlistItems, setWishlistItems] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredServices, setFeaturedServices] = useState([]);
  const [newServices, setNewServices] = useState([]);
  const [categoryServices, setCategoryServices] = useState({});

  // Animated placeholder states
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const placeholderTranslateY = useRef(new Animated.Value(0)).current;
  const placeholderOpacity = useRef(new Animated.Value(1)).current;

  const servicePlaceholders = [
    `Search for ${activeTab.toLowerCase()}`,
    'Search what you need',
    "Find what you're looking for"
  ];

  const productPlaceholders = [
    `Search for ${activeTab.toLowerCase()}`,
    'Search what you need',
    "Find what you're looking for"
  ];

  const currentPlaceholders = activeTab === 'Services' ? servicePlaceholders : productPlaceholders;

  // Animated placeholder effect
  useEffect(() => {
    if (searchText.length > 0) return; // Don't animate if user is typing

    const animatePlaceholder = () => {
      Animated.sequence([
        // Slide up and fade out
        Animated.parallel([
          Animated.timing(placeholderTranslateY, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(placeholderOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Reset position and update text
        Animated.timing(placeholderTranslateY, {
          toValue: 20,
          duration: 0,
          useNativeDriver: true,
        }),
        // Slide down and fade in
        Animated.parallel([
          Animated.timing(placeholderTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(placeholderOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      setCurrentPlaceholderIndex((prevIndex) => 
        (prevIndex + 1) % currentPlaceholders.length
      );
    };

    const interval = setInterval(animatePlaceholder, 3000);

    return () => clearInterval(interval);
  }, [searchText, currentPlaceholders.length, activeTab]);

  // Reset placeholder animation when tab changes
  useEffect(() => {
    setCurrentPlaceholderIndex(0);
    placeholderTranslateY.setValue(0);
    placeholderOpacity.setValue(1);
  }, [activeTab]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    fetchAllData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        if (activeTab === 'Products') {
          fetchProductCart();
          fetchWishlist();
        } else {
          fetchServiceCart();
        }
      }
    }, [activeTab, user, tokens])
  );

  useEffect(() => {
    if (user) {
      if (activeTab === 'Products') {
        fetchProductCart();
        fetchWishlist();
      } else {
        fetchServiceCart();
      }
    }
  }, [activeTab, user]);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchAllData = async () => {
    fetchServices();
    fetchProducts();
    fetchProductCategories();
    fetchServiceCategories();
    if (user) {
      fetchProductCart();
      fetchServiceCart();
      fetchWishlist();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchServices = async () => {
    try {
      setLoading(prev => ({ ...prev, services: true }));
      
      const response = await fetch(`${API_URL}/services?limit=100&status=published`);
      const data = await response.json();
      
      if (data.success) {
        const servicesData = data.data || [];
        setServices(servicesData);
        
        const grouped = {};
        servicesData.forEach(service => {
          if (!grouped[service.category]) {
            grouped[service.category] = [];
          }
          grouped[service.category].push(service);
        });
        setCategoryServices(grouped);
        
        const featured = servicesData.filter(service => service.featured || service.is_featured);
        setFeaturedServices(featured.slice(0, 4));
        
        const newest = [...servicesData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
        setNewServices(newest);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      
      const response = await fetch(`${API_URL}/products?limit=100&status=published`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setProducts(data.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchProductCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/products/categories`);
      const data = await response.json();
      
      if (data.success) {
        setProductCategories([
          { name: 'all', label: 'All' }, 
          ...data.data.map(cat => ({ 
            name: cat, 
            label: cat.charAt(0).toUpperCase() + cat.slice(1) 
          }))
        ]);
      }
    } catch (error) {
      console.error('Error fetching product categories:', error);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/services/categories`);
      const data = await response.json();
      
      if (data.success) {
        setServiceCategories([
          { name: 'all', label: 'All' },
          ...data.data.map(cat => ({ 
            name: cat, 
            label: cat.charAt(0).toUpperCase() + cat.slice(1) 
          }))
        ]);
      }
    } catch (error) {
      console.error('Error fetching service categories:', error);
    }
  };

  const fetchProductCart = async () => {
    if (!user) {
      setProductCartItems(new Map());
      setProductCartCount(0);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setProductCartCount(data.data.totalItems);
        
        const itemsMap = new Map();
        data.data.items.forEach(item => {
          itemsMap.set(item.product._id, {
            cartItemId: item._id,
            quantity: item.quantity
          });
        });
        setProductCartItems(itemsMap);
      }
    } catch (error) {
      console.error('Error fetching product cart:', error);
    }
  };

  const fetchServiceCart = async () => {
    if (!user) {
      setServicesInCart(new Set());
      setServiceCartCount(0);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        const cartServiceIds = new Set(
          data.data.items.map(item => item.service?._id || item.serviceId)
        );
        setServicesInCart(cartServiceIds);
        setServiceCartCount(cartServiceIds.size);
      }
    } catch (error) {
      console.error('Error fetching service cart:', error);
    }
  };

  const fetchWishlist = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setWishlistItems(data.data.map(item => item.product._id));
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleSearch = () => {
    if (!searchText.trim()) return;
    navigation.navigate('SearchResults', { query: searchText });
  };

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const navigateToService = (service) => {
    navigation.navigate('ServiceDetails', { service });
  };

  const toggleWishlist = async (product) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to wishlist');
      return;
    }

    const isInWishlist = wishlistItems.includes(product._id);

    try {
      if (isInWishlist) {
        const response = await fetch(`${API_URL}/wishlist/${product._id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setWishlistItems(prev => prev.filter(id => id !== product._id));
        }
      } else {
        const response = await fetch(`${API_URL}/wishlist/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ productId: product._id })
        });

        const data = await response.json();
        if (data.success) {
          setWishlistItems(prev => [...prev, product._id]);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const ProductQuickAddButton = ({ product }) => {
    const cartItem = productCartItems.get(product._id);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const handleAddToCart = async (e) => {
      e?.stopPropagation();
      
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to cart');
        return;
      }

      setIsUpdating(true);

      try {
        const response = await fetch(`${API_URL}/product-cart/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            productId: product._id,
            quantity: 1
          })
        });

        const data = await response.json();
        if (data.success) {
          await fetchProductCart();
        } else {
          Alert.alert('Error', data.message || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add to cart');
      } finally {
        setIsUpdating(false);
      }
    };
    
    const handleUpdateQuantity = async (newQuantity, e) => {
      e?.stopPropagation();
      
      if (newQuantity < 1 || isUpdating) return;
      
      if (newQuantity > product.stock) {
        Alert.alert('Stock Limit', `Only ${product.stock} items available in stock`);
        return;
      }
      
      setIsUpdating(true);
      
      try {
        const response = await fetch(`${API_URL}/product-cart/${cartItem.cartItemId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ quantity: newQuantity })
        });
        
        const data = await response.json();
        if (data.success) {
          await fetchProductCart();
        } else {
          Alert.alert('Error', data.message || 'Failed to update quantity');
        }
      } catch (error) {
        console.error('Update quantity error:', error);
        Alert.alert('Error', 'Failed to update quantity');
      } finally {
        setIsUpdating(false);
      }
    };
    
    if (!cartItem || !cartItem.quantity) {
      return (
        <TouchableOpacity
          style={styles.addToBagButton}
          onPress={handleAddToCart}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#D76D77" />
          ) : (
            <Text style={styles.addToBagText}>Add to Bag</Text>
          )}
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.quantityControlWithCorners}>
        <TouchableOpacity
          style={[styles.cornerQuantityButton, styles.cornerLeftButton]}
          onPress={(e) => handleUpdateQuantity(cartItem.quantity - 1, e)}
          disabled={isUpdating}
        >
          <Icon name="remove" size={16} color="#D76D77" />
        </TouchableOpacity>
        
        <View style={styles.quantityDisplayCenter}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#D76D77" />
          ) : (
            <Text style={styles.quantityTextCenter}>{cartItem.quantity}</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.cornerQuantityButton, styles.cornerRightButton]}
          onPress={(e) => handleUpdateQuantity(cartItem.quantity + 1, e)}
          disabled={isUpdating}
        >
          <Icon name="add" size={16} color="#D76D77" />
        </TouchableOpacity>
      </View>
    );
  };

  const ServiceQuickAddButton = ({ service }) => {
    const [serviceQuantity, setServiceQuantity] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    
    useEffect(() => {
      const fetchServiceQuantity = async () => {
        if (!user || !servicesInCart.has(service._id)) {
          setServiceQuantity(0);
          return;
        }
        
        try {
          const response = await fetch(`${API_URL}/cart`, {
            headers: getAuthHeaders()
          });
          const data = await response.json();
          
          if (data.success) {
            const cartItem = data.data.items.find(
              item => (item.service?._id || item.serviceId) === service._id
            );
            setServiceQuantity(cartItem ? cartItem.quantity : 0);
          }
        } catch (error) {
          console.error('Fetch quantity error:', error);
        }
      };
      
      fetchServiceQuantity();
    }, [servicesInCart, service._id]);

    const handleAddToCart = async (e) => {
      e?.stopPropagation();
      
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to cart');
        return;
      }

      setIsUpdating(true);

      try {
        const response = await fetch(`${API_URL}/cart/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            serviceId: service._id,
            quantity: 1,
            selectedDate: new Date().toISOString(),
            notes: ''
          })
        });

        const data = await response.json();
        if (data.success) {
          await fetchServiceCart();
        } else {
          Alert.alert('Error', data.message || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add to cart');
      } finally {
        setIsUpdating(false);
      }
    };
      
    const handleUpdateQuantity = async (newQuantity, e) => {
      e?.stopPropagation();
      
      if (newQuantity < 0 || isUpdating) return;
      
      setIsUpdating(true);
      
      try {
        const cartResponse = await fetch(`${API_URL}/cart`, {
          headers: getAuthHeaders()
        });
        const cartData = await cartResponse.json();
        
        if (!cartData.success) {
          Alert.alert('Error', 'Failed to fetch cart');
          return;
        }
        
        const cartItem = cartData.data.items.find(
          item => (item.service?._id || item.serviceId) === service._id
        );
        
        if (!cartItem) {
          setServiceQuantity(0);
          await fetchServiceCart();
          return;
        }
        
        if (newQuantity === 0) {
          const response = await fetch(`${API_URL}/cart/${cartItem._id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          
          const data = await response.json();
          if (data.success) {
            await fetchServiceCart();
          } else {
            Alert.alert('Error', data.message || 'Failed to remove item');
          }
        } else {
          const response = await fetch(`${API_URL}/cart/${cartItem._id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
          });
          
          const data = await response.json();
          if (data.success) {
            await fetchServiceCart();
          } else {
            Alert.alert('Error', data.message || 'Failed to update quantity');
          }
        }
      } catch (error) {
        console.error('Update quantity error:', error);
        Alert.alert('Error', 'Failed to update quantity');
      } finally {
        setIsUpdating(false);
      }
    };
    
    const isInCart = servicesInCart.has(service._id);
    
    if (isInCart && serviceQuantity > 0) {
      return (
        <View style={styles.serviceQuantityControl}>
          <TouchableOpacity
            style={styles.serviceQuantityButton}
            onPress={(e) => handleUpdateQuantity(serviceQuantity - 1, e)}
            disabled={isUpdating}
          >
            <Text style={styles.serviceQuantityButtonText}>−</Text>
          </TouchableOpacity>
          
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" style={styles.serviceQuantityText} />
          ) : (
            <Text style={styles.serviceQuantityText}>{serviceQuantity}</Text>
          )}
          
          <TouchableOpacity
            style={styles.serviceQuantityButton}
            onPress={(e) => handleUpdateQuantity(serviceQuantity + 1, e)}
            disabled={isUpdating}
          >
            <Text style={styles.serviceQuantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        style={styles.serviceQuickAddButton}
        onPress={handleAddToCart}
        disabled={isUpdating}
      >
        <Icon name="add" size={18} color="#FFF" />
        <Text style={styles.serviceQuickAddText}>Add</Text>
      </TouchableOpacity>
    );
  };

  const renderStars = (rating, size = 12) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Icon key={i} name="star" size={size} color="#FFD700" style={{ marginRight: 1 }} />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Icon key={i} name="star-half" size={size} color="#FFD700" style={{ marginRight: 1 }} />
        );
      } else {
        stars.push(
          <Icon key={i} name="star-outline" size={size} color="#FFD700" style={{ marginRight: 1 }} />
        );
      }
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  const renderProductItem = ({ item }) => {
    const isInWishlist = wishlistItems.includes(item._id);
    const isOutOfStock = item.stock === 0 || item.stock < 1;
    const averageRating = item.rating || 0;  
    const totalReviews = item.reviewCount || 0;
    
    return (
      <View style={styles.productCardContainer}>
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigateToProduct(item)}
        >
          <View style={styles.productImageContainer}>
            <Image 
              source={{ 
                uri: item.primaryImage || item.images?.[0]?.url || 'https://via.placeholder.com/150x150' 
              }} 
              style={[styles.productImage, isOutOfStock && styles.productImageOutOfStock]}
              resizeMode="cover"
            />
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.favoriteButton, isInWishlist && styles.favoriteButtonActive]}
              onPress={() => toggleWishlist(item)}
            >
              <Icon 
                name={isInWishlist ? "heart" : "heart-outline"} 
                size={16} 
                color={isInWishlist ? "#FFF" : "#8E8E8F"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.productInfo}>
            <View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.productRatingContainer}>
                {renderStars(averageRating, 12)}
                <Text style={styles.productRatingText}>
                  {averageRating.toFixed(1)} ({totalReviews})
                </Text>
              </View>
              <Text style={styles.productPrice}>₹{item.price}</Text>
            </View>
            
            <View style={styles.productActions}>
              {!isOutOfStock && <ProductQuickAddButton product={item} />}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderServiceItem = ({ item }) => {
    const averageRating = item.rating || 0;
    const totalReviews = item.reviewCount || 0;
    
    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigateToService(item)}
      >
        <Image 
          source={{ uri: item.image_url || 'https://via.placeholder.com/80x80' }} 
          style={styles.serviceImage}
          resizeMode="cover"
        />
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.serviceCategory}>{item.category}</Text>
          
          {averageRating > 0 && (
            <View style={styles.serviceRating}>
              <View style={styles.starContainer}>
                {renderStars(averageRating, 14)}
              </View>
              <Text style={styles.ratingCount}>({totalReviews})</Text>
            </View>
          )}
          
          <View style={styles.serviceFooter}>
            <Text style={styles.servicePrice}>₹{item.price}</Text>
            {item.duration && (
              <View style={styles.durationBadge}>
                <Icon name="time-outline" size={12} color="#666" />
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}
          </View>
        </View>
        
        <ServiceQuickAddButton service={item} />
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.name && styles.selectedCategoryChip
      ]}
      onPress={() => setSelectedCategory(item.name)}
    >
      <Text style={[
        styles.categoryChipText,
        selectedCategory === item.name && styles.selectedCategoryChipText
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const getFilteredData = () => {
    const currentData = activeTab === 'Services' ? services : products;
    
    let filtered = currentData;
    
    if (searchText.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    return filtered;
  };

  const getFirstServiceImage = (category) => {
    const categoryServicesList = categoryServices[category];
    if (categoryServicesList && categoryServicesList.length > 0) {
      return categoryServicesList[0].image_url || 'https://via.placeholder.com/100x100';
    }
    return 'https://via.placeholder.com/100x100';
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setSearchText('');
  };

  const currentCategories = activeTab === 'Services' ? serviceCategories : productCategories;
  const filteredData = getFilteredData();
  const isLoading = activeTab === 'Services' ? loading.services : loading.products;
  const cartCount = activeTab === 'Services' ? serviceCartCount : productCartCount;
  const cartRoute = activeTab === 'Services' ? 'ViewCart' : 'ViewCart';

  const ListHeader = () => (
    <>
      {currentCategories.length > 0 && (
        <View style={styles.categoriesSection}>
          <FlatList
            data={currentCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}
      
      {activeTab === 'Services' && !searchText.trim() && selectedCategory === 'all' && (
        <>
          {serviceCategories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Categories</Text>
              <View style={styles.categoriesGrid}>
                {serviceCategories.slice(0, 4).map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(cat.name)}
                  >
                    <Image
                      source={{ uri: getFirstServiceImage(cat.name) }}
                      style={styles.categoryIcon}
                      resizeMode="cover"
                    />
                    <Text style={styles.categoryTitle}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {newServices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Newly Added Services</Text>
              <View style={styles.newServicesGrid}>
                {newServices.map((service) => (
                  <TouchableOpacity
                    key={service._id}
                    style={styles.newServiceCard}
                    onPress={() => navigateToService(service)}
                  >
                    <Image
                      source={{ uri: service.image_url || 'https://via.placeholder.com/60x60' }}
                      style={styles.newServiceIcon}
                      resizeMode="cover"
                    />
                    <Text style={styles.newServiceTitle} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <ServiceQuickAddButton service={service} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.allServicesHeader}>
            <Text style={styles.sectionTitle}>All Services</Text>
          </View>
        </>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <Header />
      
      <Animated.View style={[styles.tabSection, { opacity: fadeAnim }]}>
        <View style={styles.elegantTabs}>
          <TouchableOpacity
            style={[styles.elegantTab, activeTab === 'Services' && styles.elegantTabActive]}
            onPress={() => {
              setActiveTab('Services');
              setSelectedCategory('all');
              setSearchText('');
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.elegantTabText, 
              activeTab === 'Services' && styles.elegantTabTextActive
            ]}>
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.elegantTab, activeTab === 'Products' && styles.elegantTabActive]}
            onPress={() => {
              setActiveTab('Products');
              setSelectedCategory('all');
              setSearchText('');
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.elegantTabText, 
              activeTab === 'Products' && styles.elegantTabTextActive
            ]}>
              Products
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search bar with animated placeholder */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={18} color="#8E8E8F" />
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="transparent"
            />
            {searchText.length === 0 && (
              <Animated.Text
                style={[
                  styles.animatedPlaceholder,
                  {
                    opacity: placeholderOpacity,
                    transform: [{ translateY: placeholderTranslateY }]
                  }
                ]}
                pointerEvents="none"
              >
                {currentPlaceholders[currentPlaceholderIndex]}
              </Animated.Text>
            )}
          </View>
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close-circle" size={20} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading {activeTab.toLowerCase()}...</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={activeTab === 'Services' ? renderServiceItem : renderProductItem}
          keyExtractor={(item) => item._id}
          numColumns={activeTab === 'Products' ? 2 : 1}
          key={activeTab}
          columnWrapperStyle={activeTab === 'Products' ? styles.productRow : null}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#D76D77']}
              tintColor="#D76D77"
            />
          }
        />
      )}

      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => navigation.navigate(cartRoute)}
          activeOpacity={0.9}
        >
          <View style={styles.cartButtonContent}>
            <Text style={styles.cartButtonText}>View Cart</Text>
            <View style={{ position: 'relative' }}>
              <Icon name="cart" size={24} color="#D76D77" />
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flatListContent: {
    paddingBottom: 100,
  },
  
  // Tab Section
  tabSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  elegantTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elegantTab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  elegantTabActive: {
    backgroundColor: '#000',
  },
  elegantTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  elegantTabTextActive: {
    color: '#FFF',
  },

  // Search Section with Animated Placeholder
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputWrapper: {
    flex: 1,
    marginLeft: 10,
    position: 'relative',
    justifyContent: 'center',
    height: 20,
    overflow: 'hidden',
  },
  searchInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    fontSize: 15,
    color: '#333',
    fontWeight: '400',
    padding: 0,
    margin: 0,
  },
  animatedPlaceholder: {
    position: 'absolute',
    left: 0,
    fontSize: 15,
    color: '#8E8E8F',
    fontWeight: '400',
  },

  // Categories Section
  categoriesSection: {
    paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryChip: {
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCategoryChip: {
    backgroundColor: '#000',
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  selectedCategoryChipText: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Service Sections
  section: {
    marginBottom: 28,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // Popular Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  categoryIcon: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Newly Added Services Grid
  newServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
  },
  newServiceCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  newServiceIcon: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  newServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 18,
    letterSpacing: 0.2,
  },

  // All Services Header
  allServicesHeader: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  // Product Styles
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCardContainer: {
    width: '49%',
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 330,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  productImageContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  productImageOutOfStock: {
    opacity: 0.5,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteButtonActive: {
    backgroundColor: '#D76D77',
  },
  productInfo: {
    padding: 12,
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
    height: 36,
    letterSpacing: 0.2,
  },
  productRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  productRatingText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  productActions: {
    marginTop: 'auto',
  },
  addToBagButton: {
    backgroundColor: '#F5C6CB',
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    alignSelf: 'center',
    width: '110%',
  },
  addToBagText: {
    color: '#D76D77',
    fontSize: 14,
    fontWeight: '500',
  },
  quantityControlWithCorners: {
    position: 'relative',
    backgroundColor: '#F5C6CB',
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    alignSelf: 'center',
    width: '110%',
    height: 32,
    justifyContent: 'center',
  },
  cornerQuantityButton: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cornerLeftButton: {
    left: 4,
  },
  cornerRightButton: {
    right: 4,
  },
  quantityDisplayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextCenter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D76D77',
  },

  // Service Styles
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  serviceImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  serviceCategory: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 8,
    fontWeight: '500',
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 6,
    fontWeight: '500',
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  serviceQuickAddButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  serviceQuickAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  serviceQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    position: 'absolute',
    bottom: 14,
    right: 14,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  serviceQuantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceQuantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 20,
  },
  serviceQuantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginHorizontal: 14,
    minWidth: 22,
    textAlign: 'center',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#FFF',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Floating Cart Button
  floatingCartButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 160,
    height: 56,
    backgroundColor: '#F5C6CB',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#D76D77',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  cartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    position: 'absolute',
    top: -8,
    right: -6,
    fontSize: 11,
    fontWeight: '900',
    color: '#D76D77',
  },
  cartButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D76D77',
    marginRight: 12,
    letterSpacing: 0.5,
  },
});

export default Dashboard;