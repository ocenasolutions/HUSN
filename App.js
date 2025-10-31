// App.js - Updated with CartProvider
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';

// Import Confirmation
import SignUp from './src/Confirmation/SignUp';
import Login from './src/Confirmation/Login';
import ForgetPassword from './src/Confirmation/ForgetPassword';

// Import Pages
import LandingPage from './src/LandingPage/LandingPage';
import Dashboard from './src/Pages/Dashboard/Dashboard';

// Import Profile Sub-pages
import ProfilePage from './src/Pages/Profile/ProfilePage';
import WishlistScreen from './src/Pages/Profile/WishlistScreen';
import SavedAddressesScreen from './src/Pages/Profile/SavedAddressesScreen';
import MyOrdersScreen from './src/Pages/Profile/MyOrdersScreen';
import HelpCenterScreen from './src/Pages/Profile/HelpCenterScreen';
import ChatScreen from './src/Pages/Profile/ChatScreen.js';
import AboutUsScreen from './src/Pages/Profile/AboutUsScreen';
import DeleteAccountScreen from './src/Pages/Profile/DeleteAccountScreen';

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
import MyBookingsScreen from './src/Pages/Booking/MyBookingsScreen';
import ProductDetails from './src/Pages/Product/ProductDetails.js';

// Import New Order Flow Components
import OrderConfirmationScreen from './src/Pages/Booking/OrderConfirmationScreen';
import TrackOrderScreen from './src/Pages/Booking/TrackOrderScreen';

import PaymentGatewayScreen from './src/Pages/Payment/PaymentGatewayScreen';

import ReviewableItemsScreen from './src/Pages/Review/ReviewableItemsScreen';
import ReviewsScreen from './src/Pages/Review/ReviewsScreen';
import WriteReviewScreen from './src/Pages/Review/WriteReviewScreen';
import ProfessionalReviewsScreen from './src/Pages/Review/ProfessionalReviewsScreen';

import ProfessionalTrackingScreen from './src/Pages/Professional/ProfessionalTrackingScreen';
import UserTrackingScreen from './src/Pages/User/UserTrackingScreen';

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

const HelpCenterWrapper = (props) => (
  <ScreenWrapper component={HelpCenterScreen} showFooter={false} {...props} />
);

const ChatWrapper = (props) => (
  <ScreenWrapper component={ChatScreen} showFooter={false} {...props} />
);

const AboutUsWrapper = (props) => (
  <ScreenWrapper component={AboutUsScreen} showFooter={false} {...props} />
);

const DeleteAccountWrapper = (props) => (
  <ScreenWrapper component={DeleteAccountScreen} showFooter={false} {...props} />
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

const ProductCartWrapper = (props) => (
  <ScreenWrapper component={ProductCartScreen} showFooter={false} {...props} />
);

const ProductDetailsWrapper = (props) => (
  <ScreenWrapper component={ProductDetails} showFooter={false} {...props} />
);

const PaymentGatewayWrapper = (props) => (
  <ScreenWrapper component={PaymentGatewayScreen} showFooter={false} {...props} />
);

const OrderConfirmationWrapper = (props) => (
  <ScreenWrapper component={OrderConfirmationScreen} showFooter={true} {...props} />
);

const TrackOrderWrapper = (props) => (
  <ScreenWrapper component={TrackOrderScreen} showFooter={true} {...props} />
);

const ReviewableItemsScreenWrapper = (props) => (
  <ScreenWrapper component={ReviewableItemsScreen} showFooter={true} {...props} />
);

const WriteReviewScreenWrapper = (props) => (
  <ScreenWrapper component={WriteReviewScreen} showFooter={true} {...props} />
);

const ReviewsScreenWrapper = (props) => (
  <ScreenWrapper component={ReviewsScreen} showFooter={true} {...props} />
);

const ProfessionalReviewsScreenWrapper = (props) => (
  <ScreenWrapper component={ProfessionalReviewsScreen} showFooter={true} {...props} />
);

const ProfessionalTrackingWrapper = (props) => (
  <ScreenWrapper component={ProfessionalTrackingScreen} showFooter={false} {...props} />
);

const UserTrackingWrapper = (props) => (
  <ScreenWrapper component={UserTrackingScreen} showFooter={false} {...props} />
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
      name="HelpCenter" 
      component={HelpCenterWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen 
      name="ChatScreen" 
      component={ChatWrapper}
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
      name="DeleteAccount" 
      component={DeleteAccountWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
        gestureEnabled: true,
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
        gestureEnabled: false,
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

    <Stack.Screen
      name="ReviewableItemsScreen"
      component={ReviewableItemsScreenWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    <Stack.Screen
      name="ReviewsScreen"
      component={ReviewsScreenWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    <Stack.Screen
      name="WriteReviewScreen"
      component={WriteReviewScreenWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />
    <Stack.Screen
      name="PaymentGateway"
      component={PaymentGatewayWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
        gestureEnabled: false, 
      }}
    />

    <Stack.Screen
      name="ProfessionalReviewsScreen"
      component={ProfessionalReviewsScreenWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen
      name="ProfessionalTracking"
      component={ProfessionalTrackingWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />

    <Stack.Screen
      name="UserTracking"
      component={UserTrackingWrapper}
      options={{
        headerShown: false,
        presentation: 'card',
      }}
    />


  </Stack.Navigator>
);

// Main Navigation Component - Now wrapped with CartProvider
const AppNavigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#FF6B9D" />
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </CartProvider>
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