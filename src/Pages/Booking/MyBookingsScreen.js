"use client"

// src/Pages/Booking/MyBookingsScreen.js
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
} from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { API_URL } from "../../API/config"
import Header from "../../Components/Header"
import { useAuth } from "../../contexts/AuthContext"

const MyBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([])
  const { tokens } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const statusTabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ]

  useEffect(() => {
    fetchBookings()
  }, [selectedStatus])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      console.log("📱 Fetching bookings...")
      console.log("🔑 Token exists:", !!tokens.accessToken)
      console.log("📍 API URL:", API_URL)
      let url = `${API_URL}/bookings/my-bookings`
      if (selectedStatus && selectedStatus !== "all") {
        url += `?status=${selectedStatus}`
      }

      console.log("🌐 Request URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      console.log("📡 Response status:", response.status)

      const data = await response.json()
      console.log("📦 Response data:", JSON.stringify(data, null, 2))
      if (data.success) {
        const allBookings = data.data || []
        console.log("✅ Total bookings received:", allBookings.length)
        const serviceBookings = allBookings.filter((booking) => booking.services && booking.services.length > 0)

        console.log("✂️ Service bookings:", serviceBookings.length)
        setBookings(serviceBookings)
      } else {
        console.error("❌ API returned error:", data.message)
        Alert.alert("Error", data.message || "Failed to fetch bookings")
      }
    } catch (error) {
      console.error("❌ Fetch bookings error:", error)
      console.error("Error details:", error.message)
      Alert.alert("Error", "Something went wrong while fetching bookings. Please check your connection.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBookings()
  }

  const handleCancelBooking = (bookingId) => {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            })
            const data = await response.json()
            if (data.success) {
              Alert.alert("Success", "Booking cancelled successfully")
              fetchBookings()
            } else {
              Alert.alert("Error", data.message || "Failed to cancel booking")
            }
          } catch (error) {
            console.error("Cancel booking error:", error)
            Alert.alert("Error", "Something went wrong")
          }
        },
      },
    ])
  }

  const getStatusColor = (status) => {
    const statusColors = {
      pending: "#F39C12",
      confirmed: "#27AE60",
      rejected: "#E74C3C",
      completed: "#8E44AD",
      cancelled: "#95A5A6",
    }
    return statusColors[status] || "#7F8C8D"
  }

  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: "time-outline",
      confirmed: "checkmark-circle-outline",
      rejected: "close-circle-outline",
      completed: "checkmark-done-circle-outline",
      cancelled: "ban-outline",
    }
    return statusIcons[status] || "help-circle-outline"
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeString) => {
    return timeString || "Not specified"
  }

  const renderBookingCard = (booking) => (
    <View key={booking._id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingId}>#{booking._id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Icon name={getStatusIcon(booking.status)} size={12} color="#fff" />
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>
      {/* Services Info */}
      <View style={styles.servicesInfo}>
        <Text style={styles.servicesTitle}>Services Booked:</Text>
        {booking.services.map((serviceItem, index) => (
          <View key={index} style={styles.serviceItem}>
            <Image
              source={{
                uri: serviceItem.service?.image_url || "https://via.placeholder.com/50x50",
              }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{serviceItem.service?.name || "Service"}</Text>
              <View style={styles.serviceSchedule}>
                <Icon name="calendar-outline" size={14} color="#7F8C8D" />
                <Text style={styles.serviceDate}>
                  {formatDate(serviceItem.selectedDate)} at {formatTime(serviceItem.selectedTime)}
                </Text>
              </View>
              <Text style={styles.serviceQuantity}>Quantity: {serviceItem.quantity}</Text>
              {serviceItem.notes && <Text style={styles.serviceNotes}>Note: {serviceItem.notes}</Text>}
            </View>
            <Text style={styles.servicePrice}>₹{serviceItem.price}</Text>
          </View>
        ))}
      </View>
      {/* Customer Info */}
      {booking.customerInfo && (
        <View style={styles.customerInfo}>
          <Text style={styles.customerInfoTitle}>Contact Details:</Text>
          <Text style={styles.customerDetail}>
            <Icon name="person-outline" size={14} color="#7F8C8D" /> {booking.customerInfo.name}
          </Text>
          <Text style={styles.customerDetail}>
            <Icon name="call-outline" size={14} color="#7F8C8D" /> {booking.customerInfo.phone}
          </Text>
          {booking.customerInfo.address && (
            <Text style={styles.customerDetail}>
              <Icon name="location-outline" size={14} color="#7F8C8D" /> {booking.customerInfo.address}
            </Text>
          )}
        </View>
      )}
      <View style={styles.bookingFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{booking.totalAmount}</Text>
        </View>
        <Text style={styles.bookingDate}>Booked on {formatDate(booking.createdAt)}</Text>
      </View>

      {/* Rejection Reason */}
      {booking.status === "rejected" && booking.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Icon name="information-circle" size={16} color="#E74C3C" />
          <Text style={styles.rejectionReason}>{booking.rejectionReason}</Text>
        </View>
      )}

      {/* Admin Notes */}
      {booking.adminNotes && (
        <View style={styles.adminNotesContainer}>
          <Icon name="document-text-outline" size={16} color="#54A0FF" />
          <Text style={styles.adminNotes}>{booking.adminNotes}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => navigation.navigate("BookingDetails", { bookingId: booking._id })}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>

        {(booking.status === "confirmed" || booking.status === "out_for_delivery") && booking.professionalId && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              const destination = booking.customerInfo?.address
                ? booking.customerInfo.address.split(",")[0]
                : "Destination"
              navigation.navigate("UserTracking", {
                driverId: booking.professionalId,
                orderNumber: booking._id.slice(-8).toUpperCase(),
                destinationLat: booking.customerInfo?.latitude || 28.7041,
                destinationLng: booking.customerInfo?.longitude || 77.1025,
              })
            }}
          >
            <Icon name="locate" size={16} color="#FFF" />
            <Text style={styles.trackButtonText}>Track Live</Text>
          </TouchableOpacity>
        )}

        {(booking.status === "pending" || booking.status === "confirmed") && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(booking._id)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {booking.status === "completed" && (
          <>
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => {
                const orderData = {
                  _id: booking._id,
                  serviceItems: booking.services.map((s) => ({
                    serviceId: s.service._id,
                    quantity: s.quantity,
                    price: s.price,
                  })),
                }
                navigation.navigate("ReviewableItems", {
                  orderId: booking._id,
                  isBooking: true,
                })
              }}
            >
              <Icon name="star-outline" size={16} color="#FFD700" />
              <Text style={styles.rateButtonText}>Rate Services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rebookButton}
              onPress={() =>
                navigation.navigate("Services", {
                  serviceId: booking.services[0]?.service?._id,
                })
              }
            >
              <Icon name="repeat-outline" size={16} color="#FF6B9D" />
              <Text style={styles.rebookButtonText}>Book Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )

  const renderEmptyBookings = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-outline" size={80} color="#FF6B9D" />
      <Text style={styles.emptyTitle}>No Service Bookings Yet</Text>
      <Text style={styles.emptySubtitle}>You haven't booked any services yet. Explore our amazing services!</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate("MainTabs", { screen: "Services" })}
      >
        <Text style={styles.browseButtonText}>Browse Services</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
          <Icon name="notifications-outline" size={24} color="#FF6B9D" />
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedStatus === tab.key && styles.activeTab]}
              onPress={() => setSelectedStatus(tab.key)}
            >
              <Text style={[styles.tabText, selectedStatus === tab.key && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        renderEmptyBookings()
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {bookings.map(renderBookingCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  tabsContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B9D",
  },
  tabText: {
    fontSize: 16,
    color: "#7F8C8D",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FF6B9D",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7F8C8D",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: "#FF6B9D",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  servicesInfo: {
    marginBottom: 15,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 10,
  },
  serviceItem: {
    backgroundColor: "#FFF5F8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  serviceImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 6,
  },
  serviceSchedule: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: "#7F8C8D",
    marginLeft: 4,
  },
  serviceQuantity: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 4,
  },
  serviceNotes: {
    fontSize: 12,
    color: "#54A0FF",
    fontStyle: "italic",
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B9D",
    alignSelf: "flex-start",
  },
  customerInfo: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  customerInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  customerDetail: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  bookingFooter: {
    marginBottom: 15,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B9D",
  },
  bookingDate: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  rejectionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  rejectionReason: {
    flex: 1,
    fontSize: 14,
    color: "#E74C3C",
    lineHeight: 18,
  },
  adminNotesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  adminNotes: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: "#FFF5F8",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B9D",
  },
  detailsButtonText: {
    color: "#FF6B9D",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#E74C3C",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rebookButton: {
    backgroundColor: "#FF6B9D15",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B9D",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rebookButtonText: {
    color: "#FF6B9D",
    fontSize: 14,
    fontWeight: "600",
  },
  rateButton: {
    backgroundColor: "#FFD70015",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  rateButtonText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  trackButton: {
    backgroundColor: "#2ECC71",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  trackButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
})

export default MyBookingsScreen
