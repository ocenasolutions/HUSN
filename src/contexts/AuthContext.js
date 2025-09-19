import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../API/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedTokens = await AsyncStorage.getItem('tokens');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedTokens && storedUser) {
        setTokens(JSON.parse(storedTokens));
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAuthData = async (userData, tokenData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('tokens', JSON.stringify(tokenData));
      setUser(userData);
      setTokens(tokenData);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        await saveAuthData(data.user, data.tokens);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const login = async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        await saveAuthData(data.user, data.tokens);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const googleAuth = async (accessToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();

      if (data.success) {
        await saveAuthData(data.user, data.tokens);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const sendOTP = async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        await saveAuthData(data.user, data.tokens);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // New method to set guest user
  const setGuestUser = () => {
    const guestUser = {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@example.com',
      isGuest: true,
      role: 'guest'
    };
    setUser(guestUser);
    // Don't save guest user to AsyncStorage so they'll need to authenticate on app restart
  };

  const logout = async () => {
    try {
      if (tokens?.accessToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await AsyncStorage.multiRemove(['user', 'tokens']);
      setUser(null);
      setTokens(null);
    }
  };

  const value = {
    user,
    tokens,
    loading,
    signup,
    login,
    googleAuth,
    sendOTP,
    verifyOTP,
    setGuestUser, // Add this new method
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};