import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Header = ({ 
  title, 
  showBack, 
  onBackPress, 
  showCart = true,
  cartItemCount = 0,
  showWishlist = true,
  wishlistItemCount = 0,
  currentPage = '',
  showPageIndicator = true
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  // Auto-detect page name from route or use provided props
  const getPageTitle = () => {
    if (currentPage) return currentPage;
    if (title) return title;
    
    // Convert route name to readable format
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
    
    // Default: convert camelCase to readable format
    return routeName.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleCartPress = () => {
    navigation.navigate('ViewCart');
  };

  const handleWishlistPress = () => {
    navigation.navigate('Wishlist');
  };

  const isSmallScreen = width < 350;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          {/* Left Section - Back Button or HUSN Logo */}
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
              >
                <Text style={styles.husn}>HUSN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Center Section - Page Title */}
          <View style={styles.centerSection}>
            {showPageIndicator && (
              <Text style={styles.pageTitle}>
                {getPageTitle()}
              </Text>
            )}
          </View>

          {/* Right Section - Action Buttons */}
          <View style={styles.rightSection}>
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
                {wishlistItemCount > 0 && (
                  <View style={[styles.badge, styles.wishlistBadge]}>
                    <Text style={styles.badgeText}>
                      {wishlistItemCount > 99 ? '99+' : wishlistItemCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            
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
                {cartItemCount > 0 && (
                  <View style={[styles.badge, styles.cartBadge]}>
                    <Text style={styles.badgeText}>
                      {cartItemCount > 99 ? '99+' : cartItemCount}
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
  leftSection: {
    width: 80,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  logoSection: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  husn: {
    color: '#FF6B9D',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pageTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    position: 'relative',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadge: {
    backgroundColor: '#FF6B9D',
  },
  wishlistBadge: {
    backgroundColor: '#E74C3C',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
});

export default Header;