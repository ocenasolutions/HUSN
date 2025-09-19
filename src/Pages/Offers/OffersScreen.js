// src/Pages/OfferScreen.js - Enhanced for Products & Services with Offers
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const OfferScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [offeredItems, setOfferedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'products', 'services'
  const [stats, setStats] = useState({
    totalOffers: 0,
    productOffers: 0,
    serviceOffers: 0
  });

  const getAuthToken = () => {
    return tokens?.accessToken || user?.token || null;
  };

  useEffect(() => {
    fetchOffersData();
  }, []);

  const fetchOffersData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch both products and services with offers in parallel
      const [productsResponse, servicesResponse] = await Promise.all([
        fetch(`${API_URL}/products?limit=100&sortBy=offerDiscount&sortOrder=desc&offerActive=true`),
        fetch(`${API_URL}/services?limit=100&sortBy=offerDiscount&sortOrder=desc&offerActive=true`)
      ]);

      const [productsData, servicesData] = await Promise.all([
        productsResponse.json(),
        servicesResponse.json()
      ]);

      let allOfferedItems = [];

      // Process products with offers
      if (productsData.success && productsData.data) {
        const activeProductOffers = productsData.data.filter(product => {
          if (!product.offerActive) return false;
          if (!product.offerEndDate) return true; // Permanent offers
          return new Date(product.offerEndDate) > new Date(); // Non-expired offers
        }).map(product => ({
          ...product,
          type: 'product',
          id: product._id,
          mainImage: product.primaryImage || (product.images && product.images[0]?.url) || 'https://via.placeholder.com/300x200?text=Product',
          displayPrice: product.price,
          displayOfferPrice: product.offerPrice,
          savings: product.price - product.offerPrice,
        }));

        allOfferedItems = [...allOfferedItems, ...activeProductOffers];
      }

      // Process services with offers
      if (servicesData.success && servicesData.data) {
        const activeServiceOffers = servicesData.data.filter(service => {
          if (!service.offerActive) return false;
          if (!service.offerEndDate) return true; // Permanent offers
          return new Date(service.offerEndDate) > new Date(); // Non-expired offers
        }).map(service => ({
          ...service,
          type: 'service',
          id: service._id,
          mainImage: service.image_url || 'https://via.placeholder.com/300x200?text=Service',
          displayPrice: service.price,
          displayOfferPrice: service.offerPrice,
          savings: service.price - service.offerPrice,
        }));

        allOfferedItems = [...allOfferedItems, ...activeServiceOffers];
      }

      // Sort by offer discount (highest first)
      allOfferedItems.sort((a, b) => (b.offerDiscount || 0) - (a.offerDiscount || 0));

      setOfferedItems(allOfferedItems);
      
      // Update stats
      const productCount = allOfferedItems.filter(item => item.type === 'product').length;
      const serviceCount = allOfferedItems.filter(item => item.type === 'service').length;
      
      setStats({
        totalOffers: allOfferedItems.length,
        productOffers: productCount,
        serviceOffers: serviceCount
      });

    } catch (error) {
      console.error('Error fetching offers:', error);
      Alert.alert('Error', 'Failed to load offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffersData();
  }, [fetchOffersData]);

  const getFilteredItems = useCallback(() => {
    switch (activeTab) {
      case 'products':
        return offeredItems.filter(item => item.type === 'product');
      case 'services':
        return offeredItems.filter(item => item.type === 'service');
      default:
        return offeredItems;
    }
  }, [offeredItems, activeTab]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'No expiry';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return diffHours > 0 ? `${diffHours} hours left` : 'Expiring soon';
    } else if (diffDays === 1) {
      return '1 day left';
    } else {
      return `${diffDays} days left`;
    }
  }, []);

  const navigateToDetail = useCallback((item) => {
    if (item.type === 'product') {
      navigation.navigate('ProductDetail', { productId: item.id });
    } else {
      navigation.navigate('ServiceDetail', { serviceId: item.id });
    }
  }, [navigation]);

  const addToCart = useCallback(async (item) => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Please login to add items to cart');
        return;
      }

      const endpoint = item.type === 'product' ? 'cart/add' : 'cart/add-service';
      const bodyKey = item.type === 'product' ? 'productId' : 'serviceId';

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          [bodyKey]: item.id,
          quantity: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', `${item.type === 'product' ? 'Product' : 'Service'} added to cart!`, [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'Go to Cart', onPress: () => navigation.navigate('Cart') }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  }, [getAuthToken, navigation]);

  const renderOfferCard = useCallback(({ item }) => {
    const timeLeft = formatDate(item.offerEndDate);
    const isProduct = item.type === 'product';
    
    return (
      <TouchableOpacity 
        style={styles.offerCard}
        onPress={() => navigateToDetail(item)}
        activeOpacity={0.8}
      >
        {/* Type Badge */}
        <View style={[styles.typeBadge, isProduct ? styles.productBadge : styles.serviceBadge]}>
          <Icon 
            name={isProduct ? "cube-outline" : "medical-outline"} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.typeBadgeText}>
            {isProduct ? 'PRODUCT' : 'SERVICE'}
          </Text>
        </View>

        {/* Offer Badge */}
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>{item.offerDiscount}% OFF</Text>
        </View>

        {/* Featured Badge */}
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Icon name="star" size={12} color="#FFD700" />
          </View>
        )}

        {/* Item Image */}
        <Image
          source={{ uri: item.mainImage }}
          style={styles.itemImage}
          resizeMode="cover"
        />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Item Name */}
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Offer Title */}
          {item.offerTitle && (
            <Text style={styles.offerTitle} numberOfLines={1}>
              🎉 {item.offerTitle}
            </Text>
          )}

          {/* Category & Brand/Duration Row */}
          <View style={styles.infoRow}>
            <View style={styles.categoryContainer}>
              <Icon name="pricetag-outline" size={12} color="#7F8C8D" />
              <Text style={styles.categoryText}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
            
            {isProduct ? (
              item.brand && (
                <View style={styles.brandContainer}>
                  <Icon name="business-outline" size={12} color="#7F8C8D" />
                  <Text style={styles.brandText}>{item.brand}</Text>
                </View>
              )
            ) : (
              <View style={styles.durationContainer}>
                <Icon name="time-outline" size={12} color="#7F8C8D" />
                <Text style={styles.durationText}>{item.duration} min</Text>
              </View>
            )}
          </View>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>₹{item.displayPrice}</Text>
              <Text style={styles.offerPrice}>₹{item.displayOfferPrice}</Text>
            </View>
            <Text style={styles.savingsText}>Save ₹{item.savings}</Text>
          </View>

          {/* Stock Status (Products Only) */}
          {isProduct && (
            <View style={styles.stockContainer}>
              <View style={[
                styles.stockDot, 
                { backgroundColor: item.stockStatus === 'in-stock' ? '#10B981' : 
                                   item.stockStatus === 'low-stock' ? '#F59E0B' : '#EF4444' }
              ]} />
              <Text style={[
                styles.stockText,
                { color: item.stockStatus === 'in-stock' ? '#10B981' : 
                         item.stockStatus === 'low-stock' ? '#F59E0B' : '#EF4444' }
              ]}>
                {item.stockStatus === 'in-stock' ? 'In Stock' : 
                 item.stockStatus === 'low-stock' ? 'Low Stock' : 'Out of Stock'}
              </Text>
              {item.stock > 0 && (
                <Text style={styles.stockQuantity}>({item.stock} units)</Text>
              )}
            </View>
          )}

          {/* Service Status */}
          {!isProduct && (
            <View style={styles.serviceStatusContainer}>
              <View style={[styles.stockDot, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.stockText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
                {item.isActive ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          )}

          {/* Time Left */}
          <View style={styles.timeLeftContainer}>
            <Icon name="alarm-outline" size={14} color="#E74C3C" />
            <Text style={styles.timeLeftText}>{timeLeft}</Text>
          </View>

          {/* Offer Description */}
          {item.offerDescription && (
            <Text style={styles.offerDescription} numberOfLines={2}>
              {item.offerDescription}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.cartButton,
                (isProduct && item.stockStatus === 'out-of-stock') || 
                (!isProduct && !item.isActive) ? styles.disabledButton : {}
              ]}
              onPress={() => addToCart(item)}
              disabled={(isProduct && item.stockStatus === 'out-of-stock') || (!isProduct && !item.isActive)}
            >
              <Icon name="cart-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Add to Cart</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.detailButton]}
              onPress={() => navigateToDetail(item)}
            >
              <Text style={styles.detailButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [formatDate, navigateToDetail, addToCart]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="gift-outline" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>No Active Offers</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'products' ? 'No product offers available at the moment.' :
         activeTab === 'services' ? 'No service offers available at the moment.' :
         'Check back later for amazing deals and discounts!'}
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  ), [activeTab, onRefresh]);

  const renderTabButton = (tabKey, title, count) => (
    <TouchableOpacity
      key={tabKey}
      style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={[styles.tabButtonText, activeTab === tabKey && styles.activeTabButtonText]}>
        {title}
      </Text>
      <View style={[styles.countBadge, activeTab === tabKey && styles.activeCountBadge]}>
        <Text style={[styles.countBadgeText, activeTab === tabKey && styles.activeCountBadgeText]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredItems = getFilteredItems();

  if (loading && offeredItems.length === 0) {
    return (
      
      <SafeAreaView style={styles.container}>
                  <Header/>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading amazing offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header/>

      {/* Stats Card */}
      {stats.totalOffers > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Icon name="flame" size={20} color="#FF6B9D" />
            <Text style={styles.statsTitle}>Hot Deals Available</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalOffers}</Text>
              <Text style={styles.statLabel}>Total Offers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.productOffers}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.serviceOffers}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('all', 'All Offers', stats.totalOffers)}
        {renderTabButton('products', 'Products', stats.productOffers)}
        {renderTabButton('services', 'Services', stats.serviceOffers)}
      </View>

      {/* Offers List */}
      <FlatList
        data={filteredItems}
        renderItem={renderOfferCard}
        keyExtractor={(item) => `${item.type}-${item.id}`}
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
          filteredItems.length === 0 
            ? styles.emptyContentContainer 
            : styles.contentContainer
        }
      />
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

  // Stats Card
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8E8',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#FF6B9D',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginRight: 6,
  },
  activeTabButtonText: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  activeCountBadgeText: {
    color: '#fff',
  },

  // Content Container
  contentContainer: {
    padding: 20,
    paddingTop: 15,
  },
  emptyContentContainer: {
    flex: 1,
    padding: 20,
  },

  // Offer Card
  offerCard: {
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

  // Type Badge
  typeBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  productBadge: {
    backgroundColor: '#3498DB',
  },
  serviceBadge: {
    backgroundColor: '#9B59B6',
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  offerBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#E74C3C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 1,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  featuredBadge: {
    position: 'absolute',
    top: 50,
    right: 15,
    backgroundColor: '#FFF3CD',
    borderRadius: 15,
    padding: 6,
    zIndex: 1,
  },

  itemImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
  },

  cardContent: {
    padding: 16,
  },

  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },

  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
    marginBottom: 8,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
    textTransform: 'capitalize',
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
    fontWeight: '500',
  },

  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Price Section
  priceContainer: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#95A5A6',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  offerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  savingsText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
  },

  // Stock/Service Status
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockQuantity: {
    fontSize: 11,
    color: '#7F8C8D',
    marginLeft: 4,
  },

  // Time Left
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLeftText: {
    fontSize: 12,
    color: '#E74C3C',
    marginLeft: 4,
    fontWeight: '600',
  },

  offerDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
    marginBottom: 12,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cartButton: {
    backgroundColor: '#FF6B9D',
  },
  detailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF6B9D',
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
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
  refreshButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default OfferScreen;