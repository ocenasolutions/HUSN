import React, { useState, useEffect } from 'react';
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
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ServicesPage = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryServices, setCategoryServices] = useState({});
  const [featuredServices, setFeaturedServices] = useState([]);
  const [newServices, setNewServices] = useState([]);
  const [offers, setOffers] = useState([]);
  const [servicesInCart, setServicesInCart] = useState(new Set());

  const [sortBy, setSortBy] = useState('default');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchOffers();
    fetchCartStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCartStatus();
    }, [tokens])
  );

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchText, services, sortBy, selectedCategory, priceRange]);

  const fetchCartStatus = async () => {
    if (!tokens?.accessToken) {
      setServicesInCart(new Set());
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const cartServiceIds = new Set(
          data.data.items.map(item => item.service?._id || item.serviceId)
        );
        setServicesInCart(cartServiceIds);
      }
    } catch (error) {
      console.error('Fetch cart status error:', error);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
        groupServicesByCategory(data.data);
        
        const featured = data.data.filter(service => service.featured || service.is_featured);
        const newest = data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
        
        setFeaturedServices(featured.slice(0, 4));
        setNewServices(newest);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/services/categories`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await fetch(`${API_URL}/offers`);
      const data = await response.json();
      
      if (data.success) {
        setOffers(data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const groupServicesByCategory = (servicesData) => {
    const grouped = {};
    servicesData.forEach(service => {
      if (!grouped[service.category]) {
        grouped[service.category] = [];
      }
      grouped[service.category].push(service);
    });
    setCategoryServices(grouped);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...services];

    if (searchText.trim()) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchText.toLowerCase()) ||
        service.description.toLowerCase().includes(searchText.toLowerCase()) ||
        service.category.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    filtered = filtered.filter(service => 
      service.price >= priceRange.min && service.price <= priceRange.max
    );

    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    setFilteredServices(filtered);
  };

  const handleServicePress = (service) => {
    console.log('Service pressed:', service.name);
    navigation.navigate('ServiceDetails', { service });
  };

  const handleQuickAddToCart = async (service, e) => {
    e?.stopPropagation();
    
    if (!tokens?.accessToken) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    try {
      setAddingToCart(true);

      const cartData = {
        serviceId: service._id,
        quantity: 1,
        selectedDate: new Date().toISOString(),
        notes: ''
      };

      const response = await fetch(`${API_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify(cartData),
      });

      const data = await response.json();

      if (data.success) {
        setServicesInCart(prev => new Set([...prev, service._id]));
        await fetchCartStatus();
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Quick add to cart error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleCategoryPress = (category) => {
    const categoryServicesList = categoryServices[category] || [];
    navigation.navigate('CategoryServices', { 
      category, 
      services: categoryServicesList 
    });
  };

  const getFirstServiceImage = (category) => {
    const categoryServicesList = categoryServices[category];
    if (categoryServicesList && categoryServicesList.length > 0) {
      return categoryServicesList[0].image_url || 'https://via.placeholder.com/100x100';
    }
    return 'https://via.placeholder.com/100x100';
  };

  const clearFilters = () => {
    setSortBy('default');
    setSelectedCategory('all');
    setPriceRange({ min: 0, max: 10000 });
    setShowFilterModal(false);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={14} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Icon key={i} name="star-half" size={14} color="#FFD700" />);
      } else {
        stars.push(<Icon key={i} name="star-outline" size={14} color="#E5E5E5" />);
      }
    }
    return stars;
  };

  const QuickAddButton = ({ service, style }) => {
    const [serviceQuantity, setServiceQuantity] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    
    useEffect(() => {
      const fetchServiceQuantity = async () => {
        if (!tokens?.accessToken || !servicesInCart.has(service._id)) {
          setServiceQuantity(0);
          return;
        }
        
        try {
          const response = await fetch(`${API_URL}/cart`, {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
            },
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
    }, [servicesInCart, tokens, service._id]);
      
    const handleUpdateQuantity = async (newQuantity, e) => {
      e?.stopPropagation();
      
      if (newQuantity < 0 || isUpdating) return;
      
      setIsUpdating(true);
      setServiceQuantity(newQuantity);
      
      try {
        const cartResponse = await fetch(`${API_URL}/cart`, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          },
        });
        const cartData = await cartResponse.json();
        
        if (!cartData.success) {
          setServiceQuantity(serviceQuantity);
          Alert.alert('Error', 'Failed to fetch cart');
          return;
        }
        
        const cartItem = cartData.data.items.find(
          item => (item.service?._id || item.serviceId) === service._id
        );
        
        if (!cartItem) {
          setServiceQuantity(0);
          setServicesInCart(prev => {
            const newSet = new Set(prev);
            newSet.delete(service._id);
            return newSet;
          });
          return;
        }
        
        if (newQuantity === 0) {
          const response = await fetch(`${API_URL}/cart/${cartItem._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
            },
          });
          
          const data = await response.json();
          if (data.success) {
            setServicesInCart(prev => {
              const newSet = new Set(prev);
              newSet.delete(service._id);
              return newSet;
            });
            setServiceQuantity(0);
          } else {
            setServiceQuantity(serviceQuantity);
            Alert.alert('Error', data.message || 'Failed to remove item');
          }
        } else {
          const response = await fetch(`${API_URL}/cart/${cartItem._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokens.accessToken}`,
            },
            body: JSON.stringify({
              quantity: newQuantity,
            }),
          });
          
          const data = await response.json();
          if (!data.success) {
            setServiceQuantity(serviceQuantity);
            Alert.alert('Error', data.message || 'Failed to update quantity');
          }
        }
      } catch (error) {
        console.error('Update quantity error:', error);
        setServiceQuantity(serviceQuantity);
        Alert.alert('Error', 'Failed to update quantity');
      } finally {
        setIsUpdating(false);
      }
    };
    
    const isInCart = servicesInCart.has(service._id);
    
    if (isInCart && serviceQuantity > 0) {
      return (
        <View style={[styles.quantityControl, style]}>
          <TouchableOpacity
            style={[styles.quantityButton, isUpdating && styles.quantityButtonDisabled]}
            onPress={(e) => handleUpdateQuantity(serviceQuantity - 1, e)}
            disabled={isUpdating}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" style={styles.quantityText} />
          ) : (
            <Text style={styles.quantityText}>{serviceQuantity}</Text>
          )}
          
          <TouchableOpacity
            style={[styles.quantityButton, isUpdating && styles.quantityButtonDisabled]}
            onPress={(e) => handleUpdateQuantity(serviceQuantity + 1, e)}
            disabled={isUpdating}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        style={[styles.quickAddButton, style]}
        onPress={(e) => handleQuickAddToCart(service, e)}
        disabled={addingToCart}
      >
        <Icon name="add" size={18} color="#FFF" />
        <Text style={styles.quickAddText}>Add</Text>
      </TouchableOpacity>
    );
  };

  // Sort Modal
  const SortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity 
        style={styles.sortModalOverlay} 
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.sortModalContent}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.sortOption, sortBy === 'default' && styles.sortOptionActive]}
            onPress={() => { setSortBy('default'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'default' && styles.sortOptionTextActive]}>
              Default
            </Text>
            {sortBy === 'default' && <Icon name="checkmark" size={20} color="#000" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sortOption, sortBy === 'price_low' && styles.sortOptionActive]}
            onPress={() => { setSortBy('price_low'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'price_low' && styles.sortOptionTextActive]}>
              Price: Low to High
            </Text>
            {sortBy === 'price_low' && <Icon name="checkmark" size={20} color="#000" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sortOption, sortBy === 'price_high' && styles.sortOptionActive]}
            onPress={() => { setSortBy('price_high'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'price_high' && styles.sortOptionTextActive]}>
              Price: High to Low
            </Text>
            {sortBy === 'price_high' && <Icon name="checkmark" size={20} color="#000" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
            onPress={() => { setSortBy('name'); setShowSortModal(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive]}>
              Name (A-Z)
            </Text>
            {sortBy === 'name' && <Icon name="checkmark" size={20} color="#000" />}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Filter Modal
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.sortModalOverlay} 
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={[styles.sortModalContent, { maxHeight: '80%' }]}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Category</Text>
            
            <TouchableOpacity 
              style={[styles.filterOption, selectedCategory === 'all' && styles.filterOptionActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[styles.filterOptionText, selectedCategory === 'all' && styles.filterOptionTextActive]}>
                All Categories
              </Text>
              {selectedCategory === 'all' && <Icon name="checkmark" size={20} color="#000" />}
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity 
                key={category}
                style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                {selectedCategory === category && <Icon name="checkmark" size={20} color="#000" />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Price Range</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceRange.min.toString()}
                  onChangeText={(text) => setPriceRange({ ...priceRange, min: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <Text style={styles.priceSeparator}>-</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceRange.max.toString()}
                  onChangeText={(text) => setPriceRange({ ...priceRange, max: parseInt(text) || 10000 })}
                  keyboardType="numeric"
                  placeholder="10000"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Featured Services Section
  const FeaturedServicesSection = () => {
    if (featuredServices.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Services</Text>
        
        <View style={styles.featuredGrid}>
          {featuredServices.slice(0, 2).map((service) => (
            <View key={service._id} style={styles.featuredCard}>
              <TouchableOpacity onPress={() => handleServicePress(service)}>
                <Image 
                  source={{ uri: service.image_url || 'https://via.placeholder.com/170x140' }} 
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredContent}>
                  <Text style={styles.featuredTitle} numberOfLines={1}>
                    {service.name}
                  </Text>
                  
                  {service.rating && service.rating > 0 && (
                    <View style={styles.featuredRating}>
                      <View style={styles.starsContainer}>
                        {renderStars(service.rating)}
                      </View>
                      <Text style={styles.featuredRatingText}>
                        {service.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <QuickAddButton service={service} style={styles.featuredQuickAdd} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Popular Categories Section
  const PopularCategoriesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Popular Categories</Text>
      
      <View style={styles.categoriesGrid}>
        {categories.slice(0, 4).map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(category)}
          >
            <Image
              source={{ uri: getFirstServiceImage(category) }}
              style={styles.categoryIcon}
              resizeMode="cover"
            />
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Special Offers Section
  const SpecialOffersSection = () => {
    if (offers.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        
        {offers.slice(0, 1).map((offer) => (
          <TouchableOpacity key={offer._id} style={styles.offerCard}>
            <View style={styles.offerContent}>
              <Text style={styles.offerLabel}>Limited Time Offer</Text>
              <Text style={styles.offerDiscount}>{offer.discount}% off on all facials</Text>
              <Text style={styles.offerDescription}>{offer.description || 'Book your facial today and save!'}</Text>
              <TouchableOpacity style={styles.bookNowButton}>
                <Text style={styles.bookNowText}>Book Now</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: offer.image_url || 'https://via.placeholder.com/120x140' }}
              style={styles.offerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Recommended Section
  const RecommendedSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommended for You</Text>
      
      <View style={styles.recommendedGrid}>
        {services.slice(0, 2).map((service) => (
          <View key={service._id} style={styles.recommendedCard}>
            <TouchableOpacity onPress={() => handleServicePress(service)}>
              <Image
                source={{ uri: service.image_url || 'https://via.placeholder.com/170x140' }}
                style={styles.recommendedImage}
                resizeMode="cover"
              />
              <View style={styles.recommendedContent}>
                <Text style={styles.recommendedTitle} numberOfLines={1}>
                  {service.name}
                </Text>
                
                {service.rating && service.rating > 0 && (
                  <View style={styles.recommendedRating}>
                    <View style={styles.starsContainer}>
                      {renderStars(service.rating)}
                    </View>
                    <Text style={styles.recommendedRatingText}>
                      {service.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            <QuickAddButton service={service} style={styles.recommendedQuickAdd} />
          </View>
        ))}
      </View>
    </View>
  );

  // Top Categories Section
  const TopCategoriesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Categories</Text>
      
      <View style={styles.topCategoriesGrid}>
        {categories.slice(0, 2).map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.topCategoryCard}
            onPress={() => handleCategoryPress(category)}
          >
            <Image
              source={{ uri: getFirstServiceImage(category) }}
              style={styles.topCategoryImage}
              resizeMode="cover"
            />
            <Text style={styles.topCategoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // New Services Section
  const NewServicesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>New Services</Text>
      
      <View style={styles.newServicesGrid}>
        {newServices.slice(0, 4).map((service) => (
          <TouchableOpacity
            key={service._id}
            style={styles.newServiceCard}
            onPress={() => handleServicePress(service)}
          >
            <Image
              source={{ uri: service.image_url || 'https://via.placeholder.com/60x60' }}
              style={styles.newServiceIcon}
              resizeMode="cover"
            />
            <Text style={styles.newServiceTitle} numberOfLines={1}>
              {service.name}
            </Text>
            
            <QuickAddButton service={service} style={styles.newServiceQuickAdd} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // All Services Section
  const AllServicesSection = () => (
    <View style={styles.section}>
      <View style={styles.allServicesHeader}>
        <Text style={styles.sectionTitle}>All Services ({filteredServices.length})</Text>
      </View>
      
      <View style={styles.allServicesList}>
        {filteredServices.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={styles.listServiceCard}
            onPress={() => handleServicePress(service)}
          >
            <Image 
              source={{ uri: service.image_url || 'https://via.placeholder.com/80x80' }} 
              style={styles.listServiceImage}
              resizeMode="cover"
            />
            <View style={styles.listServiceInfo}>
              <Text style={styles.listServiceName} numberOfLines={2}>
                {service.name}
              </Text>
              <Text style={styles.listServiceCategory}>
                {service.category}
              </Text>
              
              {service.rating && service.rating > 0 && (
                <View style={styles.listServiceRating}>
                  <View style={styles.starsContainer}>
                    {renderStars(service.rating)}
                  </View>
                  <Text style={styles.ratingCount}>
                    ({service.reviewCount || 0})
                  </Text>
                </View>
              )}
              
              <View style={styles.listServiceFooter}>
                <Text style={styles.listServicePrice}>₹{service.price}</Text>
                {service.duration && (
                  <View style={styles.durationBadge}>
                    <Icon name="time-outline" size={12} color="#666" />
                    <Text style={styles.durationText}>{service.duration}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <QuickAddButton service={service} style={styles.listQuickAdd} />
          </TouchableOpacity>
        ))}
      </View>

      {filteredServices.length === 0 && (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>No services found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your filters or search terms
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalCartItems = servicesInCart.size;

  return (
    <SafeAreaView style={styles.container}>
      <Header />   
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowSortModal(true)}
        >
          <Icon name="swap-vertical" size={18} color="#000" />
          <Text style={styles.filterButtonText}>Sort</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterButton, (selectedCategory !== 'all' || priceRange.min !== 0 || priceRange.max !== 10000) && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="options" size={18} color="#000" />
          <Text style={styles.filterButtonText}>Filter</Text>
          {(selectedCategory !== 'all' || priceRange.min !== 0 || priceRange.max !== 10000) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!searchText.trim() && (
          <>
            <FeaturedServicesSection />
            <PopularCategoriesSection />
            <SpecialOffersSection />
            <RecommendedSection />
            <TopCategoriesSection />
            <NewServicesSection />
          </>
        )}
        
        <AllServicesSection />
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Cart Button */}
      {totalCartItems > 0 && !showSortModal && !showFilterModal && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => navigation.navigate('ViewCart')}
          activeOpacity={0.9}
        >
          <View style={styles.cartButtonContent}>
            <Text style={styles.cartButtonText}>View Cart</Text>
            <View style={{ position: 'relative' }}>
              <Icon name="cart" size={24} color="#D76D77" />
              <Text style={styles.cartBadgeText}>{totalCartItems}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Modals */}
      <SortModal />
      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#000',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#000',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  filterBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: 4,
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    bottom: 8,
    right: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 20,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionActive: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 15,
    color: '#666',
  },
  sortOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#F5F5F5',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featuredGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  featuredCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  featuredImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F5',
  },
  featuredContent: {
    padding: 12,
    paddingBottom: 48,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  featuredRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 6,
  },
  featuredQuickAdd: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 140,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    marginHorizontal: 20,
  },
  offerContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  offerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  offerDiscount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 13,
    color: '#CCC',
    marginBottom: 16,
  },
  bookNowButton: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bookNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  offerImage: {
    width: 120,
    height: 140,
    borderRadius: 12,
    marginLeft: 16,
    backgroundColor: '#333',
  },
  recommendedGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  recommendedCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recommendedImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F5',
  },
  recommendedContent: {
    padding: 12,
    paddingBottom: 48,
  },
  recommendedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  recommendedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  recommendedRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 6,
  },
  recommendedQuickAdd: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  topCategoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  topCategoryCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  topCategoryImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E0E0E0',
  },
  topCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    padding: 12,
    textAlign: 'center',
  },
  newServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  newServiceCard: {
    width: (width - 52) / 2,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  newServiceIcon: {
    width: 150,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
  },
  newServiceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 36,
  },
  newServiceQuickAdd: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  allServicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  allServicesList: {
    gap: 12,
    paddingHorizontal: 20,
  },
  listServiceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 12,
  },
  listServiceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  listServiceInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  listServiceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listServiceCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  listServiceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 6,
  },
  listServiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listServicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#666',
  },
  listQuickAdd: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
  },
  bottomSpacing: {
    height: 80,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,    
    width: 150,
    height: 45,
    backgroundColor: '#F5C6CB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  cartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    position: 'absolute',
    top: -6,
    right: -5,
    fontSize: 10,
    fontWeight: '900',
    color: '#D76D77',
  },
  cartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D76D77',
    left: -10,
    marginLeft: 12,
  },
});

export default ServicesPage;