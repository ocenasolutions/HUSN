// src/services/expoNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../API/config';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestUserPermission = async () => {
  try {
    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }
    
    console.log('✅ Notification permission granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    return false;
  }
};

// Get Expo Push Token
export const getExpoPushToken = async () => {
  try {
    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for Push Notifications');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '0a486d84-5636-446f-9ed4-b12ae872482a', 
    });
    
    console.log('📱 Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('❌ Error getting Expo Push Token:', error);
    return null;
  }
};

// Register device token with backend
export const registerDeviceToken = async (token, authToken) => {
  try {
    console.log('📤 Registering device token...');
    
    const response = await fetch(`${API_URL}/push-notifications/register-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          model: Device.modelName,
          osVersion: Device.osVersion
        }
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Device token registered successfully');
      return true;
    } else {
      console.error('❌ Failed to register token:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registering token:', error);
    return false;
  }
};

// Unregister device token
export const unregisterDeviceToken = async (token, authToken) => {
  try {
    const response = await fetch(`${API_URL}/push-notifications/unregister-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('❌ Error unregistering token:', error);
    return false;
  }
};

// Setup notification listeners
export const setupNotificationListeners = (navigation) => {
  console.log('🔔 Setting up notification listeners...');

  // Handle notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Foreground notification:', notification);
    // Notification is automatically displayed due to handler config above
  });

  // Handle user tapping on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('🔔 Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    
    // Handle deep linking
    if (data?.deepLink) {
      handleDeepLink(data.deepLink, navigation);
    } else if (data?.screen) {
      navigation.navigate(data.screen, data.params || {});
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};

// Handle deep links from notifications
const handleDeepLink = (deepLink, navigation) => {
  try {
    console.log('🔗 Handling deep link:', deepLink);
    
    const cleanLink = deepLink.startsWith('/') ? deepLink.slice(1) : deepLink;
    
    if (cleanLink.startsWith('product/')) {
      const productId = cleanLink.split('/')[1];
      navigation.navigate('ProductDetails', { productId });
    } else if (cleanLink.startsWith('service/')) {
      const serviceId = cleanLink.split('/')[1];
      navigation.navigate('ServiceDetails', { serviceId });
    } else if (cleanLink.startsWith('salon/')) {
      const salonId = cleanLink.split('/')[1];
      navigation.navigate('SalonDetail', { salonId });
    } else if (cleanLink === 'cart') {
      navigation.navigate('ProductCart');
    } else if (cleanLink === 'orders') {
      navigation.navigate('MyOrders');
    } else if (cleanLink === 'offers') {
      navigation.navigate('Offers');
    } else if (cleanLink === 'salons') {
      navigation.navigate('Salons');
    } else {
      navigation.navigate('Home');
    }
  } catch (error) {
    console.error('❌ Error handling deep link:', error);
  }
};

// Initialize notifications
export const initializeNotifications = async (user, authToken, navigation) => {
  try {
    if (!user || !authToken) {
      console.log('⚠️ User not logged in, skipping notification setup');
      return false;
    }

    console.log('🔔 Initializing notifications...');

    // Request permission
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log('⚠️ Notification permission not granted');
      return false;
    }

    // Get Expo Push Token
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) {
      console.log('⚠️ Failed to get Expo Push Token');
      return false;
    }

    // Register token with backend
    const registered = await registerDeviceToken(expoPushToken, authToken);
    if (!registered) {
      console.log('⚠️ Failed to register device token');
      return false;
    }

    // Setup listeners
    const cleanup = setupNotificationListeners(navigation);

    console.log('✅ Notifications initialized successfully');
    return cleanup;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return false;
  }
};

// Configure notification channel for Android
export const configureNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B9D',
      sound: 'default',
    });
  }
};

export default {
  requestUserPermission,
  getExpoPushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  setupNotificationListeners,
  initializeNotifications,
  configureNotificationChannel
};