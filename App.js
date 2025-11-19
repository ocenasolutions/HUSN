"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from "react-native"
import { AuthProvider, useAuth } from "./src/contexts/AuthContext"
import { CartProvider } from "./src/contexts/CartContext"

// Import Confirmation
import SignUp from "./src/Confirmation/SignUp"
import Login from "./src/Confirmation/Login"
import ForgetPassword from "./src/Confirmation/ForgetPassword"

import WalletScreen from "./src/Pages/Wallet/WalletScreen"
import BuyGiftCardScreen from "./src/Pages/Wallet/BuyGiftCardScreen"
import ClaimGiftCardScreen from "./src/Pages/Wallet/ClaimGiftCardScreen"
import DebtPaymentScreen from "./src/Pages/Orders/DebtPaymentScreen.js"

// Import Pages
import LandingPage from "./src/LandingPage/LandingPage"
import Dashboard from "./src/Pages/Dashboard/Dashboard"

// Import Profile Sub-pages
import ProfilePage from "./src/Pages/Profile/ProfilePage"
import WishlistScreen from "./src/Pages/Profile/WishlistScreen"
import SavedAddressesScreen from "./src/Pages/Profile/SavedAddressesScreen"

import MyOrdersScreen from "./src/Pages/Profile/MyOrdersScreen"

import HelpCenterScreen from "./src/Pages/Profile/HelpCenterScreen"
import ChatScreen from "./src/Pages/Profile/ChatScreen.js"
import AboutUsScreen from "./src/Pages/Profile/AboutUsScreen"
import DeleteAccountScreen from "./src/Pages/Profile/DeleteAccountScreen"

// Import Main Pages
import ServicesPage from "./src/Pages/Services/ServicesPage"
import CategoryServices from "./src/Pages/Services/CategoryServices"
import PlayScreen from "./src/Pages/Play/PlayScreen"
import OffersScreen from "./src/Pages/Offers/OffersScreen"
import Product from "./src/Pages/Product/ProductsScreen"

// Import Product-related Components
import ProductCartScreen from "./src/Pages/Product/ProductCartScreen"

// Import Booking System Components
import ServiceDetails from "./src/Pages/Services/ServiceDetails.js"
import ViewCartScreen from "./src/Pages/Cart/ViewCartScreen"
// import CheckoutScreen from "./src/Pages/Booking/CheckoutScreen"

import CheckoutService from "./src/Pages/Checkout/CheckoutService.js"
import CheckoutProduct from "./src/Pages/Checkout/CheckoutProduct.js"

import MyBookingsScreen from "./src/Pages/Booking/MyBookingsScreen"
import BookingDetailsScreen from "./src/Pages/Booking/BookingDetailsScreen"
import ProductDetails from "./src/Pages/Product/ProductDetails.js"

// Import New Order Flow Components
import OrderConfirmationScreen from "./src/Pages/Booking/OrderConfirmationScreen"
import TrackOrderScreen from "./src/Pages/Booking/TrackOrderScreen"
import TrackServiceScreen from "./src/Pages/Track/TrackServiceScreen"

import PaymentGatewayScreen from "./src/Pages/Payment/PaymentGatewayScreen"

import ReviewableItemsScreen from "./src/Pages/Review/ReviewableItemsScreen"
import ReviewsScreen from "./src/Pages/Review/ReviewsScreen"
import WriteReviewScreen from "./src/Pages/Review/WriteReviewScreen"
import ProfessionalReviewsScreen from "./src/Pages/Review/ProfessionalReviewsScreen"

import RequestRideScreen from "./src/Pages/Ride/RequestRideScreen.js"
import UserLiveTrackingScreen from "./src/Pages/Ride/UserLiveTrackingScreen.js"

import ProductsOrderScreen from "./src/Pages/Orders/ProductsOrderScreen.js"
import ServicesOrderScreen from "./src/Pages/Orders/ServicesOrderScreen.js"

import SalonsScreen from './src/Pages/Salon/SalonsScreen';
import SalonDetailScreen from './src/Pages/Salon/SalonDetailScreen';
import BookAppointmentModal from "./src/Pages/Salon/BookAppointmentModal";
import UserBookingsScreen from "./src/Pages/Salon/UserBookingsScreen";

import Footer from "./src/Components/Footer"

const Stack = createStackNavigator()

const LoadingScreen = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#FFF5F8",
    }}
  >
    <ActivityIndicator size="large" color="#FF6B9D" />
    <Text style={{ marginTop: 16, fontSize: 16, color: "#7F8C8D" }}>Loading...</Text>
  </View>
)

const ScreenWrapper = ({ component: Component, showFooter = false, ...props }) => {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <Component {...props} />
      </View>
      {showFooter && <Footer />}
    </View>
  )
}
const WalletWrapper = (props) => <ScreenWrapper component={WalletScreen} showFooter={false} {...props} />

const BuyGiftCardWrapper = (props) => <ScreenWrapper component={BuyGiftCardScreen} showFooter={false} {...props} />

