// services/googleAuthService.js
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

class GoogleAuthService {
  constructor() {
    this.isConfigured = false;
  }

  // Initialize Google Sign In
  configure() {
    if (this.isConfigured) return;

    GoogleSignin.configure({
      webClientId: '334043250137-eov1ir0469mcrnfeuatslbs2n5hue0vi.apps.googleusercontent.com', // From Google Console
      iosClientId: Platform.OS === 'ios' ? 'YOUR_IOS_CLIENT_ID' : undefined,
      androidClientId: Platform.OS === 'android' ? '334043250137-aqo1olaihni846j5q2v0hmmnobeku05v.apps.googleusercontent.com' : undefined,
      offlineAccess: true, // To get refresh token
      hostedDomain: '', // Leave empty for any domain
      forceCodeForRefreshToken: true, // Android only
      accountName: '', // Android only
      googleServicePlistPath: '', // iOS only
    });

    this.isConfigured = true;
  }

  // Sign in with Google
  async signIn() {
    try {
      this.configure();

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices();

      // Get user info
      const userInfo = await GoogleSignin.signIn();
      
      // Get access token
      const tokens = await GoogleSignin.getTokens();

      return {
        success: true,
        userInfo: {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name,
          photo: userInfo.user.photo,
          familyName: userInfo.user.familyName,
          givenName: userInfo.user.givenName,
        },
        tokens: {
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
        },
      };
    } catch (error) {
      console.error('Google Sign In Error:', error);
      return this.handleError(error);
    }
  }

  // Sign out
  async signOut() {
    try {
      await GoogleSignin.signOut();
      return { success: true };
    } catch (error) {
      console.error('Google Sign Out Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Revoke access
  async revokeAccess() {
    try {
      await GoogleSignin.revokeAccess();
      return { success: true };
    } catch (error) {
      console.error('Google Revoke Access Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is signed in
  async getCurrentUser() {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      return null;
    }
  }

  // Get fresh tokens
  async refreshTokens() {
    try {
      const tokens = await GoogleSignin.getTokens();
      return { success: true, tokens };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle errors
  handleError(error) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return {
          success: false,
          error: 'User cancelled the sign-in process',
          code: 'CANCELLED'
        };
      case statusCodes.IN_PROGRESS:
        return {
          success: false,
          error: 'Sign-in is already in progress',
          code: 'IN_PROGRESS'
        };
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return {
          success: false,
          error: 'Google Play Services not available or outdated',
          code: 'PLAY_SERVICES_UNAVAILABLE'
        };
      default:
        return {
          success: false,
          error: error.message || 'An unknown error occurred',
          code: 'UNKNOWN_ERROR'
        };
    }
  }
}

export default new GoogleAuthService();