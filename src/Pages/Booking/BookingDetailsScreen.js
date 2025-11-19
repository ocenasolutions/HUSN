
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { API_URL } from "../../API/config"
import Header from "../../Components/Header"
import { useAuth } from "../../contexts/AuthContext"


const BookingDetailsScreen = ({ route, navigation }) => {
  const { bookingId } = route.params
  const { tokens } = useAuth()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookingDetails()
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setBooking(data.data)
      } else {
        Alert.alert("Error", data.message || "Failed to load booking details")
        navigation.goBack()
      }
    } catch (error) {
      console.error("Fetch booking details error:", error)
      Alert.alert("Error", "Failed to load booking details")
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = () => {
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
              navigation.goBack()
            } else {
              Alert.alert("Error", data.message || "Failed to cancel booking")
            }
          } catch (error) {
            console.error("Cancel booking error:", error)
            Alert.alert("Error", "Failed to cancel booking")
          }
        },
      },
    ])
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: "#F39C12",
      confirmed: "#27AE60",
      rejected: "#E74C3C",
      in_progress: "#3498DB",
      completed: "#8E44AD",
      cancelled: "#95A5A6",
    }
    return colors[status] || "#7F8C8D"
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: "time-outline",
      confirmed: "checkmark-circle-outline",
      rejected: "close-circle-outline",
      in_progress: "play-circle-outline",
      completed: "checkmark-done-circle-outline",
      cancelled: "ban-outline",
    }
    return icons[status] || "help-circle-outline"
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#E74C3C" />
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Icon name={getStatusIcon(booking.status)} size={14} color="#fff" />
              <Text style={styles.statusText}>{booking.status.toUpperCase().replace("_", " ")}</Text>
            </View>
          </View>

          {/* OTP Display - ONLY FOR CONFIRMED STATUS */}
          {booking.status === "confirmed" && booking.serviceOtp && (
            <View style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <Icon name="lock-closed" size={24} color="#FF6B9D" />
                <Text style={styles.otpTitle}>Your Service OTP</Text>
              </View>
              <Text style={styles.otpSubtitle}>Share this OTP with the service provider when they arrive</Text>
              <View style={styles.otpBox}>
                <Text style={styles.otpCode}>{booking.serviceOtp}</Text>
              </View>
              <View style={styles.otpInfo}>
                <Icon name="information-circle-outline" size={16} color="#7F8C8D" />
                <Text style={styles.otpInfoText}>
                  Valid for 24 hours • Generated: {formatDate(booking.otpGeneratedAt)}
                </Text>
              </View>
            </View>
          )}

          {/* Service In Progress Info */}
          {booking.status === "in_progress" && booking.otpVerifiedAt && (
            <View style={styles.progressCard}>
              <Icon name="checkmark-circle" size={24} color="#27AE60" />
              <Text style={styles.progressText}>
                Service started at{" "}
                {new Date(booking.serviceStartedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Services Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {booking.services.map((serviceItem, index) => (
            <View key={index} style={styles.serviceCard}>
              <Image
                source={{ uri: serviceItem.service?.image_url || "https://via.placeholder.com/60" }}
                style={styles.serviceImage}
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{serviceItem.service?.name || "Service"}</Text>
                <Text style={styles.serviceDetails}>
                  Quantity: {serviceItem.quantity} • Duration: {serviceItem.service?.duration || "N/A"} min
                </Text>
                <View style={styles.scheduleInfo}>
                  <Icon name="calendar-outline" size={14} color="#7F8C8D" />
                  <Text style={styles.scheduleText}>
                    {formatDate(serviceItem.selectedDate)} at {serviceItem.selectedTime}
                  </Text>
                </View>
                {serviceItem.notes && <Text style={styles.serviceNotes}>Note: {serviceItem.notes}</Text>}
              </View>
              <Text style={styles.servicePrice}>₹{serviceItem.price}</Text>
            </View>
          ))}
        </View>
        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="person-outline" size={20} color="#7F8C8D" />
              <Text style={styles.infoText}>{booking.customerInfo.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="call-outline" size={20} color="#7F8C8D" />
              <Text style={styles.infoText}>{booking.customerInfo.phone}</Text>
            </View>
            {booking.customerInfo.email && (
              <View style={styles.infoRow}>
                <Icon name="mail-outline" size={20} color="#7F8C8D" />
                <Text style={styles.infoText}>{booking.customerInfo.email}</Text>
              </View>
            )}
            {booking.customerInfo.address && (
              <View style={styles.infoRow}>
                <Icon name="location-outline" size={20} color="#7F8C8D" />
                <Text style={styles.infoText}>{booking.customerInfo.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service Type</Text>
              <Text style={styles.detailValue}>{booking.serviceType}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{booking.paymentMethod.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Status</Text>
              <Text
                style={[styles.detailValue, { color: booking.paymentStatus === "completed" ? "#27AE60" : "#F39C12" }]}
              >
                {booking.paymentStatus.toUpperCase()}
              </Text>
            </View>
            {booking.serviceStartTime && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled Time</Text>
                <Text style={styles.detailValue}>{booking.serviceStartTime}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.paymentCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{booking.totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* Booking Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Timeline</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <Icon name="checkmark-circle" size={20} color="#27AE60" />
              <Text style={styles.timelineText}>Booked on {formatDate(booking.createdAt)}</Text>
            </View>
            {booking.confirmedAt && (
              <View style={styles.timelineItem}>
                <Icon name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.timelineText}>Confirmed on {formatDate(booking.confirmedAt)}</Text>
              </View>
            )}
            {booking.serviceStartedAt && (
              <View style={styles.timelineItem}>
                <Icon name="play-circle" size={20} color="#3498DB" />
                <Text style={styles.timelineText}>Service started on {formatDate(booking.serviceStartedAt)}</Text>
              </View>
            )}
            {booking.completedAt && (
              <View style={styles.timelineItem}>
                <Icon name="checkmark-done-circle" size={20} color="#8E44AD" />
                <Text style={styles.timelineText}>Completed on {formatDate(booking.completedAt)}</Text>
              </View>
            )}
            {booking.cancelledAt && (
              <View style={styles.timelineItem}>
                <Icon name="close-circle" size={20} color="#E74C3C" />
                <Text style={styles.timelineText}>Cancelled on {formatDate(booking.cancelledAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {(booking.status === "confirmed" || booking.status === "in_progress") && booking.professionalId && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => {
                navigation.navigate("UserTracking", {
                  driverId: booking.professionalId,
                  orderNumber: booking.bookingNumber,
                  destinationLat: booking.customerInfo?.latitude || 28.7041,
                  destinationLng: booking.customerInfo?.longitude || 77.1025,
                })
              }}
            >
              <Icon name="navigate-circle" size={20} color="#fff" />
              <Text style={styles.trackLiveText}>Track Live</Text>
            </TouchableOpacity>
          )}

          {(booking.status === "pending" || booking.status === "confirmed") && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
              <Icon name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

          {booking.status === "completed" && booking.canReview && !booking.review && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigation.navigate("SubmitReview", { bookingId: booking._id })}
            >
              <Icon name="star-outline" size={20} color="#fff" />
              <Text style={styles.reviewButtonText}>Write Review</Text>
            </TouchableOpacity>
          )}

          {booking.status === "completed" && (
            <TouchableOpacity style={styles.rebookButton} onPress={() => navigation.navigate("Services")}>
              <Icon name="repeat-outline" size={20} color="#FF6B9D" />
              <Text style={styles.rebookButtonText}>Book Again</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#E74C3C",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  bookingNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  otpCard: {
    backgroundColor: "#FFF5F8",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FF6B9D",
    borderStyle: "dashed",
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B9D",
  },
  otpSubtitle: {
    fontSize: 13,
    color: "#7F8C8D",
    marginBottom: 15,
  },
  otpBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FF6B9D",
  },
  otpCode: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FF6B9D",
    letterSpacing: 8,
    fontFamily: "monospace",
  },
  otpInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  otpInfoText: {
    fontSize: 11,
    color: "#7F8C8D",
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8F5",
    padding: 15,
    borderRadius: 10,
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: "#27AE60",
    fontWeight: "600",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  serviceDetails: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 6,
  },
  scheduleInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: "#7F8C8D",
    marginLeft: 4,
  },
  serviceNotes: {
    fontSize: 11,
    color: "#54A0FF",
    fontStyle: "italic",
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B9D",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#2C3E50",
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B9D",
  },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  timelineText: {
    fontSize: 14,
    color: "#2C3E50",
  },
  actionSection: {
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#E74C3C",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewButton: {
    flexDirection: "row",
    backgroundColor: "#F39C12",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rebookButton: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#FF6B9D",
  },
  rebookButtonText: {
    color: "#FF6B9D",
    fontSize: 16,
    fontWeight: "600",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2ECC71",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  trackLiveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
})

export default BookingDetailsScreen
