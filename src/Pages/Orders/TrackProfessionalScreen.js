// // src/Pages/Orders/TrackProfessionalScreen.js
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   Linking,
//   Dimensions,
// } from 'react-native';
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { useAuth } from '../../contexts/AuthContext';
// import { API_URL } from '../../API/config';
// import Header from '../../Components/Header';

// const { width, height } = Dimensions.get('window');
// const ASPECT_RATIO = width / height;
// const LATITUDE_DELTA = 0.0922;
// const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// const TrackProfessionalScreen = ({ route, navigation }) => {
//   const { orderId } = route.params;
//   const { user, tokens } = useAuth();
//   const mapRef = useRef(null);
  
//   const [loading, setLoading] = useState(true);
//   const [tracking, setTracking] = useState(null);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState(null);

//   const getAuthHeaders = () => {
//     const token = tokens?.accessToken || user?.token;
//     return {
//       'Content-Type': 'application/json',
//       'Authorization': token ? `Bearer ${token}` : ''
//     };
//   };

//   useEffect(() => {
//     fetchTrackingData();
    
//     // Refresh location every 10 seconds
//     const interval = setInterval(() => {
//       fetchTrackingData(true);
//     }, 10000);

//     return () => clearInterval(interval);
//   }, [orderId]);

//   const fetchTrackingData = async (silent = false) => {
//     try {
//       if (!silent) setLoading(true);
//       setRefreshing(!silent);

//       const response = await fetch(`${API_URL}/location/order/${orderId}`, {
//         headers: getAuthHeaders(),
//       });

//       const data = await response.json();

//       if (data.success) {
//         setTracking(data.data);
//         setError(null);
        
//         // Fit map to show both locations
//         if (mapRef.current && data.data) {
//           setTimeout(() => {
//             fitMapToMarkers(data.data);
//           }, 500);
//         }
//       } else {
//         setError(data.message || 'No tracking data available');
//       }
//     } catch (err) {
//       console.error('Fetch tracking error:', err);
//       setError('Failed to load tracking information');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const fitMapToMarkers = (trackingData) => {
//     if (!trackingData || !mapRef.current) return;

//     const coordinates = [
//       {
//         latitude: trackingData.currentLocation.latitude,
//         longitude: trackingData.currentLocation.longitude,
//       },
//       {
//         latitude: trackingData.customerAddress.latitude,
//         longitude: trackingData.customerAddress.longitude,
//       },
//     ];

//     mapRef.current.fitToCoordinates(coordinates, {
//       edgePadding: {
//         top: 100,
//         right: 50,
//         bottom: 300,
//         left: 50,
//       },
//       animated: true,
//     });
//   };

//   const handleCallProfessional = () => {
//     if (tracking?.professional?.phone) {
//       const phoneNumber = `tel:${tracking.professional.phone}`;
//       Linking.openURL(phoneNumber);
//     } else {
//       Alert.alert('Error', 'Phone number not available');
//     }
//   };

//   const formatDistance = (meters) => {
//     if (meters < 1000) {
//       return `${Math.round(meters)} m`;
//     }
//     return `${(meters / 1000).toFixed(1)} km`;
//   };

//   const formatTime = (minutes) => {
//     if (minutes < 60) {
//       return `${minutes} mins`;
//     }
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return `${hours}h ${mins}m`;
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Header />
//         <View style={styles.header}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigation.goBack()}
//           >
//             <Icon name="arrow-back" size={24} color="#2C3E50" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Track Professional</Text>
//           <View style={{ width: 40 }} />
//         </View>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#FF6B9D" />
//           <Text style={styles.loadingText}>Loading tracking information...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Header />
//         <View style={styles.header}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigation.goBack()}
//           >
//             <Icon name="arrow-back" size={24} color="#2C3E50" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Track Professional</Text>
//           <View style={{ width: 40 }} />
//         </View>
//         <View style={styles.errorContainer}>
//           <Icon name="location-outline" size={80} color="#CCC" />
//           <Text style={styles.errorTitle}>Tracking Not Available</Text>
//           <Text style={styles.errorText}>{error}</Text>
//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={() => fetchTrackingData()}
//           >
//             <Icon name="refresh" size={20} color="#FFF" />
//             <Text style={styles.retryButtonText}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <Header />
      
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Icon name="arrow-back" size={24} color="#2C3E50" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Track Professional</Text>
//         <TouchableOpacity
//           style={styles.refreshButton}
//           onPress={() => fetchTrackingData()}
//         >
//           <Icon name="refresh" size={24} color="#FF6B9D" />
//         </TouchableOpacity>
//       </View>

//       {tracking && (
//         <View style={styles.mapContainer}>
//           <MapView
//             ref={mapRef}
//             provider={PROVIDER_GOOGLE}
//             style={styles.map}
//             initialRegion={{
//               latitude: tracking.currentLocation.latitude,
//               longitude: tracking.currentLocation.longitude,
//               latitudeDelta: LATITUDE_DELTA,
//               longitudeDelta: LONGITUDE_DELTA,
//             }}
//           >
//             {/* Professional's Current Location */}
//             <Marker
//               coordinate={{
//                 latitude: tracking.currentLocation.latitude,
//                 longitude: tracking.currentLocation.longitude,
//               }}
//               title={tracking.professional.name}
//               description="Professional's Location"
//             >
//               <View style={styles.professionalMarker}>
//                 <Icon name="person" size={24} color="#FFF" />
//               </View>
//             </Marker>

