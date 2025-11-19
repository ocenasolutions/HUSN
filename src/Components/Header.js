import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../API/config';

const { width } = Dimensions.get('window');

const Header = ({ 
  title, 
  showBack, 
  onBackPress, 
  showCart = true,
  showWishlist = true,
  currentPage = '',
  showPageIndicator = true,
  showAddress = true,
}) => {
  const { user, tokens } = useAuth();
  const { totalCartCount, refreshCounts } = useCart();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
  const fetchWalletBalance = async () => {
    try {
      const response = await fetch(`${API_URL}/wallet/balance`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setWalletBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };
  
  if (user) {
    fetchWalletBalance();
  }
}, [user]);

  const fetchDefaultAddress = async () => {
    try {
      setAddressLoading(true);
      const response = await fetch(`${API_URL}/addresses`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const defaultAddr = data.data.find(addr => addr.isDefault);
        const selectedAddress = defaultAddr || data.data[0];
        setDefaultAddress(selectedAddress);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setAddressLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user && !showBack) {
        fetchDefaultAddress();
      }
      if (user) {
        refreshCounts();
      }
    }, [user, showBack])
  );

  const getShortAddress = () => {
    if (addressLoading) return 'Loading...';
    if (!defaultAddress) return 'Select delivery address';
    
    if (defaultAddress.city && defaultAddress.state) {
      return `${defaultAddress.city}, ${defaultAddress.state}`;
    } else if (defaultAddress.city) {
      return defaultAddress.city;
    } else if (defaultAddress.pincode) {
      return `Pincode ${defaultAddress.pincode}`;
    }
    return 'Address available';
  };

  const getPageTitle = () => {
    if (currentPage) return currentPage;
    if (title) return title;
    
    const routeName = route.name;
    if (routeName === 'Home') return 'Home';
    if (routeName === 'ViewCart') return 'My Cart';
    if (routeName === 'Wishlist') return 'Wishlist';
    if (routeName === 'ProductDetails') return 'Product Details';
    if (routeName === 'Profile') return 'Profile';
    if (routeName === 'Categories') return 'Categories';
    if (routeName === 'Search') return 'Search';
    if (routeName === 'Orders') return 'My Orders';
    if (routeName === 'OrderDetails') return 'Order Details';
    if (routeName === 'Settings') return 'Settings';
    if (routeName === 'EditProfile') return 'Edit Profile';
    if (routeName === 'Addresses') return 'My Addresses';
    if (routeName === 'AddAddress') return 'Add Address';
    if (routeName === 'Checkout') return 'Checkout';
    if (routeName === 'PaymentMethods') return 'Payment Methods';
    if (routeName === 'Notifications') return 'Notifications';
    if (routeName === 'Help') return 'Help & Support';
    if (routeName === 'About') return 'About Us';
    
    return routeName.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleCartPress = () => {
    navigation.navigate('ViewCart');
  };

  const handleWishlistPress = () => {
    navigation.navigate('Wishlist');
  };
  const handleWalletPress = () => {
    navigation.navigate('Wallet');
  }
  const handleAddressPress = () => {
    navigation.navigate('SavedAddresses');
  };

  const isSmallScreen = width < 350;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          {/* Left Section */}
          <View style={styles.leftSection}>
            {showBack ? (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={onBackPress}
              >
                <Icon name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.logoSection}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
              >
                <Text style={styles.husn}>HUSN</Text>
                {showAddress && user && (
                  <TouchableOpacity 
                    style={styles.addressContainer}
                    onPress={handleAddressPress}
                    activeOpacity={0.7}
                  >
                    <Icon name="location" size={14} color="#666" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {getShortAddress()}
                    </Text>
                    <Icon name="chevron-down" size={14} color="#666" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Center Section */}
          {showPageIndicator && (
            <View style={styles.centerSection}>
              <Text style={styles.pageTitle} numberOfLines={1}>
                {getPageTitle()}
              </Text>
            </View>
          )}

          {/* Right Section */}
<View style={styles.rightSection}>
  {/* Wallet Button */}
  <TouchableOpacity 
    style={styles.actionButton}
    onPress={handleWalletPress}
    activeOpacity={0.7}
  >
    <Icon 
      name="wallet-outline" 
      size={isSmallScreen ? 20 : 22} 
      color="#333" 
    />
  </TouchableOpacity>

  {/* Wishlist Button */}
  {showWishlist && (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handleWishlistPress}
      activeOpacity={0.7}
    >
      <Icon 
        name="heart-outline" 
        size={isSmallScreen ? 20 : 22} 
        color="#333" 
      />
    </TouchableOpacity>
  )}
  
  {/* Cart Button */}
  {showCart && (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={handleCartPress}
      activeOpacity={0.7}
    >
      <Icon 
        name="cart-outline" 
        size={isSmallScreen ? 20 : 22} 
        color="#333" 
      />
      {totalCartCount > 0 && (
        <View style={[styles.badge, styles.cartBadge]}>
          <Text style={styles.badgeText}>
            {totalCartCount > 99 ? '99+' : totalCartCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )}
</View>

        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  leftSection: { justifyContent: 'flex-start', alignItems: 'flex-start', minWidth: 100 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  logoSection: { paddingVertical: 4, paddingHorizontal: 4 },
  husn: { color: '#FF6B9D', fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5 },
  addressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2, paddingVertical: 2, paddingRight: 4 },
  addressText: { fontSize: 11, color: '#666', marginLeft: 3, marginRight: 2, maxWidth: 90, fontWeight: '500' },
  centerSection: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { color: '#333', fontSize: 18, fontWeight: '600', textAlign: 'center', maxWidth: width - 240 },
  rightSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 100 },
  actionButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 4, position: 'relative', borderRadius: 20 },
  badge: { position: 'absolute', top: 4, right: 4, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  cartBadge: { backgroundColor: '#FF6B9D' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 2 },
  
//   walletBadge: {
//   backgroundColor: '#FFD700', 
//   top: 6,
//   right: 6,
// },

});

export default Header;
