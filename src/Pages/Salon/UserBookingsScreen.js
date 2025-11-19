import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const UserBookingsScreen = ({ navigation }) => {
  const { tokens, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, past
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/salon-bookings/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        const allBookings = result.data || [];
        
        // Filter based on active tab
        const now = new Date();
        const filtered = allBookings.filter(booking => {
          const bookingDate = new Date(booking.bookingDate);
          
          if (activeTab === 'upcoming') {
            return bookingDate >= now && 
                   (booking.status === 'pending' || booking.status === 'confirmed');
          } else {
            return bookingDate < now || 
                   booking.status === 'completed' || 
                   booking.status === 'cancelled';
          }
        });

        setBookings(filtered);
      } else {
        Alert.alert('Error', result.message || 'Failed to load bookings');
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/salon-bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${tokens?.accessToken}`,
                },
              });

              const result = await response.json();

              if (result.success) {
                Alert.alert('Success', 'Booking cancelled successfully');
                setShowDetailModal(false);
                fetchBookings();
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Cancel booking error:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const handleReschedule = (booking) => {
    setShowDetailModal(false);
    // Navigate to booking screen with salon details for rescheduling
    navigation.navigate('BookingScreen', {
      salonId: booking.salon._id,
      rescheduleBookingId: booking._id,
    });
  };

  const handleAddReview = (booking) => {
    setShowDetailModal(false);
    // Navigate to review screen
    navigation.navigate('AddReview', {
      salonId: booking.salon._id,
      bookingId: booking._id,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#E74C3C';
      case 'completed': return '#3B82F6';
      default: return '#7F8C8D';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'checkmark-done-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isUpcoming = (booking) => {
    const bookingDate = new Date(booking.bookingDate);
    return bookingDate >= new Date() && 
           (booking.status === 'pending' || booking.status === 'confirmed');
  };

  const renderBookingCard = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        setSelectedBooking(item);
        setShowDetailModal(true);
      }}
      activeOpacity={0.8}
    >
      {/* Salon Cover Image */}
      <Image
        source={{ uri: item.salon?.coverPhoto }}
        style={styles.salonImage}
        resizeMode="cover"
      />

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Icon name={getStatusIcon(item.status)} size={14} color="#fff" />
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
      </View>

      <View style={styles.cardContent}>
        {/* Salon Name */}
        <Text style={styles.salonName} numberOfLines={1}>
          {item.salon?.name}
        </Text>

        {/* Date & Time */}
        <View style={styles.infoRow}>
          <Icon name="calendar-outline" size={16} color="#FF6B9D" />
          <Text style={styles.infoText}>{formatDate(item.bookingDate)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="time-outline" size={16} color="#3B82F6" />
          <Text style={styles.infoText}>{item.timeSlot}</Text>
        </View>

        {/* Services */}
        <View style={styles.infoRow}>
          <Icon name="cut-outline" size={16} color="#10B981" />
          <Text style={styles.infoText}>
            {item.services?.length || 0} service(s)
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>₹{item.totalAmount}</Text>
        </View>

        {/* Quick Actions */}
        {isUpcoming(item) && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleReschedule(item);
              }}
            >
              <Icon name="calendar" size={16} color="#3B82F6" />
              <Text style={styles.quickActionText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.cancelActionButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelBooking(item._id);
              }}
            >
              <Icon name="close-circle" size={16} color="#E74C3C" />
              <Text style={[styles.quickActionText, { color: '#E74C3C' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'completed' && !item.hasReview && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={(e) => {
              e.stopPropagation();
              handleAddReview(item);
            }}
          >
            <Icon name="star-outline" size={16} color="#FFD700" />
            <Text style={styles.reviewButtonText}>Add Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  const renderDetailModal = () => {
    if (!selectedBooking) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Salon Image */}
              <Image
                source={{ uri: selectedBooking.salon?.coverPhoto }}
                style={styles.modalSalonImage}
                resizeMode="cover"
              />

              {/* Status */}
              <View style={styles.detailSection}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                  <Icon name={getStatusIcon(selectedBooking.status)} size={20} color="#fff" />
                  <Text style={styles.statusTextLarge}>{selectedBooking.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Salon Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Salon Information</Text>
                <View style={styles.detailCard}>
                  <Text style={styles.salonNameLarge}>{selectedBooking.salon?.name}</Text>
                  <View style={styles.detailRow}>
                    <Icon name="location-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailText}>
                      {selectedBooking.salon?.address?.street}, {selectedBooking.salon?.address?.city}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="call-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailText}>{selectedBooking.salon?.contactNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Booking Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Booking Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.infoDetailRow}>
                    <Text style={styles.infoDetailLabel}>Booking ID</Text>
                    <Text style={styles.infoDetailValue}>#{selectedBooking._id.slice(-8)}</Text>
                  </View>
                  <View style={styles.infoDetailRow}>
                    <Text style={styles.infoDetailLabel}>Date</Text>
                    <Text style={styles.infoDetailValue}>{formatDate(selectedBooking.bookingDate)}</Text>
                  </View>
                  <View style={styles.infoDetailRow}>
                    <Text style={styles.infoDetailLabel}>Time Slot</Text>
                    <Text style={styles.infoDetailValue}>{selectedBooking.timeSlot}</Text>
                  </View>
                  <View style={styles.infoDetailRow}>
                    <Text style={styles.infoDetailLabel}>Number of Guests</Text>
                    <Text style={styles.infoDetailValue}>{selectedBooking.numberOfGuests}</Text>
                  </View>
                  <View style={styles.infoDetailRow}>
                    <Text style={styles.infoDetailLabel}>Booked On</Text>
                    <Text style={styles.infoDetailValue}>
                      {new Date(selectedBooking.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Services */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Services Booked</Text>
                {selectedBooking.services?.map((service, index) => (
                  <View key={index} style={styles.serviceDetailCard}>
                    <View style={styles.serviceDetailInfo}>
                      <Text style={styles.serviceDetailName}>{service.serviceName}</Text>
                      <Text style={styles.serviceDetailDuration}>
                        <Icon name="time-outline" size={12} color="#7F8C8D" /> {service.duration} min
                      </Text>
                    </View>
                    <Text style={styles.serviceDetailPrice}>₹{service.price}</Text>
                  </View>
                ))}
              </View>

              {/* Payment Summary */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Summary</Text>
                <View style={styles.detailCard}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Subtotal</Text>
                    <Text style={styles.paymentValue}>₹{selectedBooking.totalAmount}</Text>
                  </View>
                  {selectedBooking.discount > 0 && (
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Discount</Text>
                      <Text style={[styles.paymentValue, { color: '#10B981' }]}>
                        -₹{selectedBooking.discount}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.paymentRow, styles.totalPaymentRow]}>
                    <Text style={styles.totalPaymentLabel}>Total Amount</Text>
                    <Text style={styles.totalPaymentValue}>₹{selectedBooking.totalAmount}</Text>
                  </View>
                </View>
              </View>

              {/* Special Requests */}
              {selectedBooking.specialRequests && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Special Requests</Text>
                  <View style={styles.detailCard}>
                    <Text style={styles.specialRequestText}>{selectedBooking.specialRequests}</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              {isUpcoming(selectedBooking) && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => handleReschedule(selectedBooking)}
                  >
                    <Icon name="calendar" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalCancelButton]}
                    onPress={() => handleCancelBooking(selectedBooking._id)}
                  >
                    <Icon name="close-circle" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedBooking.status === 'completed' && !selectedBooking.hasReview && (
                <TouchableOpacity
                  style={styles.modalReviewButton}
                  onPress={() => handleAddReview(selectedBooking)}
                >
                  <Icon name="star" size={20} color="#fff" />
                  <Text style={styles.modalActionText}>Write a Review</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-outline" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'upcoming'
          ? 'Book your first salon appointment'
          : 'Your completed bookings will appear here'}
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Salons')}
        >
          <Text style={styles.browseButtonText}>Browse Salons</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B9D']}
            tintColor="#FF6B9D"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          bookings.length === 0
            ? styles.emptyContentContainer
            : styles.contentContainer
        }
      />

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#FF6B9D',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  emptyContentContainer: {
    flex: 1,
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  salonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8F9FA',
  },
  statusBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    padding: 15,
  },
  salonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    gap: 6,
  },
  cancelActionButton: {
    backgroundColor: '#FEE2E2',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF9E6',
    gap: 6,
    marginTop: 15,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalSalonImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  statusTextLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  salonNameLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
  },
  infoDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoDetailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  infoDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  serviceDetailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  serviceDetailInfo: {
    flex: 1,
  },
  serviceDetailName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceDetailDuration: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  serviceDetailPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  totalPaymentRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 0,
  },
  totalPaymentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalPaymentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  specialRequestText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  modalCancelButton: {
    backgroundColor: '#E74C3C',
  },
  modalReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    gap: 8,
    marginTop: 10,
  },
  modalActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default UserBookingsScreen;