//             {/* Customer's Address */}
//             <Marker
//               coordinate={{
//                 latitude: tracking.customerAddress.latitude,
//                 longitude: tracking.customerAddress.longitude,
//               }}
//               title="Your Location"
//               description={tracking.customerAddress.fullAddress}
//             >
//               <View style={styles.customerMarker}>
//                 <Icon name="home" size={24} color="#FFF" />
//               </View>
//             </Marker>

//             {/* Route Line */}
//             <Polyline
//               coordinates={[
//                 {
//                   latitude: tracking.currentLocation.latitude,
//                   longitude: tracking.currentLocation.longitude,
//                 },
//                 {
//                   latitude: tracking.customerAddress.latitude,
//                   longitude: tracking.customerAddress.longitude,
//                 },
//               ]}
//               strokeColor="#FF6B9D"
//               strokeWidth={3}
//               lineDashPattern={[10, 5]}
//             />
//           </MapView>

//           {/* Live Indicator */}
//           <View style={styles.liveIndicator}>
//             <View style={styles.liveDot} />
//             <Text style={styles.liveText}>LIVE</Text>
//           </View>
//         </View>
//       )}

//       {tracking && (
//         <View style={styles.infoContainer}>
//           {/* Professional Info Card */}
//           <View style={styles.professionalCard}>
//             <View style={styles.professionalHeader}>
//               <View style={styles.professionalAvatar}>
//                 <Icon name="person" size={32} color="#FF6B9D" />
//               </View>
//               <View style={styles.professionalInfo}>
//                 <Text style={styles.professionalName}>
//                   {tracking.professional.name}
//                 </Text>
//                 <View style={styles.statusRow}>
//                   <Icon name="car" size={14} color="#4CAF50" />
//                   <Text style={styles.statusText}>On the way</Text>
//                 </View>
//               </View>
//               <TouchableOpacity
//                 style={styles.callButton}
//                 onPress={handleCallProfessional}
//               >
//                 <Icon name="call" size={24} color="#FFF" />
//               </TouchableOpacity>
//             </View>

//             {/* Distance & Time Info */}
//             <View style={styles.statsContainer}>
//               <View style={styles.statBox}>
//                 <Icon name="navigate" size={20} color="#FF6B9D" />
//                 <Text style={styles.statValue}>
//                   {formatDistance(tracking.estimatedDistance)}
//                 </Text>
//                 <Text style={styles.statLabel}>Distance</Text>
//               </View>
//               <View style={styles.statDivider} />
//               <View style={styles.statBox}>
//                 <Icon name="time" size={20} color="#FF6B9D" />
//                 <Text style={styles.statValue}>
//                   {formatTime(tracking.estimatedTime)}
//                 </Text>
//                 <Text style={styles.statLabel}>ETA</Text>
//               </View>
//             </View>
//           </View>

//           {/* Address Card */}
//           <View style={styles.addressCard}>
//             <View style={styles.addressHeader}>
//               <Icon name="location" size={20} color="#FF6B9D" />
//               <Text style={styles.addressTitle}>Service Location</Text>
//             </View>
//             <Text style={styles.addressText}>
//               {tracking.customerAddress.fullAddress}
//             </Text>
//           </View>

//           {/* Last Updated */}
//           <View style={styles.updateInfo}>
//             <Icon name="sync" size={14} color="#999" />
//             <Text style={styles.updateText}>
//               Last updated: {new Date(tracking.lastUpdated).toLocaleTimeString('en-IN', {
//                 hour: '2-digit',
//                 minute: '2-digit'
//               })}
//             </Text>
//           </View>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#F8F8F8',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2C3E50',
//   },
//   refreshButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 14,
//     color: '#7F8C8D',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   errorTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2C3E50',
//     marginTop: 20,
//     marginBottom: 8,
//   },
//   errorText: {
//     fontSize: 14,
//     color: '#7F8C8D',
//     textAlign: 'center',
//     lineHeight: 20,
//     marginBottom: 24,
//   },
//   retryButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: '#FF6B9D',
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 10,
//   },
//   retryButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFF',
//   },
//   mapContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   map: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   professionalMarker: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: '#FF6B9D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#FFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   customerMarker: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: '#4CAF50',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#FFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   liveIndicator: {
//     position: 'absolute',
//     top: 20,
//     right: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: '#FFF',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   liveDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#FF0000',
//   },
//   liveText: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#FF0000',
//   },
//   infoContainer: {
//     backgroundColor: '#F5F5F5',
//     paddingHorizontal: 20,
//     paddingTop: 16,
//     paddingBottom: 20,
//   },
//   professionalCard: {
//     backgroundColor: '#FFF',
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   professionalHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   professionalAvatar: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     backgroundColor: '#FFE8F0',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   professionalInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   professionalName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2C3E50',
//     marginBottom: 4,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   statusText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   callButton: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#4CAF50',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFF9FB',
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#FFE8F0',
//   },
//   statBox: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   statValue: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2C3E50',
//     marginTop: 8,
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#7F8C8D',
//   },
//   statDivider: {
//     width: 1,
//     height: 40,
//     backgroundColor: '#FFD1E3',
//   },
//   addressCard: {
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   addressHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 8,
//   },
//   addressTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2C3E50',
//   },
//   addressText: {
//     fontSize: 14,
//     color: '#7F8C8D',
//     lineHeight: 20,
//   },
//   updateInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//   },
//   updateText: {
//     fontSize: 12,
//     color: '#999',
//   },
// });

// export default TrackProfessionalScreen;