const ClaimGiftCardWrapper = (props) => <ScreenWrapper component={ClaimGiftCardScreen} showFooter={false} {...props} />

const DashboardWithFooter = (props) => <ScreenWrapper component={Dashboard} showFooter={true} {...props} />

const ServicesWithFooter = (props) => <ScreenWrapper component={ServicesPage} showFooter={true} {...props} />

const PlayWithFooter = (props) => <ScreenWrapper component={PlayScreen} showFooter={true} {...props} />

const OffersWithFooter = (props) => <ScreenWrapper component={OffersScreen} showFooter={true} {...props} />

const ProductWithFooter = (props) => <ScreenWrapper component={Product} showFooter={true} {...props} />

const ProfileWithFooter = (props) => <ScreenWrapper component={ProfilePage} showFooter={true} {...props} />

const WishlistWrapper = (props) => <ScreenWrapper component={WishlistScreen} showFooter={false} {...props} />

const SavedAddressesWrapper = (props) => (
  <ScreenWrapper component={SavedAddressesScreen} showFooter={false} {...props} />
)

const MyOrdersWrapper = (props) => <ScreenWrapper component={MyOrdersScreen} showFooter={false} {...props} />

const TrackServiceScreenWrapper = (props) => (
  <ScreenWrapper component={TrackServiceScreen} showFooter={false} {...props} />
)

const ProductsOrderWrapper = (props) => <ScreenWrapper component={ProductsOrderScreen} showFooter={false} {...props} />

const ServicesOrderWrapper = (props) => <ScreenWrapper component={ServicesOrderScreen} showFooter={false} {...props} />

const MyBookingsWrapper = (props) => <ScreenWrapper component={MyBookingsScreen} showFooter={false} {...props} />

const BookingDetailsWrapper = (props) => (
  <ScreenWrapper component={BookingDetailsScreen} showFooter={false} {...props} />
)

const HelpCenterWrapper = (props) => <ScreenWrapper component={HelpCenterScreen} showFooter={false} {...props} />

const ChatWrapper = (props) => <ScreenWrapper component={ChatScreen} showFooter={false} {...props} />

const AboutUsWrapper = (props) => <ScreenWrapper component={AboutUsScreen} showFooter={false} {...props} />

const DeleteAccountWrapper = (props) => <ScreenWrapper component={DeleteAccountScreen} showFooter={false} {...props} />

const ServiceDetailsWrapper = (props) => <ScreenWrapper component={ServiceDetails} showFooter={false} {...props} />

const CategoryServicesWrapper = (props) => <ScreenWrapper component={CategoryServices} showFooter={false} {...props} />

const ViewCartWrapper = (props) => <ScreenWrapper component={ViewCartScreen} showFooter={false} {...props} />

// const CheckoutWrapper = (props) => <ScreenWrapper component={CheckoutScreen} showFooter={false} {...props} />

const CheckoutServiceWrapper = (props) => <ScreenWrapper component={CheckoutService} showFooter={false} {...props} />
const CheckoutProductWrapper = (props) => <ScreenWrapper component={CheckoutProduct} showFooter={false} {...props} />


const ProductCartWrapper = (props) => <ScreenWrapper component={ProductCartScreen} showFooter={false} {...props} />

const ProductDetailsWrapper = (props) => <ScreenWrapper component={ProductDetails} showFooter={false} {...props} />

const PaymentGatewayWrapper = (props) => (
  <ScreenWrapper component={PaymentGatewayScreen} showFooter={false} {...props} />
)

const OrderConfirmationWrapper = (props) => (
  <ScreenWrapper component={OrderConfirmationScreen} showFooter={true} {...props} />
)

const TrackOrderWrapper = (props) => <ScreenWrapper component={TrackOrderScreen} showFooter={true} {...props} />

const ReviewableItemsScreenWrapper = (props) => (
  <ScreenWrapper component={ReviewableItemsScreen} showFooter={true} {...props} />
)

const WriteReviewScreenWrapper = (props) => <ScreenWrapper component={WriteReviewScreen} showFooter={true} {...props} />

const SalonsScreenWrapper = (props) => <ScreenWrapper component={SalonsScreen} showFooter={true} {...props} />  
const SalonDetailScreenWrapper = (props) => <ScreenWrapper component={SalonDetailScreen} showFooter={true} {...props} />
const BookAppointmentModalWrapper = (props) => <ScreenWrapper component={BookAppointmentModal} showFooter={true} {...props} />

const ReviewsScreenWrapper = (props) => <ScreenWrapper component={ReviewsScreen} showFooter={true} {...props} />

const ProfessionalReviewsScreenWrapper = (props) => (
  <ScreenWrapper component={ProfessionalReviewsScreen} showFooter={true} {...props} />
)

const RequestRideWrapper = (props) => {
  console.log('RequestRideWrapper props:', props);
  return <ScreenWrapper component={RequestRideScreen} showFooter={false} {...props} />;
};

