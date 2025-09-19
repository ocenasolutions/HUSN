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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const { width, height } = Dimensions.get('window');

const Dashboard = ({ navigation }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  
  // State management
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('Services');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState({
    products: true,
    services: true,
    featuredServices: true,
    featuredProducts: true,
  });

  useEffect(() => {
    // Main component animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Fetch data
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      fetchFeaturedServices();
      fetchServices();
      fetchFeaturedProducts();
      fetchProducts();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchFeaturedServices = async () => {
    try {
      setLoading(prev => ({ ...prev, featuredServices: true }));
      const response = await fetch(`${API_URL}/services?featured=true&limit=6`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeaturedServices(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching featured services:', error);
      setFeaturedServices([]);
    } finally {
      setLoading(prev => ({ ...prev, featuredServices: false }));
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(prev => ({ ...prev, services: true }));
      const response = await fetch(`${API_URL}/services?limit=8`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, featuredProducts: true }));
      const response = await fetch(`${API_URL}/products?featured=true&limit=6`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeaturedProducts(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
      setFeaturedProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, featuredProducts: false }));
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '8', 
        sortBy: 'createdAt',
        sortOrder: 'desc',
        status: 'published'
      });

      const response = await fetch(`${API_URL}/products?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setProducts(data.data.slice(0, 8));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert(
        'Network Error',
        'Unable to load products. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: fetchProducts },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      setProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleSearch = () => {
    if (!searchText.trim()) return;
    
    navigation.navigate('SearchResults', { 
      query: searchText
    });
  };

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const navigateToService = (service) => {
    navigation.navigate('ServiceDetails', { service });
  };

  const handleBookService = (service) => {
    navigation.navigate('BookService', { service });
  };

  // Featured Services Component
  const FeaturedServicesSection = () => {
    if (loading.featuredServices) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.featuredSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Featured Services</Text>
        
        <View style={styles.featuredGrid}>
          {featuredServices.slice(0, 4).map((item, index) => (
            <TouchableOpacity
              key={item._id}
              style={styles.featuredCard}
              onPress={() => navigateToService(item)}
            >
              <View style={styles.featuredImageContainer}>
                <Image
                  source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400' }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featuredLabel}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Popular Categories Component
  const PopularCategoriesSection = () => {
    const currentData = activeTab === 'Services' ? services : products;
    const isLoading = activeTab === 'Services' ? loading.services : loading.products;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.categoriesSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Popular Categories</Text>
        
        <View style={styles.categoriesGrid}>
          {currentData.slice(0, 4).map((item, index) => (
            <TouchableOpacity
              key={item._id}
              style={styles.categoryCard}
              onPress={() => activeTab === 'Services' ? navigateToService(item) : navigateToProduct(item)}
            >
              <View style={styles.categoryImageContainer}>
                <Image
                  source={{ 
                    uri: activeTab === 'Services' 
                      ? (item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400')
                      : (item.primaryImage || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400')
                  }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.categoryLabel}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Icon 
        name={type === 'products' ? 'cube-outline' : 'cut-outline'} 
        size={48} 
        color="#E0E0E0" 
      />
      <Text style={styles.emptyStateText}>No {type} available</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }]
            }
          ]}
        >
          <View style={styles.searchBar}>
            <Icon name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              placeholder="Search for services or products"
              placeholderTextColor="#999"
            />
          </View>
        </Animated.View>

        {/* Tab Switcher */}
        <Animated.View 
          style={[
            styles.tabContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Services' && styles.activeTab]}
            onPress={() => setActiveTab('Services')}
          >
            <Text style={[styles.tabText, activeTab === 'Services' && styles.activeTabText]}>
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Products' && styles.activeTab]}
            onPress={() => setActiveTab('Products')}
          >
            <Text style={[styles.tabText, activeTab === 'Products' && styles.activeTabText]}>
              Products
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Featured Services */}
        {activeTab === 'Services' && <FeaturedServicesSection />}

        {/* Popular Categories */}
        <PopularCategoriesSection />
      </ScrollView>
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
  
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },

  // Tab Switcher Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },

  // Section Styles
  featuredSection: {
    marginBottom: 30,
  },
  categoriesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 20,
    marginBottom: 20,
  },

  // Featured Grid Styles
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  featuredCard: {
    width: (width - 60) / 2,
    marginBottom: 20,
  },
  featuredImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },

  // Categories Grid Styles
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 60) / 2,
    marginBottom: 20,
  },
  categoryImageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },

  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default Dashboard;