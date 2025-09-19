// App.js - Updated with order confirmation and tracking screens
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, ActivityIndicator, Text, SafeAreaView, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Import Confirmation
import SignUp from './src/Confirmation/SignUp';
import Login from './src/Confirmation/Login';
import ForgetPassword from './src/Confirmation/ForgetPassword';

// Import Pages
import LandingPage from './src/LandingPage/LandingPage';
import Dashboard from './src/Pages/Dashboard/Dashboard';
import ProductUploadScreen from './src/Pages/Dashboard/ProductUploadScreen';
import AdminUpload from './src/Pages/Dashboard/AdminUpload';
import MediaUploadScreen from './src/Pages/Dashboard/MediaUploadScreen';
import ProfilePage from './src/Pages/Profile/ProfilePage';

// Import Profile Sub-pages
import WishlistScreen from './src/Pages/Profile/WishlistScreen';
import SavedAddressesScreen from './src/Pages/Profile/SavedAddressesScreen';
import MyOrdersScreen from './src/Pages/Profile/MyOrdersScreen';
import HelpCenterScreen from './src/Pages/Profile/HelpCenterScreen';
import AboutUsScreen from './src/Pages/Profile/AboutUsScreen';
import RateUsScreen from './src/Pages/Profile/RateUsScreen';
import TermsScreen from './src/Pages/Profile/TermsScreen';
import PrivacyScreen from './src/Pages/Profile/PrivacyScreen';

// Import Main Pages
import ServicesPage from './src/Pages/Services/ServicesPage';
import CategoryServices from './src/Pages/Services/CategoryServices'; 
import PlayScreen from './src/Pages/Play/PlayScreen';
import OffersScreen from './src/Pages/Offers/OffersScreen';
import Product from './src/Pages/Product/ProductsScreen';

// Import Product-related Components
import ProductCartScreen from './src/Pages/Product/ProductCartScreen';

// Import Booking System Components
import ServiceDetails from './src/Pages/Services/ServiceDetails.js';
import ViewCartScreen from './src/Pages/Cart/ViewCartScreen';
import CheckoutScreen from './src/Pages/Booking/CheckoutScreen';
import { MyBookingsScreen, NotificationsScreen } from './src/Pages/Booking/MyBookingsScreen';
import BookingManagementScreen from './src/Pages/Admin/BookingManagementScreen';
import ProductDetails from './src/Pages/Product/ProductDetails.js';

// Import New Order Flow Components
import OrderConfirmationScreen from './src/Pages/Booking/OrderConfirmationScreen';
import TrackOrderScreen from './src/Pages/Booking/TrackOrderScreen';

import Footer from './src/Components/Footer';

const Stack = createStackNavigator();

const LoadingScreen = () => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8'
  }}>
    <ActivityIndicator size="large" color="#FF6B9D" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#7F8C8D' }}>Loading...</Text>
  </View>
);

const ScreenWrapper = ({ component: Component, showFooter = false, ...props }) => {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <Component {...props} />
      </View>
      {showFooter && <Footer />}
    </View>
  );
};

// Screen Wrappers with Footer
const DashboardWithFooter = (props) => (
  <ScreenWrapper component={Dashboard} showFooter={true} {...props} />
);

const ServicesWithFooter = (props) => (
  <ScreenWrapper component={ServicesPage} showFooter={true} {...props} />
);

const PlayWithFooter = (props) => (
  <ScreenWrapper component={PlayScreen} showFooter={true} {...props} />
);

const OffersWithFooter = (props) => (
  <ScreenWrapper component={OffersScreen} showFooter={true} {...props} />
);

const ProductWithFooter = (props) => (
  <ScreenWrapper component={Product} showFooter={true} {...props} />
);

const ProfileWithFooter = (props) => (
  <ScreenWrapper component={ProfilePage} showFooter={true} {...props} />
);

// Screen Wrappers without Footer
const AdminUploadWrapper = (props) => (
  <ScreenWrapper component={AdminUpload} showFooter={false} {...props} />
);

const BookingManagementWrapper = (props) => (
  <ScreenWrapper component={BookingManagementScreen} showFooter={false} {...props} />
);

const WishlistWrapper = (props) => (
  <ScreenWrapper component={WishlistScreen} showFooter={false} {...props} />
);

const SavedAddressesWrapper = (props) => (
  <ScreenWrapper component={SavedAddressesScreen} showFooter={false} {...props} />
);

const MyOrdersWrapper = (props) => (
  <ScreenWrapper component={MyOrdersScreen} showFooter={false} {...props} />
);

const MyBookingsWrapper = (props) => (
  <ScreenWrapper component={MyBookingsScreen} showFooter={false} {...props} />
);

const NotificationsWrapper = (props) => (
  <ScreenWrapper component={NotificationsScreen} showFooter={false} {...props} />
);