const UserLiveTrackingScreenWrapper = (props) => {
  console.log('UserLiveTrackingScreenWrapper props:', props);
  console.log('UserLiveTrackingScreenWrapper route.params:', props.route?.params);
  return <ScreenWrapper component={UserLiveTrackingScreen} showFooter={false} {...props} />;
};

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: "#FFF5F8" },
    }}
  >
    <Stack.Screen name="Landing" component={LandingPage} />
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="SignUp" component={SignUp} />
    <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
  </Stack.Navigator>
)

const AppStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: "#FFF5F8" },
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
  name="Wallet"
  component={WalletWrapper}
  options={{
    headerShown: false,
    presentation: "card",
  }}
/>
<Stack.Screen
name="BuyGiftCard"
component={BuyGiftCardWrapper}
options={{
  headerShown: false,
  presentation: "card",
}}
/>
<Stack.Screen
name="ClaimGiftCard"
component={ClaimGiftCardWrapper}
options={{
  headerShown: false,
  presentation: "card",
}}
/>
<Stack.Screen 
  name="DebtPaymentScreen" 
  component={DebtPaymentScreen}
  options={{ title: 'Outstanding Debt' }}
/>

    <Stack.Screen
      name="Wishlist"
      component={WishlistWrapper}
      options={{
        headerShown: false,
        presentation: "modal",
      }}
    />
    <Stack.Screen
      name="SavedAddresses"
      component={SavedAddressesWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="MyOrders"
      component={MyOrdersWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="ProductsOrder"
      component={ProductsOrderWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="ServicesOrder"
      component={ServicesOrderWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="TrackServiceScreen"
      component={TrackServiceScreenWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="MyBookings"
      component={MyBookingsWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="BookingDetails"
      component={BookingDetailsWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="HelpCenter"
      component={HelpCenterWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="ChatScreen"
      component={ChatWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="AboutUs"
      component={AboutUsWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="DeleteAccount"
      component={DeleteAccountWrapper}
      options={{
        headerShown: false,
        presentation: "card",
        gestureEnabled: true,
      }}
    />

    {/* Service Booking System screens */}
    <Stack.Screen
      name="ServiceDetails"
      component={ServiceDetailsWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="CategoryServices"
      component={CategoryServicesWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="ViewCart"
      component={ViewCartWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    {/* <Stack.Screen
      name="Checkout"
      component={CheckoutWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    /> */}

        <Stack.Screen
      name="CheckoutService"
      component={CheckoutServiceWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
        <Stack.Screen
      name="CheckoutProduct"
      component={CheckoutProductWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    {/* Product System screens */}
    <Stack.Screen
      name="ProductCart"
      component={ProductCartWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="ProductDetails"
      component={ProductDetailsWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    {/* New Order Flow screens */}
    <Stack.Screen
      name="OrderConfirmation"
      component={OrderConfirmationWrapper}
      options={{
        headerShown: false,
        presentation: "card",
        gestureEnabled: false,
      }}
    />

    <Stack.Screen
      name="TrackOrder"
      component={TrackOrderWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen
      name="ReviewableItemsScreen"
      component={ReviewableItemsScreenWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="ReviewsScreen"
      component={ReviewsScreenWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="WriteReviewScreen"
      component={WriteReviewScreenWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />
    <Stack.Screen
      name="PaymentGateway"
      component={PaymentGatewayWrapper}
      options={{
        headerShown: false,
        presentation: "card",
        gestureEnabled: false,
      }}
    />

    <Stack.Screen
      name="ProfessionalReviewsScreen"
      component={ProfessionalReviewsScreenWrapper}
      options={{
        headerShown: false,
        presentation: "card",
      }}
    />

    <Stack.Screen 
      name="RequestRide" 
      component={RequestRideWrapper}
      options={{ title: 'Request Ride' }}
    />

        <Stack.Screen 
  name="UserLiveTrackingScreen" 
  component={UserLiveTrackingScreenWrapper}
  options={{ title: 'Live tracking' }}
/>

<Stack.Screen
  name="Salons"
  component={SalonsScreenWrapper}
  options={{ title: 'Salons' }} 
/>

{/* <Stack.Screen
  name="SalonDetail"
  component={SalonDetailScreenWrapper}
  options={{ title: 'Salon Detail' }} 
/> */}
<Stack.Screen
  name="SalonDetail"
  component={SalonDetailScreen}
  options={{ title: 'Salon Detail' }} 
/>
<Stack.Screen
  name="BookAppointmentModal"
  component={BookAppointmentModalWrapper}
  options={{ title: 'Book Appointment' }} 
/>

<Stack.Screen
  name="UserBookingsScreen"
  component={UserBookingsScreen}
  options={{ title: 'Appointments' }} 
/>
  </Stack.Navigator>
)

const AppNavigation = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#FF6B9D" />
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </CartProvider>
  )
}

// Main App Application
const App = () => {
  return (
    <AuthProvider>
      <AppNavigation />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FFF5F8",
  },
  contentContainer: {
    flex: 1,
  },
})

export default App
