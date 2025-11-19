"use client"

// src/Pages/User/UserTrackingScreen.js
import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Animated, Platform } from "react-native"
import * as Location from "expo-location"
import MapView, { Marker, Polyline } from "react-native-maps"
import Icon from "react-native-vector-icons/Ionicons"
import { useAuth } from "../../contexts/AuthContext"
import { useTrackDriver } from "../../hooks/useTrackDriver"

const UserTrackingScreen = ({ route, navigation }) => {
  const { driverId, orderNumber, destinationLat, destinationLng } = route.params
  const { user } = useAuth()

  const [userLocation, setUserLocation] = useState(null)
  const mapRef = useRef(null)
  const markerAnimationRef = useRef(new Animated.Value(0)).current

  // Use custom hook for tracking driver
  const { driverLocation, isConnected, rideStatus, error } = useTrackDriver(user._id, driverId, true)

  useEffect(() => {
    // Get user's current location
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required")
          return
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
      } catch (err) {
        console.error("Error getting user location:", err)
      }
    }

    getUserLocation()
  }, [])

  // Animate marker when driver location changes
  useEffect(() => {
    if (driverLocation) {
      Animated.spring(markerAnimationRef, {
        toValue: 1,
        useNativeDriver: false,
        speed: 8,
      }).start(() => {
        markerAnimationRef.setValue(0)
      })

      // Auto-focus map to show both markers
      if (mapRef.current && userLocation) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: driverLocation.lat, longitude: driverLocation.lng },
            { latitude: destinationLat, longitude: destinationLng },
          ],
          { padding: 100, animated: true },
        )
      }
    }
  }, [driverLocation])

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (value) => (value * Math.PI) / 180

  const distance = driverLocation
    ? calculateDistance(driverLocation.lat, driverLocation.lng, destinationLat, destinationLng)
    : null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Track Professional</Text>
        <View style={{ width: 40 }} />
      </View>

      {userLocation && driverLocation ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Your location */}
          <Marker coordinate={userLocation} title="Your Location" pinColor="#FF6B9D">
            <View style={styles.userMarker}>
              <Icon name="person" size={20} color="#FFF" />
            </View>
          </Marker>

          {/* Driver location with animation */}
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Professional"
            rotation={driverLocation.heading || 0}
          >
            <Animated.View
              style={[
                styles.driverMarker,
                {
                  transform: [
                    {
                      scale: markerAnimationRef.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon name="car" size={24} color="#FFF" />
            </Animated.View>
          </Marker>

          {/* Destination */}
          <Marker coordinate={{ latitude: destinationLat, longitude: destinationLng }} title="Destination">
            <View style={styles.destinationMarker}>
              <Icon name="location" size={20} color="#FFF" />
            </View>
          </Marker>

          {/* Route line */}
          {driverLocation && (
            <Polyline
              coordinates={[
                { latitude: driverLocation.lat, longitude: driverLocation.lng },
                { latitude: destinationLat, longitude: destinationLng },
              ]}
              strokeColor="#FF6B9D"
              strokeWidth={3}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <View style={styles.statusPanel}>
        <View style={styles.statusHeader}>
          <Icon
            name={isConnected ? "radio-button-on" : "radio-button-off"}
            size={20}
            color={isConnected ? "#2ECC71" : "#E74C3C"}
          />
          <Text style={styles.statusTitle}>
            {rideStatus === "tracking"
              ? "Professional In Transit"
              : rideStatus === "ended"
                ? "Ride Completed"
                : "Connection Lost"}
          </Text>
        </View>

        {driverLocation && distance !== null && (
          <View style={styles.infoPanel}>
            <View style={styles.infoItem}>
              <Icon name="navigate" size={18} color="#FF6B9D" />
              <Text style={styles.infoText}>
                {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(2)}km away`}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="speedometer" size={18} color="#3498DB" />
              <Text style={styles.infoText}>{Math.round(driverLocation.speed || 0)} km/h</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorPanel}>
            <Icon name="alert-circle" size={18} color="#E74C3C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FF6B9D",
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 20 : 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5" },
  loadingText: { fontSize: 16, color: "#7F8C8D" },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF6B9D",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  driverMarker: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#2ECC71",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3498DB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  statusPanel: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  statusTitle: { fontSize: 15, fontWeight: "600", color: "#2C3E50" },
  infoPanel: { flexDirection: "row", gap: 20, marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: "#7F8C8D", fontWeight: "500" },
  errorPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 10,
  },
  errorText: { fontSize: 12, color: "#E74C3C", flex: 1 },
})

export default UserTrackingScreen
