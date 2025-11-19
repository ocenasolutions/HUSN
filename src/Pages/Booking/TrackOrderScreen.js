// src/Pages/Booking/TrackOrderScreen.js - Updated with real data
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import { useAuth } from '../../contexts/AuthContext';

const TrackOrderScreen = ({ navigation, route }) => {
  const { orderId, orderNumber, orderType = 'order' } = route.params;
  const { tokens, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const endpoint = orderType === 'booking' 
        ? `${API_URL}/bookings/${orderId}`
        : `${API_URL}/orders/${orderId}`;

      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        setOrderData(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Fetch order details error:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  const getStatusSteps = () => {
    if (orderType === 'booking') {
      return [
        { key: 'pending', label: 'Booking Placed', icon: 'checkmark-circle' },
        { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle' },
        { key: 'in_progress', label: 'Service Started', icon: 'play-circle' },
        { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle' }
      ];
    } else {
      return [
        { key: 'placed', label: 'Order Placed', icon: 'checkmark-circle' },
        { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle' },
        { key: 'shipped', label: 'Shipped', icon: 'airplane' },
        { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'car' },
        { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle' }
      ];
    }
  };

  const getCurrentStepIndex = () => {
    if (!orderData) return -1;
    const steps = getStatusSteps();
    return steps.findIndex(step => step.key === orderData.status);
  };

  const getStatusColor = (status) => {
    const colors = {
      placed: '#FFA500',
      confirmed: '#4CAF50',
      preparing: '#2196F3',
      shipped: '#9C27B0',
      out_for_delivery: '#FF5722',
      delivered: '#4CAF50',
      cancelled: '#F44336',
      pending: '#FFA500',
      completed: '#4CAF50',
      rejected: '#F44336',
      in_progress: '#2196F3',
    };
    return colors[status] || '#666';
  };

  const renderTrackingTimeline = () => {
    const steps = getStatusSteps();
    const currentStepIndex = getCurrentStepIndex();

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Order Status</Text>
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineIcon,
                  { backgroundColor: isCompleted ? '#4CAF50' : '#E0E0E0' }
                ]}>
                  <Icon 
                    name={step.icon} 
                    size={20} 
                    color={isCompleted ? '#FFFFFF' : '#999'} 
                  />
                </View>
                {!isLast && (
                  <View style={[
                    styles.timelineLine,
                    { backgroundColor: isCompleted ? '#4CAF50' : '#E0E0E0' }
                  ]} />
                )}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[
                  styles.timelineLabel,
                  { 
                    color: isCompleted ? '#000' : '#666',
                    fontWeight: isCurrent ? '700' : '500'
                  }
                ]}>
                  {step.label}
                </Text>
                {getTimestampForStatus(step.key) && (
                  <Text style={styles.timelineTime}>
                    {new Date(getTimestampForStatus(step.key)).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const getTimestampForStatus = (status) => {
    if (!orderData) return null;

    const timestampMap = {
      placed: orderData.createdAt,
      pending: orderData.createdAt,
      confirmed: orderData.confirmedAt,
      shipped: orderData.shippedAt,
      out_for_delivery: orderData.outForDeliveryAt,
      delivered: orderData.deliveredAt,
      in_progress: orderData.serviceStartedAt,
      completed: orderData.completedAt
    };

    return timestampMap[status];
  };

  const renderOrderDetails = () => (
    <View style={styles.detailsContainer}>
      <Text style={styles.detailsTitle}>
        {orderType === 'booking' ? 'Booking' : 'Order'} Details
      </Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          {orderType === 'booking' ? 'Booking' : 'Order'} Number:
        </Text>
        <Text style={styles.detailValue}>
          #{orderData?.orderNumber || orderData?.bookingNumber}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderData?.status) }]}>
          <Text style={styles.statusText}>
            {orderData?.status?.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Amount:</Text>
        <Text style={styles.detailValue}>₹{orderData?.totalAmount}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>
          {new Date(orderData?.createdAt).toLocaleDateString('en-IN')}
        </Text>
      </View>

      {orderData?.trackingId && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tracking ID:</Text>
          <Text style={styles.trackingValue}>{orderData.trackingId}</Text>
        </View>
      )}

      {orderData?.estimatedDelivery && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expected Delivery:</Text>
          <Text style={styles.detailValue}>
            {new Date(orderData.estimatedDelivery).toLocaleDateString('en-IN')}
          </Text>
        </View>
      )}

      {orderData?.serviceStartTime && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Time:</Text>
          <Text style={styles.detailValue}>{orderData.serviceStartTime}</Text>
        </View>
      )}

      {orderData?.serviceOtp && orderType === 'booking' && (
        <View style={styles.otpContainer}>
          <Text style={styles.otpLabel}>Service OTP:</Text>
          <Text style={styles.otpText}>{orderData.serviceOtp}</Text>
          <Text style={styles.otpSubtext}>
            Show this OTP to the service provider to start the service
          </Text>
        </View>
      )}
    </View>
  );

  const renderActionButtons = () => {
    if (!orderData) return null;

    return (
      <View style={styles.actionContainer}>
        {orderData.status === 'delivered' || orderData.status === 'completed' ? (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => navigation.navigate('ReviewableItemsScreen', {
              referenceType: orderType === 'booking' ? 'Booking' : 'Order',
              referenceId: orderData._id,
              orderNumber: orderData.orderNumber || orderData.bookingNumber
            })}
          >
            <Icon name="star-outline" size={20} color="#FFFFFF" />
            <Text style={styles.reviewButtonText}>Write Review</Text>
          </TouchableOpacity>
        ) : null}

        {(['placed', 'confirmed'].includes(orderData.status) && orderType === 'order') && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelOrder()}
          >
            <Icon name="close-circle-outline" size={20} color="#F44336" />
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => navigation.navigate('HelpCenter')}
        >
          <Icon name="help-circle-outline" size={20} color="#FF1493" />
          <Text style={styles.supportButtonText}>Need Help?</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ reason: 'Customer requested cancellation' })
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                fetchOrderDetails();
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel order');
              }
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchOrderDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Track {orderType === 'booking' ? 'Booking' : 'Order'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTrackingTimeline()}
        {renderOrderDetails()}
        {renderActionButtons()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#FF1493',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trackingValue: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '600',
  },
  otpContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF1493',
    borderStyle: 'dashed',
  },
  otpLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  otpText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF1493',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 8,
  },
  otpSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1493',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
    marginLeft: 8,
  },
});

export default TrackOrderScreen;