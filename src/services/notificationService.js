import messaging from '@react-native-firebase/messaging';
import { API_URL } from '../API/config';

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('✅ Notification permission granted');
    return true;
  }
  return false;
};

export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('📱 FCM Token:', token);
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

export const registerDeviceToken = async (token, authToken) => {
  try {
    const response = await fetch(`${API_URL}/push-notifications/register-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        platform: 'android',
        deviceInfo: {
          // Add device info if needed
        }
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('❌ Error registering token:', error);
    return false;
  }
};

export const setupNotificationListeners = (navigation) => {
  // Foreground message handler
  messaging().onMessage(async remoteMessage => {
    console.log('📩 Foreground notification:', remoteMessage);
    // Show local notification or handle in-app
  });

  // Background/Quit message handler
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📩 Background notification:', remoteMessage);
  });

  // Notification opened app
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('🔔 Notification opened app:', remoteMessage);
    // Navigate based on deepLink
    if (remoteMessage.data?.deepLink) {
      // navigation.navigate(...)
    }
  });

  // App opened from quit state
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('🔔 App opened from quit state:', remoteMessage);
        // Navigate based on deepLink
      }
    });
};