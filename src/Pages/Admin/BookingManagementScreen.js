// src/Pages/Admin/BookingManagementScreen.js
import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext'; 


const BookingManagementScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
const { tokens } = useAuth(); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const statusTabs = [
    { key: 'pending', label: 'Pending', count: 0, color: '#F39C12' },
    { key: 'confirmed', label: 'Confirmed', count: 0, color: '#27AE60' },
    { key: 'rejected', label: 'Rejected', count: 0, color: '#E74C3C' },
    { key: 'completed', label: 'Completed', count: 0, color: '#8E44AD' },
  ];

  useEffect(() => {
    fetchBookings();
  }, [selectedStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${API_URL}/bookings/admin/all?status=${selectedStatus}&limit=50`,
        {
         headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        }
      );

      const data = await response.json();

      if (data.success) {
        setBookings(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
      Alert.alert('Error', 'Something went wrong while fetching bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const openActionModal = (booking) => {
    setSelectedBooking(booking);
    setAdminNotes(booking.adminNotes || '');
    setRejectionReason(booking.rejectionReason || '');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedBooking(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const handleBookingAction = async (action) => {
    if (!selectedBooking) return;

    if (action === 'rejected' && !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(
        `${API_URL}/bookings/admin/${selectedBooking._id}/status`,
        {
          method: 'PATCH',
         headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
          body: JSON.stringify({
            status: action,
            adminNotes: adminNotes.trim(),
            rejectionReason: action === 'rejected' ? rejectionReason.trim() : undefined
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', `Booking ${action} successfully!`);
        closeActionModal();
        fetchBookings(); // Refresh the list
      } else {
        Alert.alert('Error', data.message || `Failed to ${action} booking`);
      }
    } catch (error) {
      console.error('Booking action error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#F39C12',
      confirmed: '#27AE60',
      rejected: '#E74C3C',
      completed: '#8E44AD',
      cancelled: '#95A5A6',
    };
    return statusColors[status] || '#7F8C8D';
  };

  const renderBookingCard = (booking) => (
    <View key={booking._id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingId}>#{booking._id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{booking.customerInfo.name}</Text>
        <Text style={styles.customerContact}>
          <Icon name="call-outline" size={14} color="#7F8C8D" /> {booking.customerInfo.phone}
        </Text>
        <Text style={styles.customerContact}>
          <Icon name="mail-outline" size={14} color="#7F8C8D" /> {booking.customerInfo.email}
        </Text>
      </View>

      <View style={styles.servicesInfo}>
        <Text style={styles.servicesTitle}>Services ({booking.services.length}):</Text>
        {booking.services.map((serviceItem, index) => (
          <View key={index} style={styles.serviceItem}>
            <Text style={styles.serviceName}>{serviceItem.service.name}</Text>
            <Text style={styles.serviceDetails}>
              {formatDate(serviceItem.selectedDate)} at {serviceItem.selectedTime}
            </Text>
            <Text style={styles.servicePrice}>₹{serviceItem.price} × {serviceItem.quantity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.totalAmount}>Total: ₹{booking.totalAmount}</Text>
        <Text style={styles.bookingDate}>
          Booked: {formatDate(booking.createdAt)}
        </Text>
      </View>

      {booking.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => {
              setSelectedBooking(booking);
              handleBookingAction('confirmed');
            }}
          >
            <Icon name="checkmark" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openActionModal(booking)}
          >
            <Icon name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => {
            setSelectedBooking(booking);
            handleBookingAction('completed');
          }}
        >
          <Icon name="checkmark-done" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id })}
      >
        <Text style={styles.detailsButtonText}>View Details</Text>
        <Icon name="arrow-forward" size={16} color="#FF6B9D" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.header}>
        <Text style={styles.title}>Booking Management</Text>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedStatus === tab.key && styles.activeTab,
                { borderBottomColor: tab.color }
              ]}
              onPress={() => setSelectedStatus(tab.key)}
            >
              <Text style={[
                styles.tabText,
                selectedStatus === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-outline" size={64} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No {selectedStatus} bookings</Text>
          <Text style={styles.emptySubtitle}>
            {selectedStatus === 'pending' 
              ? 'New bookings will appear here'
              : `No bookings in ${selectedStatus} status`
            }
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {bookings.map(renderBookingCard)}
        </ScrollView>
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeActionModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Booking</Text>
            <TouchableOpacity onPress={closeActionModal}>
              <Icon name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rejection Reason *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Please provide a reason for rejecting this booking..."
                placeholderTextColor="#7F8C8D"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor="#7F8C8D"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeActionModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rejectConfirmButton, actionLoading && styles.disabledButton]}
              onPress={() => handleBookingAction('rejected')}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.rejectConfirmButtonText}>Reject Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Helper function
const getStoredToken = async () => {
  return 'your-auth-token';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerInfo: {
    marginBottom: 15,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  customerContact: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 3,
  },
  servicesInfo: {
    marginBottom: 15,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  serviceItem: {
    backgroundColor: '#FFF5F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceDetails: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  bookingDate: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 5,
  },
  confirmButton: {
    backgroundColor: '#27AE60',
  },
  rejectButton: {
    backgroundColor: '#E74C3C',
  },
  completeButton: {
    backgroundColor: '#8E44AD',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  detailsButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectConfirmButton: {
    flex: 2,
    backgroundColor: '#E74C3C',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  rejectConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingManagementScreen;