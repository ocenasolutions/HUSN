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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const Dashboard = ({ navigation }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('Services');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(60);
  const [loading, setLoading] = useState({
    products: true,
    services: true,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      fetchServices();
      fetchProducts();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

const fetchServices = async () => {
  try {
    setLoading(prev => ({ ...prev, services: true }));
    
    // Add pagination parameters like fetchProducts
    const queryParams = new URLSearchParams({
      page: '1',
      limit: '1000',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'published'
    });

    const response = await fetch(`${API_URL}/services?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      setServices(data.data || []);
    } else {
      setServices([]);
    }
  } catch (error) {
    console.error('Error fetching services:', error);
    Alert.alert(
      'Network Error',
      'Unable to load services. Please check your connection and try again.',
      [
        { text: 'Retry', onPress: fetchServices },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
    setServices([]);
  } finally {
    setLoading(prev => ({ ...prev, services: false }));
  }
};

  const fetchProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000',
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
        setProducts(data.data);
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
    navigation.navigate('SearchResults', { query: searchText });
  };

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const navigateToService = (service) => {
    navigation.navigate('ServiceDetails', { service });
  };

  const hasOffer = (item) => {
    if (activeTab === 'Services') {
      return item.offer_price && item.offer_price < item.price;
    } else {
      return item.offerPrice && item.offerPrice < item.price;
    }
  };

  const getDiscountPercentage = (item) => {
    if (activeTab === 'Services') {
      if (item.offer_price && item.price) {
        return Math.round(((item.price - item.offer_price) / item.price) * 100);
      }
    } else {
      if (item.offerPrice && item.price) {
        return Math.round(((item.price - item.offerPrice) / item.price) * 100);
      }
    }
    return 0;
  };

  const loadMoreItems = () => {
    setDisplayLimit(prev => prev + 30);
  };

  const PremiumHeroSection = () => {
    const currentData = activeTab === 'Services' ? services : products;
    const featuredItems = currentData.filter(item => item.featured === true).slice(0, 1);

    if (featuredItems.length === 0) return null;

    const item = featuredItems[0];
    const parallaxY = scrollY.interpolate({
      inputRange: [0, 300],
      outputRange: [0, -50],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.premiumHero,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: parallaxY }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.heroContainer}
          activeOpacity={0.95}
          onPress={() => activeTab === 'Services' ? navigateToService(item) : navigateToProduct(item)}
        >
          <Image
            source={{ 
              uri: activeTab === 'Services' 
                ? (item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800')
                : (item.primaryImage || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800')
            }}
            style={styles.heroBackgroundImage}
            blurRadius={0}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.premiumBadge}>
                <View style={styles.starBurst}>
                  <Icon name="star" size={14} color="#FFD700" />
                </View>
                <Text style={styles.premiumBadgeText}>FEATURED</Text>
              </View>
              
              <Text style={styles.heroMainTitle}>{item.name}</Text>
              
              <View style={styles.heroPriceContainer}>
                {hasOffer(item) ? (
                  <View style={styles.priceWithOffer}>
                    <View style={styles.priceRow}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <Text style={styles.heroOfferPrice}>
                        {activeTab === 'Services' ? item.offer_price : item.offerPrice}
                      </Text>
                      <Text style={styles.heroOriginalPrice}>₹{item.price}</Text>
                    </View>
                    <View style={styles.savingsTag}>
                      <Text style={styles.savingsText}>Save {getDiscountPercentage(item)}%</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.heroPrice}>{item.price}</Text>
                  </View>
                )}
              </View>

              <View style={styles.heroAction}>
                <LinearGradient
                  colors={['#000', '#333']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewDetailsButton}
                >
                  <Text style={styles.viewDetailsText}>Explore Now</Text>
                  <Icon name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Elegant Featured Carousel
  const FeaturedCarousel = () => {
    const currentData = activeTab === 'Services' ? services : products;
    const featuredItems = currentData.filter(item => item.featured === true).slice(1, 6);

    if (featuredItems.length === 0) return null;

    return (
      <Animated.View 
        style={[styles.featuredSection, { opacity: fadeAnim }]}
      >
        <View style={styles.elegantHeader}>
          <View>
            <Text style={styles.elegantTitle}>Featured Collection</Text>
            <Text style={styles.elegantSubtitle}>Handpicked for you</Text>
          </View>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllButtonText}>View All</Text>
            <Icon name="chevron-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 20}
        >
          {featuredItems.map((item, index) => (
            <Animated.View
              key={item._id}
              style={[
                styles.featuredCardContainer,
                { 
                  opacity: fadeAnim,
                  transform: [{ 
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.elegantFeaturedCard}
                activeOpacity={0.9}
                onPress={() => activeTab === 'Services' ? navigateToService(item) : navigateToProduct(item)}
              >
                <View style={styles.cardImageWrapper}>
                  <Image
                    source={{ 
                      uri: activeTab === 'Services' 
                        ? (item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400')
                        : (item.primaryImage || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400')
                    }}
                    style={styles.featuredCardImage}
                  />
                  {hasOffer(item) && (
                    <View style={styles.floatingDiscountBadge}>
                      <Text style={styles.discountPercentage}>{getDiscountPercentage(item)}%</Text>
                      <Text style={styles.offText}>OFF</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.cardPriceSection}>
                    {hasOffer(item) ? (
                      <>
                        <Text style={styles.cardOfferPrice}>
                          ₹{activeTab === 'Services' ? item.offer_price : item.offerPrice}
                        </Text>
                        <Text style={styles.cardOriginalPrice}>₹{item.price}</Text>
                      </>
                    ) : (
                      <Text style={styles.cardPrice}>₹{item.price}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  // Premium Grid Layout
  const PremiumGrid = () => {
    const currentData = activeTab === 'Services' ? services : products;
    const gridItems = currentData
      .filter(item => !item.featured)
      .slice(0, displayLimit);

    const offersItems = gridItems.filter(item => hasOffer(item));
    const regularItems = gridItems.filter(item => !hasOffer(item));

    return (
      <Animated.View style={[styles.gridSection, { opacity: fadeAnim }]}>
        {/* Hot Deals Section */}
        {offersItems.length > 0 && (
          <View style={styles.gridCategory}>
            <View style={styles.elegantHeader}>
              <View>
                <Text style={styles.elegantTitle}>Hot Deals 🔥</Text>
                <Text style={styles.elegantSubtitle}>{offersItems.length} items on sale</Text>
              </View>
            </View>

            <View style={styles.premiumGrid}>
              {offersItems.map((item, index) => (
                <TouchableOpacity
                  key={item._id}
                  style={[
                    styles.gridCard,
                    index % 7 === 0 && styles.gridCardWide
                  ]}
                  activeOpacity={0.9}
                  onPress={() => activeTab === 'Services' ? navigateToService(item) : navigateToProduct(item)}
                >
                  <View style={styles.gridCardImageContainer}>
                    <Image
                      source={{ 
                        uri: activeTab === 'Services' 
                          ? (item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400')
                          : (item.primaryImage || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400')
                      }}
                      style={styles.gridCardImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.05)']}
                      style={styles.gridImageGradient}
                    />
                    <View style={styles.modernDiscountBadge}>
                      <Text style={styles.modernDiscountText}>{getDiscountPercentage(item)}%</Text>
                    </View>
                  </View>
                  
                  <View style={styles.gridCardBody}>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.gridPriceRow}>
                      <Text style={styles.gridOfferPrice}>
                        ₹{activeTab === 'Services' ? item.offer_price : item.offerPrice}
                      </Text>
                      <Text style={styles.gridOriginalPrice}>₹{item.price}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* All Items Section */}
        {regularItems.length > 0 && (
          <View style={styles.gridCategory}>
            <View style={styles.elegantHeader}>
              <View>
                <Text style={styles.elegantTitle}>All {activeTab}</Text>
                <Text style={styles.elegantSubtitle}>{regularItems.length} items available</Text>
              </View>
            </View>

            <View style={styles.premiumGrid}>
              {regularItems.map((item, index) => (
                <TouchableOpacity
                  key={item._id}
                  style={[
                    styles.gridCard,
                    index % 9 === 0 && styles.gridCardWide
                  ]}
                  activeOpacity={0.9}
                  onPress={() => activeTab === 'Services' ? navigateToService(item) : navigateToProduct(item)}
                >
                  <View style={styles.gridCardImageContainer}>
                    <Image
                      source={{ 
                        uri: activeTab === 'Services' 
                          ? (item.image_url || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400')
                          : (item.primaryImage || (item.images && item.images[0]?.url) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400')
                      }}
                      style={styles.gridCardImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.05)']}
                      style={styles.gridImageGradient}
                    />
                    {index % 5 === 0 && (
                      <View style={styles.trendingBadge}>
                        <Icon name="trending-up" size={12} color="#FFF" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.gridCardBody}>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.gridPrice}>₹{item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const LoadMoreSection = () => {
    const currentData = activeTab === 'Services' ? services : products;
    const hasMore = currentData.length > displayLimit;

    if (!hasMore) return null;

    return (
      <TouchableOpacity 
        style={styles.loadMoreContainer} 
        onPress={loadMoreItems}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F8F9FA', '#FFF']}
          style={styles.loadMoreGradient}
        >
          <Icon name="refresh-outline" size={22} color="#000" />
          <Text style={styles.loadMoreLabel}>Load More {activeTab}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.elegantEmptyState}>
      <View style={styles.emptyIconCircle}>
        <Icon name="cube-outline" size={40} color="#CCC" />
      </View>
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySubtitle}>Check back soon for new items</Text>
    </View>
  );

  const isLoading = activeTab === 'Services' ? loading.services : loading.products;
  const currentData = activeTab === 'Services' ? services : products;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <Header />
      
      <Animated.ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Modern Search Bar */}
        <Animated.View 
          style={[
            styles.searchSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.modernSearchBar}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.modernSearchInput}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              placeholder="What are you looking for?"
              placeholderTextColor="#999"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={20} color="#CCC" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Elegant Tab Switcher */}
        <Animated.View 
          style={[
            styles.tabSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.elegantTabs}>
            <TouchableOpacity
              style={[styles.elegantTab, activeTab === 'Services' && styles.elegantTabActive]}
              onPress={() => setActiveTab('Services')}
              activeOpacity={0.7}
            >
              <Text style={[styles.elegantTabText, activeTab === 'Services' && styles.elegantTabTextActive]}>
                Services
              </Text>
              {activeTab === 'Services' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.elegantTab, activeTab === 'Products' && styles.elegantTabActive]}
              onPress={() => setActiveTab('Products')}
              activeOpacity={0.7}
            >
              <Text style={[styles.elegantTabText, activeTab === 'Products' && styles.elegantTabTextActive]}>
                Products
              </Text>
              {activeTab === 'Products' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading {activeTab.toLowerCase()}...</Text>
          </View>
        ) : currentData.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <PremiumHeroSection />
            <FeaturedCarousel />
            <PremiumGrid />
            <LoadMoreSection />
          </>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
  },

  // Modern Search
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  modernSearchBar: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    fontWeight: '400',
  },

  // Elegant Tabs
  tabSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    position: 'relative',
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

  // Premium Hero
  premiumHero: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  heroContainer: {
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  heroBackgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 28,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  starBurst: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  premiumBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroMainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 16,
    lineHeight: 38,
  },
  heroPriceContainer: {
    marginBottom: 20,
  },
  priceWithOffer: {
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFF',
  },
  heroPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
  },
  heroOfferPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFD700',
  },
  heroOriginalPrice: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  savingsTag: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savingsText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroAction: {
    marginTop: 8,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  viewDetailsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Featured Section
  featuredSection: {
    marginBottom: 35,
  },
  elegantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  elegantTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  elegantSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  seeAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  featuredScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 16,
  },
  featuredCardContainer: {
    width: CARD_WIDTH + 20,
  },
  elegantFeaturedCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  floatingDiscountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  discountPercentage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 18,
  },
  // Continuation of styles from line 851
  offText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardPriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardOfferPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  cardOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },

  // Premium Grid
  gridSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  gridCategory: {
    marginBottom: 35,
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardWide: {
    width: width - 40,
  },
  gridCardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
  },
  gridImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  modernDiscountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modernDiscountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  trendingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gridCardBody: {
    padding: 14,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    lineHeight: 18,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridOfferPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  gridOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },

  // Load More
  loadMoreContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  loadMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  loadMoreLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  // Empty State
  elegantEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Loading State
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },

  // Tab Indicator
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 0,
    backgroundColor: 'transparent',
  },
});

export default Dashboard;