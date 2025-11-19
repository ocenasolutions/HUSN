import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  Dimensions,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const SalonsScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchSalons();
  }, [activeFilter]);

  const fetchSalons = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = `${API_URL}/salons?limit=50`;
      
      if (activeFilter === 'featured') {
        url += '&featured=true';
      }
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setSalons(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load salons');
      }
    } catch (error) {
      console.error('Fetch salons error:', error);
      Alert.alert('Error', 'Failed to load salons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSalons();
  }, [fetchSalons]);

  const handleSearch = useCallback(() => {
    fetchSalons();
  }, [fetchSalons]);

  const navigateToSalonDetail = useCallback((salonId) => {
    navigation.navigate('SalonDetail', { salonId });
  }, [navigation]);

  const navigateToCreateSalon = useCallback(() => {
    navigation.navigate('CreateSalon');
  }, [navigation]);

  const renderSalonCard = useCallback(({ item }) => {
    const hasActiveOffers = item.offers?.some(offer => 
      offer.active && (!offer.validUntil || new Date(offer.validUntil) > new Date())
    );

    return (
      <TouchableOpacity 
        style={styles.salonCard}
        onPress={() => navigateToSalonDetail(item._id)}
        activeOpacity={0.8}
      >
        {/* Cover Photo */}
        <Image
          source={{ uri: item.coverPhoto }}
          style={styles.coverPhoto}
          resizeMode="cover"
        />

        {/* Featured Badge */}
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Icon name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        )}

        {/* Verified Badge */}
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={16} color="#10B981" />
          </View>
        )}

        {/* Offers Badge */}
        {hasActiveOffers && (
          <View style={styles.offerBadge}>
            <Icon name="gift" size={12} color="#fff" />
            <Text style={styles.offerBadgeText}>OFFERS</Text>
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Salon Name */}
          <Text style={styles.salonName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} ({item.totalReviews})
            </Text>
          </View>

          {/* Address */}
          <View style={styles.addressContainer}>
            <Icon name="location-outline" size={14} color="#7F8C8D" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address.street}, {item.address.city}
            </Text>
          </View>

          {/* Services Count */}
          <View style={styles.servicesContainer}>
            <Icon name="cut-outline" size={14} color="#FF6B9D" />
            <Text style={styles.servicesText}>
              {item.services?.length || 0} Services Available
            </Text>
          </View>

          {/* Amenities */}
          {item.amenities?.length > 0 && (
            <View style={styles.amenitiesContainer}>
              {item.amenities.slice(0, 4).map((amenity, index) => (
                <View key={index} style={styles.amenityTag}>
                  <Text style={styles.amenityText}>
                    {amenity.replace('-', ' ')}
                  </Text>
                </View>
              ))}
              {item.amenities.length > 4 && (
                <Text style={styles.moreAmenities}>
                  +{item.amenities.length - 4}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [navigateToSalonDetail]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="business-outline" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>No Salons Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms' 
          : 'Check back later for new salons'}
      </Text>
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={navigateToCreateSalon}
        >
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add First Salon</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, isAdmin, navigateToCreateSalon]);

  const renderFilterButton = (key, title) => (
    <TouchableOpacity
      key={key}
      style={[styles.filterButton, activeFilter === key && styles.activeFilterButton]}
      onPress={() => setActiveFilter(key)}
    >
      <Text style={[styles.filterButtonText, activeFilter === key && styles.activeFilterButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading && salons.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading salons...</Text>
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
          <Icon name="search" size={20} color="#7F8C8D" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search salons..."
            placeholderTextColor="#B8B8B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#7F8C8D" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All Salons')}
        {renderFilterButton('featured', 'Featured')}
      </View>

      {/* Salons List */}
      <FlatList
        data={salons}
        renderItem={renderSalonCard}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B9D']}
            tintColor="#FF6B9D"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          salons.length === 0 
            ? styles.emptyContentContainer 
            : styles.contentContainer
        }
      />

      {/* Admin FAB */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={navigateToCreateSalon}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2C3E50',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F8F9FA',
  },
  activeFilterButton: {
    backgroundColor: '#FF6B9D',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  emptyContentContainer: {
    flex: 1,
    padding: 20,
  },
  salonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
  },
  featuredBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  featuredText: {
    color: '#856404',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    zIndex: 2,
  },
  offerBadge: {
    position: 'absolute',
    top: 50,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  salonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 6,
    fontWeight: '600',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginLeft: 6,
    flex: 1,
  },
  servicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicesText: {
    fontSize: 13,
    color: '#FF6B9D',
    marginLeft: 6,
    fontWeight: '600',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  amenityTag: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  amenityText: {
    fontSize: 10,
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  moreAmenities: {
    fontSize: 11,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SalonsScreen;