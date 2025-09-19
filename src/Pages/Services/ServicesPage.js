// src/Pages/Services/ServicesPage.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const ServicesPage = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryServices, setCategoryServices] = useState({});
  const [featuredServices, setFeaturedServices] = useState([]);
  const [trendingServices, setTrendingServices] = useState([]);
  const [newServices, setNewServices] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchOffers();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchText, services]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
        groupServicesByCategory(data.data);
        
        // Separate services into different categories
        const featured = data.data.filter(service => service.featured || service.is_featured);
        const trending = data.data.filter(service => service.trending || service.is_trending);
        const newest = data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
        
        setFeaturedServices(featured.slice(0, 4));
        setTrendingServices(trending.slice(0, 6));
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

  const handleSearch = () => {
    if (!searchText.trim()) {
      setFilteredServices(services);
      return;
    }

    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(searchText.toLowerCase()) ||
      service.description.toLowerCase().includes(searchText.toLowerCase()) ||
      service.category.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredServices(filtered);
  };

  const handleServicePress = (service) => {
    navigation.navigate('ServiceDetails', { service });
  };

  const handleCategoryPress = (category) => {
    const categoryServicesList = categoryServices[category] || [];
    navigation.navigate('CategoryServices', { 
      category, 
      services: categoryServicesList 
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'hair': 'cut-outline',
      'skin': 'flower-outline', 
      'nails': 'hand-left-outline',
      'spa': 'leaf-outline',
      'beauty': 'sparkles-outline',
      'body': 'fitness-outline',
      'facial': 'happy-outline',
      'massage': 'hand-right-outline',
      'makeup': 'brush-outline',
      'waxing': 'remove-outline'
    };
    return icons[category.toLowerCase()] || 'ellipse-outline';
  };

  const getFirstServiceImage = (category) => {
    const categoryServicesList = categoryServices[category];
    if (categoryServicesList && categoryServicesList.length > 0) {
      return categoryServicesList[0].image_url || 'https://via.placeholder.com/100x100';
    }
    return 'https://via.placeholder.com/100x100';
  };

  const FeaturedServicesSection = () => {
    if (featuredServices.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Services</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={featuredServices}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => handleServicePress(item)}
            >
              <Image 
                source={{ uri: item.image_url || 'https://via.placeholder.com/160x100' }} 
                style={styles.featuredImage}
                resizeMode="cover"
              />
              <View style={styles.featuredOverlay}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.featuredPrice}>₹{item.price}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `featured-${item._id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  const PopularCategoriesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Popular Categories</Text>
      
      <View style={styles.categoriesGrid}>
        {categories.slice(0, 4).map((category, index) => (
          <TouchableOpacity
            key={category}
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(category)}
          >
            <Image
              source={{ uri: getFirstServiceImage(category) }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryTitle}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Text style={styles.categoryCount}>
                {categoryServices[category]?.length || 0} services
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SpecialOffersSection = () => {
    if (offers.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        
        <FlatList
          data={offers}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.offerCard}>
              <View style={styles.offerContent}>
                <Text style={styles.offerDiscount}>{item.discount}% off</Text>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.offerDescription}>{item.description}</Text>
              </View>
              <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/80x80' }}
                style={styles.offerImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `offer-${item._id || Math.random()}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  const RecommendedSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommended for You</Text>
      
      <View style={styles.recommendedGrid}>
        {services.slice(0, 4).map((service, index) => (
          <TouchableOpacity
            key={service._id}
            style={styles.recommendedCard}
            onPress={() => handleServicePress(service)}
          >
            <Image
              source={{ uri: service.image_url || 'https://via.placeholder.com/100x100' }}
              style={styles.recommendedImage}
              resizeMode="cover"
            />
            <Text style={styles.recommendedTitle} numberOfLines={2}>
              {service.name}
            </Text>
            <Text style={styles.recommendedPrice}>₹{service.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const TrendingServicesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trending Services</Text>
      
      <View style={styles.trendingContainer}>
        {trendingServices.slice(0, 6).map((service, index) => (
          <TouchableOpacity
            key={service._id}
            style={styles.trendingCard}
            onPress={() => handleServicePress(service)}
          >
            <Image
              source={{ uri: service.image_url || 'https://via.placeholder.com/50x50' }}
              style={styles.trendingImage}
              resizeMode="cover"
            />
            <View style={styles.trendingInfo}>
              <Text style={styles.trendingTitle} numberOfLines={1}>
                {service.name}
              </Text>
              <Text style={styles.trendingCategory}>{service.category}</Text>
            </View>
            <Text style={styles.trendingPrice}>₹{service.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const TopCategoriesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Categories</Text>
      
      <View style={styles.topCategoriesGrid}>
        {categories.slice(0, 6).map((category, index) => (
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

  const NewServicesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>New Services</Text>
      
      <View style={styles.newServicesContainer}>
        {newServices.slice(0, 6).map((service, index) => (
          <TouchableOpacity
            key={service._id}
            style={styles.newServiceCard}
            onPress={() => handleServicePress(service)}
          >
            <Image
              source={{ uri: service.image_url || 'https://via.placeholder.com/50x50' }}
              style={styles.newServiceImage}
              resizeMode="cover"
            />
            <View style={styles.newServiceInfo}>
              <Text style={styles.newServiceTitle} numberOfLines={1}>
                {service.name}
              </Text>
              <Text style={styles.newServiceCategory}>{service.category}</Text>
            </View>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Search Results */}
        {searchText.trim() ? (
          <View style={styles.searchResultsSection}>
            <Text style={styles.sectionTitle}>
              Search Results ({filteredServices.length})
            </Text>
            
            {filteredServices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="search-outline" size={64} color="#CCC" />
                <Text style={styles.emptyTitle}>No services found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : (
              <View style={styles.searchResultsGrid}>
                {filteredServices.map((service) => (
                  <TouchableOpacity
                    key={service._id}
                    style={styles.searchResultCard}
                    onPress={() => handleServicePress(service)}
                  >
                    <Image 
                      source={{ uri: service.image_url || 'https://via.placeholder.com/60x60' }} 
                      style={styles.searchResultImage}
                      resizeMode="cover"
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <Text style={styles.searchResultCategory}>
                        {service.category}
                      </Text>
                      <Text style={styles.searchResultPrice}>₹ {service.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Featured Services */}
            <FeaturedServicesSection />

            {/* Popular Categories */}
            <PopularCategoriesSection />

            {/* Special Offers */}
            <SpecialOffersSection />

            {/* Recommended for You */}
            <RecommendedSection />

            {/* Trending Services */}
            <TrendingServicesSection />

            {/* Top Categories */}
            <TopCategoriesSection />

            {/* New Services */}
            <NewServicesSection />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  scrollContainer: {
    flex: 1,
  },

  // Search Section
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },

  // Common Section Styles
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  horizontalList: {
    paddingHorizontal: 16,
  },

  // Featured Services
  featuredCard: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  featuredTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  featuredPrice: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '500',
  },

  // Popular Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  categoryCount: {
    fontSize: 10,
    color: '#FFF',
    opacity: 0.8,
  },

  // Special Offers
  offerCard: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  offerContent: {
    flex: 1,
  },
  offerDiscount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 12,
    color: '#666',
  },
  offerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },

  // Recommended
  recommendedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  recommendedCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  recommendedPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  // Trending Services
  trendingContainer: {
    paddingHorizontal: 16,
  },
  trendingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trendingImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  trendingCategory: {
    fontSize: 12,
    color: '#666',
  },
  trendingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  // Top Categories
  topCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topCategoryCard: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  topCategoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  topCategoryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },

  // New Services
  newServicesContainer: {
    paddingHorizontal: 16,
  },
  newServiceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  newServiceImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  newServiceInfo: {
    flex: 1,
  },
  newServiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  newServiceCategory: {
    fontSize: 12,
    color: '#666',
  },
  newBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },

  // Search Results
  searchResultsSection: {
    paddingBottom: 100,
  },
  searchResultsGrid: {
    paddingHorizontal: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  // Loading States
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

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ServicesPage;