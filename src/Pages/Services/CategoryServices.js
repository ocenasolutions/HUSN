// src/Pages/Services/CategoryServices.js
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const CategoryServices = ({ navigation, route }) => {
  const { category, services: initialServices } = route.params;
  const [services, setServices] = useState(initialServices || []);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const sortOptions = [
    { id: 'newest', label: 'Newest First', value: 'createdAt', order: 'desc' },
    { id: 'oldest', label: 'Oldest First', value: 'createdAt', order: 'asc' },
    { id: 'price-low', label: 'Price: Low to High', value: 'price', order: 'asc' },
    { id: 'price-high', label: 'Price: High to Low', value: 'price', order: 'desc' },
    { id: 'popular', label: 'Most Popular', value: 'totalBookings', order: 'desc' },
    { id: 'rating', label: 'Highest Rated', value: 'rating', order: 'desc' },
  ];

  useEffect(() => {
    if (!initialServices || initialServices.length === 0) {
      fetchCategoryServices();
    }
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchText, services]);

  useEffect(() => {
    handleSort();
  }, [sortBy]);

  const fetchCategoryServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services?category=${category}&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error('Error fetching category services:', error);
      Alert.alert('Error', 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchText.trim()) {
      setFilteredServices(services);
      return;
    }

    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(searchText.toLowerCase()) ||
      service.description.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredServices(filtered);
  };

  const handleSort = () => {
    const selectedSort = sortOptions.find(option => option.id === sortBy);
    const sortedServices = [...services].sort((a, b) => {
      const aValue = a[selectedSort.value] || 0;
      const bValue = b[selectedSort.value] || 0;
      
      if (selectedSort.order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setServices(sortedServices);
  };

  const handleServicePress = (service) => {
    navigation.navigate('ServiceDetails', { service });
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

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(item)}
    >
      <View style={styles.favoriteButton}>
        <Icon name="heart-outline" size={18} color="#666" />
      </View>
      
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150x100' }} 
        style={styles.serviceImage}
        resizeMode="cover"
      />
      
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.serviceDetails}>
          <View style={styles.priceContainer}>
            {item.isOfferValid && item.offerPrice ? (
              <View style={styles.priceRow}>
                <Text style={styles.originalPrice}>₹{item.price}</Text>
                <Text style={styles.offerPrice}>₹{item.finalPrice}</Text>
                {item.offerDiscount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.offerDiscount}% OFF</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.servicePrice}>₹{item.price}</Text>
            )}
          </View>
          
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#FFA500" />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
          </View>
        </View>
        
        <View style={styles.serviceMeta}>
          <View style={styles.durationContainer}>
            <Icon name="time-outline" size={14} color="#666" />
            <Text style={styles.durationText}>{item.duration} min</Text>
          </View>
          
          {item.totalBookings > 0 && (
            <Text style={styles.bookingsText}>
              {item.totalBookings} booking{item.totalBookings !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const displayServices = searchText.trim() ? filteredServices : services;

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {/* Search Bar */}
      <View style={styles.searchContainer}>

 <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortOptions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOptionChip,
                sortBy === option.id && styles.activeSortChip
              ]}
              onPress={() => setSortBy(option.id)}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === option.id && styles.activeSortText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Services List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : displayServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No services found</Text>
          <Text style={styles.emptySubtitle}>
            {searchText.trim() 
              ? 'Try adjusting your search terms' 
              : `No services available in ${category} category`
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayServices}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.servicesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Category Header
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceCount: {
    fontSize: 14,
    color: '#666',
  },

  // Search Section
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sortButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },

  // Sort Options
  sortOptions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sortOptionChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeSortChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeSortText: {
    color: '#FFF',
  },

  // Services List
  servicesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  bookingsText: {
    fontSize: 12,
    color: '#666',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
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
    paddingTop: 50,
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
    paddingHorizontal: 32,
  },
});

export default CategoryServices;