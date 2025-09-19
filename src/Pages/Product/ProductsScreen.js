import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  Alert,
  Modal,
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
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false
  });

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

  const fetchProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
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
    try {
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setCartItemCount(data.data.totalItems);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  }, []);

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

  useEffect(() => {
    handleSearch();
  }, [searchQuery, products]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredProducts(filtered);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchProducts(pagination.currentPage + 1);
    }
  };

  const addToCart = async (product) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

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
        setCartItemCount(prev => prev + 1);
        Alert.alert('Success', 'Product added to cart!');
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
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

  const renderProductItem = ({ item }) => {
    const isInWishlist = wishlistItems.includes(item._id);
    
    return (
      <View style={styles.productCardContainer}>
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetails', { product: item })}
        >
          <View style={styles.productImageContainer}>
            <Image 
              source={{ uri: item.primaryImage || item.images?.[0]?.url || 'https://via.placeholder.com/150x150' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
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
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            
            <TouchableOpacity
              style={styles.addToBagButton}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.addToBagText}>Add to Bag</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
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
  const PopularCategories = () => {
    const categoryProducts = categories.slice(1, 5).map(category => {
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
              style={styles.categoryItem}
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

  const displayProducts = searchQuery.trim() ? filteredProducts : products;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Arrow and Title */}
      <Header/>
      <View style={styles.pageHeader}>
      </View>

      {/* Search Bar */}
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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Categories */}
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

        {/* Sort and Filter Row */}
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

        {/* Featured Products */}
        <FeaturedProducts />

        {/* Products Grid */}
        <View style={styles.productsSection}>
          {loading && products.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D76D77" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : displayProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="search-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              <FlatList
                data={displayProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.productRow}
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
            </View>
          )}
        </View>
      </ScrollView>
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
  backButton: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
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
  scrollContainer: {
    flex: 1,
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
  productsSection: {
    flex: 1,
    paddingBottom: 20,
  },
  productsGrid: {
    paddingHorizontal: 8,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCardContainer: {
    width: '49%',
    marginBottom: 16,
  },
  // productCard: {
  //   backgroundColor: '#FFF',
  //   borderRadius: 16,
  //   overflow: 'hidden',
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 8,
  //   elevation: 3,
  // },
  productImageContainer: {
  position: 'relative',
  height: 200,
  borderRadius: 16,   // curve for the container
  overflow: 'hidden', // ensures image respects the curve
},
productImage: {
  width: '100%',
  height: '100%',
  borderRadius: 18,   
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
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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

  // Loading & Empty States
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

  // Filter Modal
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
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedSortOption: {
    borderColor: '#D76D77',
    backgroundColor: '#FFF5F6',
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
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
    categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryImageContainer: {
    width: 110,
    height:110,
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
});

export default ProductsScreen;