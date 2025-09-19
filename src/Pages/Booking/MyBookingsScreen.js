// src/Pages/Booking/MyBookingsScreen.js
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext'; 


const MyBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchBookings();
  }, [selectedStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const statusParam = selectedStatus === 'all' ? '' : `?status=${selectedStatus}`;
      const response = await fetch(`${API_URL}/bookings/my-bookings${statusParam}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

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

  const handleCancelBooking = (bookingId) => {
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
              const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
              headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Booking cancelled successfully');
                fetchBookings();
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Cancel booking error:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
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

  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: 'time-outline',
      confirmed: 'checkmark-circle-outline',
      rejected: 'close-circle-outline',
      completed: 'checkmark-done-circle-outline',
      cancelled: 'ban-outline',
    };
    return statusIcons[status] || 'help-circle-outline';
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

  const renderBookingCard = (booking) => (
    <View key={booking._id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingId}>#{booking._id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Icon name={getStatusIcon(booking.status)} size={12} color="#fff" />
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.servicesInfo}>
        {booking.services.map((serviceItem, index) => (
          <View key={index} style={styles.serviceItem}>
            <Text style={styles.serviceName}>{serviceItem.service.name}</Text>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceDate}>
                <Icon name="calendar-outline" size={14} color="#7F8C8D" />
                {' '}{formatDate(serviceItem.selectedDate)} at {serviceItem.selectedTime}
              </Text>
              <Text style={styles.servicePrice}>₹{serviceItem.price} × {serviceItem.quantity}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bookingFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{booking.totalAmount}</Text>
        </View>
        <Text style={styles.bookingDate}>
          Booked on {formatDate(booking.createdAt)}
        </Text>
      </View>

      {booking.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Icon name="information-circle" size={16} color="#E74C3C" />
          <Text style={styles.rejectionReason}>{booking.rejectionReason}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id })}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>

        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(booking._id)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
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
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-outline" size={64} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No bookings found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedStatus === 'all' 
              ? 'You haven\'t made any bookings yet'
              : `No ${selectedStatus} bookings found`
            }
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.browseButtonText}>Browse Services</Text>
          </TouchableOpacity>
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
    </SafeAreaView>
  );
};

// src/Pages/Notifications/NotificationsScreen.js
const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { tokens } = useAuth(); 

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
      Alert.alert('Error', 'Something went wrong while fetching notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date()
        }))
      );
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      booking_confirmed: 'checkmark-circle',
      booking_rejected: 'close-circle',
      booking_completed: 'checkmark-done-circle',
      general: 'information-circle',
    };
    return icons[type] || 'notifications';
  };

  const getNotificationColor = (type) => {
    const colors = {
      booking_confirmed: '#27AE60',
      booking_rejected: '#E74C3C',
      booking_completed: '#8E44AD',
      general: '#FF6B9D',
    };
    return colors[type] || '#7F8C8D';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotification = (notification) => (
    <TouchableOpacity
      key={notification._id}
      style={[styles.notificationCard, !notification.isRead && styles.unreadNotification]}
      onPress={() => {
        if (!notification.isRead) {
          markAsRead(notification._id);
        }
        if (notification.relatedBooking) {
          navigation.navigate('BookingDetails', { 
            bookingId: notification.relatedBooking._id || notification.relatedBooking 
          });
        }
      }}
    >
      <View style={styles.notificationHeader}>
        <Icon
          name={getNotificationIcon(notification.type)}
          size={24}
          color={getNotificationColor(notification.type)}
        />
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>{formatTimeAgo(notification.createdAt)}</Text>
        </View>
        {!notification.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{notification.message}</Text>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-outline" size={64} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            We'll notify you about your booking updates here
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
          {notifications.map(renderNotification)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  markAllText: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B9D',
  },
  tabText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B9D',
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
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  servicesInfo: {
    marginBottom: 15,
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
    marginBottom: 6,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDate: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  bookingFooter: {
    marginBottom: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
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
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  rejectionReason: {
    flex: 1,
    fontSize: 14,
    color: '#E74C3C',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#FFF5F8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  detailsButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  notificationTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});

export { MyBookingsScreen, NotificationsScreen };