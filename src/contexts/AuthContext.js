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

  // NEW: OTP-based signup - Step 1: Send OTP
  const signupSendOTP = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // NEW: OTP-based signup - Step 2: Verify OTP and create account
  const signupVerifyOTP = async (email, otp) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup/verify-otp`, {
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

  // Legacy signup method (kept for backward compatibility)
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

  // Updated Google authentication method
  const googleLogin = async (googleData) => {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleData),
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

  // Legacy Google auth method (kept for backward compatibility)
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

  // NEW: Forgot Password - Step 1: Send OTP
  const forgotPasswordSendOTP = async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/send-otp`, {
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

  // NEW: Forgot Password - Step 2: Verify OTP and login
  const forgotPasswordVerifyOTP = async (email, otp) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
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

  // Legacy OTP methods (kept for backward compatibility)
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

  // Set guest user method
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

  // Update user method
  const updateUser = async (updatedData) => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...user, ...updatedData };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // Delete account method
  const deleteAccount = async (password = '') => {
    try {
      const response = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear all local data
        await AsyncStorage.multiRemove(['user', 'tokens']);
        setUser(null);
        setTokens(null);
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
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
    
    // New OTP-based methods
    signupSendOTP,
    signupVerifyOTP,
    forgotPasswordSendOTP,
    forgotPasswordVerifyOTP,
    
    // Legacy methods (for backward compatibility)
    signup,
    login,
    googleAuth,
    sendOTP,
    verifyOTP,
    
    // Updated methods
    googleLogin,
    
    // Other methods
    setGuestUser,
    updateUser,
    deleteAccount,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};