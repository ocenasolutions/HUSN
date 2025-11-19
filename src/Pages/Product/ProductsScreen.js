import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  RefreshControl,
  ToastAndroid,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../../Components/Header';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

const ProductsScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartItems, setCartItems] = useState(new Map());
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false
  });

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 750;

  const sortOptions = [
    { id: 'newest', label: 'Newest First', value: 'createdAt', order: 'desc' },
    { id: 'oldest', label: 'Oldest First', value: 'createdAt', order: 'asc' },
    { id: 'price-low', label: 'Price: Low to High', value: 'price', order: 'asc' },
    { id: 'price-high', label: 'Price: High to Low', value: 'price', order: 'desc' },
    { id: 'popular', label: 'Most Popular', value: 'totalSales', order: 'desc' },
    { id: 'rating', label: 'Highest Rated', value: 'rating', order: 'desc' },
  ];

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchProducts = useCallback(async (page = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const selectedSort = sortOptions.find(option => option.id === sortBy);
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      
      const response = await fetch(
        `${API_URL}/products?page=${page}&limit=20&sortBy=${selectedSort.value}&sortOrder=${selectedSort.order}${categoryParam}&status=published`
      );
      
      const data = await response.json();
      
      if (data.success) {
        if (page === 1) {
          setProducts(data.data);
        } else {
          setProducts(prev => [...prev, ...data.data]);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, sortBy]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/products/categories`);
      const data = await response.json();
      
      if (data.success) {
        setCategories([{ name: 'all', label: 'All' }, ...data.data.map(cat => ({ name: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartItems(new Map());
      setCartItemCount(0);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setCartItemCount(data.data.totalItems);
        
        const itemsMap = new Map();
        data.data.items.forEach(item => {
          itemsMap.set(item.product._id, {
            cartItemId: item._id,
            quantity: item.quantity
          });
        });
        setCartItems(itemsMap);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  }, [user]);

  const fetchWishlist = useCallback(async () => {
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
  }, []);

  const onRefresh = useCallback(() => {
    fetchProducts(1, true);
    if (user) {
      fetchCartCount();
      fetchWishlist();
    }
  }, [fetchProducts, user]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    if (user) {
      fetchCartCount();
      fetchWishlist();
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }

    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchProducts(pagination.currentPage + 1);
    }
  };

  const notifyWhenAvailable = (product) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to get notified when product is available');
      return;
    }

    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        `🔔 You'll be notified when "${product.name}" is back in stock!`,
        ToastAndroid.LONG,
        ToastAndroid.BOTTOM
      );
    } else {
      Alert.alert(
        '',
        `🔔 You'll be notified when "${product.name}" is back in stock!`,
        [{ text: 'OK' }]
      );
    }
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

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => navigation.navigate('ProductDetails', { product: item })}
    >
      <View style={styles.featuredImageContainer}>
        <Image 
          source={{ uri: item.primaryImage || item.images?.[0]?.url || 'https://via.placeholder.com/280x200' }} 
          style={styles.featuredImage}
          resizeMode="cover"
        />
        <View style={styles.featuredGradient}>
          <Text style={styles.featuredTitle}>{item.name}</Text>
          <Text style={styles.featuredSubtitle}>Discover beauty</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const QuickAddButton = ({ product }) => {
    const cartItem = cartItems.get(product._id);
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
          await fetchCartCount();
          setTimeout(() => setIsUpdating(false), 100);
        } else {
          setIsUpdating(false);
          Alert.alert('Error', data.message || 'Failed to add to cart');
        }
      } catch (error) {
        setIsUpdating(false);
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add to cart');
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
        const cartResponse = await fetch(`${API_URL}/product-cart`, {
          headers: getAuthHeaders()
        });
        const cartData = await cartResponse.json();
        
        if (!cartData.success) {
          Alert.alert('Error', 'Failed to fetch cart');
          setIsUpdating(false);
          return;
        }
        
        const currentCartItem = cartData.data.items.find(
          item => item.product._id === product._id
        );
        
        if (!currentCartItem) {
          setIsUpdating(false);
          await fetchCartCount();
          return;
        }
        
        const response = await fetch(`${API_URL}/product-cart/${currentCartItem._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ quantity: newQuantity })
        });
        
        const data = await response.json();
        if (data.success) {
          await fetchCartCount();
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
    
    const isAtMinQuantity = cartItem.quantity <= 1;
    const isAtMaxStock = cartItem.quantity >= product.stock;
    
    return (
      <View style={styles.quantityControlWithCorners}>
        <TouchableOpacity
          style={[
            styles.cornerQuantityButton, 
            styles.cornerLeftButton,
            (isUpdating || isAtMinQuantity) && styles.quantityButtonDisabled
          ]}
          onPress={(e) => handleUpdateQuantity(cartItem.quantity - 1, e)}
          disabled={isUpdating || isAtMinQuantity}
        >
          <Icon 
            name="remove" 
            size={16} 
            color={isAtMinQuantity ? "#ccc" : "#D76D77"} 
          />
        </TouchableOpacity>
        
        <View style={styles.quantityDisplayCenter}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#D76D77" />
          ) : (
            <Text style={styles.quantityTextCenter}>{cartItem.quantity}</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.cornerQuantityButton, 
            styles.cornerRightButton,
            (isUpdating || isAtMaxStock) && styles.quantityButtonDisabled
          ]}
          onPress={(e) => handleUpdateQuantity(cartItem.quantity + 1, e)}
          disabled={isUpdating || isAtMaxStock}
        >
          <Icon 
            name="add" 
            size={16} 
            color={isAtMaxStock ? "#ccc" : "#D76D77"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductItem = ({ item }) => {
    const isInWishlist = wishlistItems.includes(item._id);
    const isOutOfStock = item.stock === 0 || item.stock < 1;
    const cartItem = cartItems.get(item._id);
    const averageRating = item.rating || 0;  
    const totalReviews = item.reviewCount || 0;
    
    return (
      <View style={styles.productCardContainer}>
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetails', { product: item })}
        >
          <View style={styles.productImageContainer}>
            <Image 
              source={{ uri: item.primaryImage || item.images?.[0]?.url || 'https://via.placeholder.com/150x150' }} 
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
                {renderStarRating(averageRating, 12)}
                <Text style={styles.productRatingText}>
                  {averageRating.toFixed(1)} ({totalReviews})
                </Text>
              </View>
              <Text style={styles.productPrice}>₹{item.price}</Text>
            </View>
            
            <View style={styles.productActions}>
              {isOutOfStock ? (
                <TouchableOpacity
                  style={styles.notifyButton}
                  onPress={() => notifyWhenAvailable(item)}
                >
                  <Icon name="notifications-outline" size={14} color="#8E8E8F" style={styles.notifyIcon} />
                  <Text style={styles.notifyButtonText}>Notify Me</Text>
                </TouchableOpacity>
              ) : (
                <QuickAddButton product={item} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStarRating = (rating, size = 12) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Icon
            key={i}
            name="star"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Icon
            key={i}
            name="star-half"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      } else {
        stars.push(
          <Icon
            key={i}
            name="star-outline"
            size={size}
            color="#FFD700"
            style={{ marginRight: 1 }}
          />
        );
      }
    }
    return <View style={styles.starContainer}>{stars}</View>;
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

  const PopularCategories = () => {
    const categoryCount = isTablet ? 4 : 3;
    const categoryProducts = categories.slice(1, categoryCount + 1).map(category => {
      const categoryProduct = products.find(p => p.category.toLowerCase() === category.name.toLowerCase());
      return {
        ...category,
        image: categoryProduct?.primaryImage || categoryProduct?.images?.[0]?.url || 'https://via.placeholder.com/60x60'
      };
    });
    if (categoryProducts.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Categories</Text>
        <View style={styles.categoriesGrid}>
          {categoryProducts.map((category, index) => (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.categoryItem,
                { width: isTablet ? '23%' : '30%' }
              ]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <View style={styles.categoryImageContainer}>
                <Image 
                  source={{ uri: category.image }} 
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const FeaturedProducts = () => {
    const featuredProducts = products.filter(product => product.featured).slice(0, 3);
    if (featuredProducts.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={featuredProducts}
          renderItem={renderFeaturedItem}
          keyExtractor={(item) => `featured-${item._id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        />
      </View>
    );
  };

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.filterModalContainer}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  sortBy === option.id && styles.selectedSortOption
                ]}
                onPress={() => setSortBy(option.id)}>
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.id && styles.selectedSortOptionText
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.id && (
                  <Icon name="checkmark" size={20} color="#D76D77" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.applyFilterButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFilterText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Memoized ListHeader to prevent re-renders
  const ListHeader = useMemo(() => {
    return (
      <>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search-outline" size={18} color="#8E8E8F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E8F"
            />
          </View>
        </View>

        <View style={styles.categoriesSection}>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        <View style={styles.sortFilterRow}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.sortButtonText}>Sort</Text>
            <Icon name="chevron-down" size={16} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>Filter</Text>
            <Icon name="chevron-down" size={16} color="#333" />
          </TouchableOpacity>
        </View>
        
        <PopularCategories/>
        <FeaturedProducts />
      </>
    );
  }, [searchQuery, categories, selectedCategory]);

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header/>
      <View style={styles.pageHeader}></View>

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D76D77" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#D76D77']}
              tintColor="#D76D77"
              title="Pull to refresh"
              titleColor="#8E8E8F"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() => (
            loading && products.length > 0 ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#D76D77" />
              </View>
            ) : null
          )}
        />
      )}
      
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => navigation.navigate('ViewCart')}
          activeOpacity={0.9}
        >
          <View style={styles.cartButtonContent}>
            <Text style={styles.cartButtonText}>View Cart</Text>
            <View style={{ position: 'relative' }}>
              <Icon name="cart" size={24} color="#D76D77" />
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      
      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'f5e1dfff',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9dde2ff',
    borderRadius: 20,
    paddingHorizontal: 26,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  categoriesSection: {
    paddingBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedCategoryChip: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#8E8E8F',
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: '#FFF',
  },
  sortFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  sortButtonText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  featuredSection: {
    paddingBottom: 24,
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
  },
  viewAllText: {
    fontSize: 14,
    color: '#8E8E8F',
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 280,
    height: 160,
    marginRight: 16,
  },
  featuredImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  featuredTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
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
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
    height: 36,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  notifyButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    alignSelf: 'center',
    width: '110%',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  notifyIcon: {
    marginRight: 4,
  },
  notifyButtonText: {
    color: '#8E8E8F',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E8F',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E8F',
    textAlign: 'center',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filterContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedSortOptionText: {
    color: '#D76D77',
    fontWeight: '500',
  },
  filterActions: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  applyFilterButton: {
    backgroundColor: '#D76D77',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyFilterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#D76D77',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 150,
    height: 50,
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
    marginRight: 12,
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
});

export default ProductsScreen;