const HelpCenterWrapper = (props) => (
  <ScreenWrapper component={HelpCenterScreen} showFooter={false} {...props} />
);

const AboutUsWrapper = (props) => (
  <ScreenWrapper component={AboutUsScreen} showFooter={false} {...props} />
);

const RateUsWrapper = (props) => (
  <ScreenWrapper component={RateUsScreen} showFooter={false} {...props} />
);

const TermsWrapper = (props) => (
  <ScreenWrapper component={TermsScreen} showFooter={false} {...props} />
);

const PrivacyWrapper = (props) => (
  <ScreenWrapper component={PrivacyScreen} showFooter={false} {...props} />
);

const MediaUploadWrapper = (props) => (
  <ScreenWrapper component={MediaUploadScreen} showFooter={false} {...props} />
);

const ProductUploadWrapper = (props) => (
  <ScreenWrapper component={ProductUploadScreen} showFooter={false} {...props} />
);

const ServiceDetailsWrapper = (props) => (
  <ScreenWrapper component={ServiceDetails} showFooter={false} {...props} />
);

const CategoryServicesWrapper = (props) => (
  <ScreenWrapper component={CategoryServices} showFooter={false} {...props} />
);

const ViewCartWrapper = (props) => (
  <ScreenWrapper component={ViewCartScreen} showFooter={false} {...props} />
);

const CheckoutWrapper = (props) => (
  <ScreenWrapper component={CheckoutScreen} showFooter={false} {...props} />
);

// New Product-related Screen Wrappers
const ProductCartWrapper = (props) => (
  <ScreenWrapper component={ProductCartScreen} showFooter={false} {...props} />
);

const ProductDetailsWrapper = (props) => (
  <ScreenWrapper component={ProductDetails} showFooter={false} {...props} />
);

// New Order Flow Screen Wrappers
const OrderConfirmationWrapper = (props) => (
  <ScreenWrapper component={OrderConfirmationScreen} showFooter={true} {...props} />
);

const TrackOrderWrapper = (props) => (
  <ScreenWrapper component={TrackOrderScreen} showFooter={true} {...props} />
);

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#FFF5F8' }
    }}
  >
    <Stack.Screen name="Landing" component={LandingPage} />
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="SignUp" component={SignUp} />
    <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#FFF5F8' }
    }}
    initialRouteName="Home"
  >
    {/* Main screens with Footer */}
    <Stack.Screen name="Home" component={DashboardWithFooter} />
    <Stack.Screen name="Services" component={ServicesWithFooter} />
    <Stack.Screen name="Play" component={PlayWithFooter} />
    <Stack.Screen name="Offers" component={OffersWithFooter} />
    <Stack.Screen name="Product" component={ProductWithFooter} />
    <Stack.Screen name="Profile" component={ProfileWithFooter} />

    {/* Admin screens */}
    <Stack.Screen 
      name="AdminUpload" 
      component={AdminUploadWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="BookingManagement" 
      component={BookingManagementWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    {/* Profile sub-screens */}
    <Stack.Screen 
      name="Wishlist" 
      component={WishlistWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="SavedAddresses" 
      component={SavedAddressesWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="MyOrders" 
      component={MyOrdersWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen 
      name="MyBookings" 
      component={MyBookingsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen 
      name="Notifications" 
      component={NotificationsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="HelpCenter" 
      component={HelpCenterWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="AboutUs" 
      component={AboutUsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="RateUs" 
      component={RateUsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="Terms" 
      component={TermsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen 
      name="Privacy" 
      component={PrivacyWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    {/* Upload screens */}
    <Stack.Screen
      name="MediaUploadScreen"
      component={MediaUploadWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    
    <Stack.Screen
      name="ProductUploadScreen"
      component={ProductUploadWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    {/* Service Booking System screens */}
    <Stack.Screen
      name="ServiceDetails"
      component={ServiceDetailsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    <Stack.Screen
      name="CategoryServices"
      component={CategoryServicesWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen
      name="ViewCart"
      component={ViewCartWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen
      name="Checkout"
      component={CheckoutWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    {/* Product System screens */}
    <Stack.Screen
      name="ProductCart"
      component={ProductCartWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    <Stack.Screen
      name="ProductDetails"
      component={ProductDetailsWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    {/* New Order Flow screens */}
    <Stack.Screen
      name="OrderConfirmation"
      component={OrderConfirmationWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
        gestureEnabled: false, // Prevent swipe back
      }}
    />

    <Stack.Screen
      name="TrackOrder"
      component={TrackOrderWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
  </Stack.Navigator>
);

// Main Navigation Component
const AppNavigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B9D" />
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <AppNavigation />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  contentContainer: {
    flex: 1,
  },
});

export default App;