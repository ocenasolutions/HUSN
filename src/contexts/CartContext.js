// contexts/CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../API/config';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, tokens } = useAuth();
  const [serviceCartCount, setServiceCartCount] = useState(0);
  const [productCartCount, setProductCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Fetch service cart count
  const fetchServiceCartCount = async () => {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        setServiceCartCount(data.data.totalItems || 0);
      }
    } catch (error) {
      console.error('Error fetching service cart:', error);
    }
  };

  // Fetch product cart count
  const fetchProductCartCount = async () => {
    try {
      const response = await fetch(`${API_URL}/product-cart`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        setProductCartCount(data.data.totalItems || 0);
      }
    } catch (error) {
      console.error('Error fetching product cart:', error);
    }
  };

  // Fetch wishlist count
  const fetchWishlistCount = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        setWishlistCount(data.data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  // Fetch all counts
  const refreshCounts = async () => {
    if (!user) {
      setServiceCartCount(0);
      setProductCartCount(0);
      setWishlistCount(0);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        fetchServiceCartCount(),
        fetchProductCartCount(),
        fetchWishlistCount()
      ]);
    } catch (error) {
      console.error('Error refreshing counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch counts when user logs in
  useEffect(() => {
    refreshCounts();
  }, [user]);

  // Total cart count (services + products)
  const totalCartCount = serviceCartCount + productCartCount;

  const value = {
    serviceCartCount,
    productCartCount,
    totalCartCount,
    wishlistCount,
    loading,
    refreshCounts,
    setServiceCartCount,
    setProductCartCount,
    setWishlistCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};