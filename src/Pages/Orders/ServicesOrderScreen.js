// src/Pages/Orders/ServicesOrderScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';


const ServicesOrderScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [reviewedProfessionals, setReviewedProfessionals] = useState(new Set());

  const statusFilters = ['All', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchOrders();
    fetchUserReviews();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/my-orders`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const allOrders = data.data?.orders || data.data || [];
        const serviceOrders = allOrders.filter(order => 
          order.serviceItems && order.serviceItems.length > 0
        );
        setOrders(serviceOrders);
      } else {
        Alert.alert('Error', data.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const response = await fetch(`${API_URL}/reviews/my-reviews?type=professional&limit=100`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const professionalIds = new Set(
          data.data.reviews
            .filter(r => r.professionalId)
            .map(r => `${r.order._id || r.order}-${r.professionalId._id || r.professionalId}`)
        );
        setReviewedProfessionals(professionalIds);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    await fetchUserReviews();
    setRefreshing(false);
  };

const cancelOrder = async (orderId) => {
  try {
    const order = orders.find(o => o._id === orderId);
    
    if (!order || !order.serviceItems || order.serviceItems.length === 0) {
      Alert.alert('Error', 'Invalid order');
      return;
    }

    // Calculate timing and amounts
    let isLateCancellation = false;
    let penaltyAmount = 0;
    let refundAmount = 0;
    let serviceTotalAmount = 0;
    const now = new Date();

    for (const serviceItem of order.serviceItems) {
      const itemTotal = serviceItem.price * serviceItem.quantity;
      serviceTotalAmount += itemTotal;

      if (serviceItem.selectedDate && serviceItem.selectedTime) {
        const [hours, minutes] = serviceItem.selectedTime.split(':');
        const serviceDateTime = new Date(serviceItem.selectedDate);
        serviceDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const timeDifference = serviceDateTime - now;
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        if (hoursDifference > 0 && hoursDifference <= 2) {
          isLateCancellation = true;
          penaltyAmount += itemTotal * 0.5;
          refundAmount += itemTotal * 0.5;
        } else if (hoursDifference > 2) {
          refundAmount += itemTotal;
        }
      }
    }

    // Build alert message based on payment method
    let alertTitle = '';
    let alertMessage = '';
    let buttonText = '';
    
    const paymentMethod = order.paymentMethod;

    if (isLateCancellation) {
      // LATE CANCELLATION (within 2 hours)
      alertTitle = '⚠️ Late Cancellation Fee';
      
      if (paymentMethod === 'wallet') {
        alertMessage = `You are cancelling within 2 hours of service time.\n\n` +
          `📊 Breakdown:\n` +
          `• Service Amount: ₹${serviceTotalAmount.toFixed(2)}\n` +
          `• Penalty (50%): ₹${penaltyAmount.toFixed(2)}\n` +
          `• Refund to Wallet (50%): ₹${refundAmount.toFixed(2)}\n\n` +
          `The penalty has already been deducted when you paid. You'll get 50% back.`;
        buttonText = 'Yes, Cancel & Get 50% Refund';
      } 
      else if (paymentMethod === 'cod') {
        alertMessage = `You are cancelling within 2 hours of service time.\n\n` +
          `📊 Cancellation Fee:\n` +
          `• Service Amount: ₹${serviceTotalAmount.toFixed(2)}\n` +
          `• Penalty (50%): ₹${penaltyAmount.toFixed(2)}\n\n` +
          `This penalty will be deducted from your wallet. If insufficient balance, a debt will be created that must be cleared before booking new services.`;
        buttonText = 'Yes, Pay Fee & Cancel';
      } 
      else { // online/UPI
        alertMessage = `You are cancelling within 2 hours of service time.\n\n` +
          `📊 Refund Breakdown:\n` +
          `• Paid Amount: ₹${serviceTotalAmount.toFixed(2)}\n` +
          `• Penalty (50%): ₹${penaltyAmount.toFixed(2)}\n` +
          `• Refund to Wallet (50%): ₹${refundAmount.toFixed(2)}\n\n` +
          `50% will be refunded to your wallet within 5-7 business days.`;
        buttonText = 'Yes, Cancel & Get 50% Refund';
      }
    } else {
      // EARLY CANCELLATION (more than 2 hours before)
      alertTitle = 'Cancel Service Order';
      
      if (paymentMethod === 'wallet') {
        alertMessage = `You are cancelling more than 2 hours before service time.\n\n` +
          `💰 Full Refund:\n` +
          `• Service Amount: ₹${serviceTotalAmount.toFixed(2)}\n` +
          `• Refund to Wallet (100%): ₹${serviceTotalAmount.toFixed(2)}\n\n` +
          `No penalty will be charged. Full amount will be refunded to your wallet.`;
        buttonText = 'Yes, Cancel & Get Full Refund';
      } 
      else if (paymentMethod === 'cod') {
        alertMessage = `You are cancelling more than 2 hours before service time.\n\n` +
          `✅ No charges will be applied.\n` +
          `No payment was made yet (COD), so there's nothing to refund.`;
        buttonText = 'Yes, Cancel Order';
      } 
      else { // online/UPI
        alertMessage = `You are cancelling more than 2 hours before service time.\n\n` +
          `💰 Full Refund:\n` +
          `• Paid Amount: ₹${serviceTotalAmount.toFixed(2)}\n` +
          `• Refund to Wallet (100%): ₹${serviceTotalAmount.toFixed(2)}\n\n` +
          `Full amount will be refunded to your wallet within 5-7 business days.`;
        buttonText = 'Yes, Cancel & Get Full Refund';
      }
    }

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: buttonText,
          style: isLateCancellation ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ reason: 'Cancelled by user' })
              });
              
              const data = await response.json();
              
              if (data.success) {
                fetchOrders();
                
                // Show success message with transaction details
                if (data.data?.cancellationDetails) {
                  const details = data.data.cancellationDetails;
                  let successMsg = '';
                  
                  if (details.isLateCancellation) {
                    if (details.debtCreated) {
                      successMsg = `Order cancelled.\n\n` +
                        `⚠️ Outstanding Balance: ₹${details.debtAmount.toFixed(2)}\n\n` +
                        `Please clear this debt before booking new services.`;
                    } else if (details.refundAmount > 0) {
                      successMsg = `Order cancelled.\n\n` +
                        `💰 Refunded: ₹${details.refundAmount.toFixed(2)}\n` +
                        `⚠️ Penalty: ₹${details.penaltyAmount.toFixed(2)}`;
                    } else {
                      successMsg = `Order cancelled.\n\n` +
                        `⚠️ Penalty Charged: ₹${details.penaltyAmount.toFixed(2)}`;
                    }
                  } else {
                    if (details.refundAmount > 0) {
                      successMsg = `Order cancelled successfully!\n\n` +
                        `💰 Full Refund: ₹${details.refundAmount.toFixed(2)}\n` +
                        `Credited to your wallet.`;
                    } else {
                      successMsg = 'Order cancelled successfully!';
                    }
                  }
                  
                  Alert.alert('✓ Cancellation Complete', successMsg);
                } else {
                  Alert.alert('Success', data.message || 'Order cancelled successfully');
                }
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel order');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('Cancel order error:', error);
    Alert.alert('Error', 'Failed to process cancellation');
  }
};

  const handleRateProfessional = (order, serviceItem) => {
    const item = {
      itemId: serviceItem.serviceId._id || serviceItem.serviceId,
      professionalId: serviceItem.professionalId,
      type: 'professional',
      name: serviceItem.professionalName,
      serviceName: serviceItem.serviceId?.name || 'Service',
      image: null,
      price: serviceItem.price,
      quantity: serviceItem.quantity,
      reviewed: false
    };

    navigation.navigate('WriteReviewScreen', {
      orderId: order._id,
      item: item,
    });
  };

  const isProfessionalReviewed = (orderId, professionalId) => {
    return reviewedProfessionals.has(`${orderId}-${professionalId}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F39C12',
      confirmed: '#27AE60',
      rejected: '#E74C3C',
      in_progress: '#3498DB',
      completed: '#8E44AD',
      cancelled: '#95A5A6',
    };
    return colors[status] || '#7F8C8D';
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'in_progress':
        return 'construct-outline';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusDisplayName = (status) => {
    const names = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
    };
    return names[status?.toLowerCase()] || status;
  };

  const getFilteredOrders = () => {
    if (selectedStatus === 'All') {
      return orders;
    }
    return orders.filter(order => order.status === selectedStatus);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const shouldShowOtp = (order) => {
    const canShowOtp = ['pending', 'confirmed', 'in_progress'].includes(order.status);
    return canShowOtp && order.serviceOtp;
  };

  const renderServiceItem = (item, index, order) => {
    const hasProfessional = item.professionalId && item.professionalName;
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';
    const reviewed = hasProfessional && isProfessionalReviewed(order._id, item.professionalId);
    
    return (
      <View key={index} style={styles.serviceItemContainer}>
        <View style={[styles.orderItem, isCancelled && styles.fadedItem]}>
          <Image 
            source={{ uri: item.serviceId?.image_url || 'https://via.placeholder.com/50x50' }} 
            style={[styles.itemImage, isCancelled && styles.fadedImage]} 
          />
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, isCancelled && styles.fadedText]}>
              {item.serviceId?.name || 'Service'}
            </Text>
            <Text style={[styles.itemType, isCancelled && styles.fadedText]}>
              ✂️ Service • Qty: {item.quantity}
            </Text>
            {item.selectedDate && (
              <Text style={[styles.itemSchedule, isCancelled && styles.fadedText]}>
                📅 {formatDate(item.selectedDate)} at {item.selectedTime}
              </Text>
            )}
          </View>
          <Text style={[styles.itemPrice, isCancelled && styles.fadedText]}>
            ₹{item.price}
          </Text>
        </View>
        
        {hasProfessional && !isCancelled && (
          <View style={styles.professionalCard}>
            <View style={styles.professionalHeader}>
              <Icon name="person-circle" size={20} color="#4CAF50" />
              <Text style={styles.professionalLabel}>Your Professional</Text>
            </View>
            <View style={styles.professionalInfo}>
              <View style={styles.professionalAvatar}>
                <Icon name="person" size={24} color="#FF6B9D" />
              </View>
              <View style={styles.professionalDetails}>
                <Text style={styles.professionalName}>{item.professionalName}</Text>
                <View style={styles.professionalTags}>
                  <View style={styles.verifiedBadge}>
                    <Icon name="shield-checkmark" size={12} color="#4CAF50" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                  <View style={styles.expertBadge}>
                    <Icon name="star" size={12} color="#FFA500" />
                    <Text style={styles.expertText}>Expert</Text>
                  </View>
                </View>
              </View>
            </View>

            {isCompleted && !reviewed && (
              <TouchableOpacity
                style={styles.rateProfessionalButton}
                onPress={() => handleRateProfessional(order, item)}
              >
                <Icon name="star-outline" size={16} color="#FFD700" />
                <Text style={styles.rateProfessionalText}>Rate Professional</Text>
              </TouchableOpacity>
            )}

            {isCompleted && reviewed && (
              <View style={styles.reviewedProfessionalBadge}>
                <Icon name="checkmark-circle" size={16} color="#2ECC71" />
                <Text style={styles.reviewedProfessionalText}>Professional Reviewed</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

const renderOrderItem = ({ item: order }) => {
  const showOtp = shouldShowOtp(order);
  const isCancelled = order.status === 'cancelled';
  const canCancel = ['pending', 'placed', 'confirmed'].includes(order.status?.toLowerCase());
  
  return (
    <View style={[styles.orderCard, isCancelled && styles.cancelledOrderCard]}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={[styles.orderIdLabel, isCancelled && styles.fadedText]}>
            Service Order #{order.orderNumber}
          </Text>
          <Text style={[styles.orderDate, isCancelled && styles.fadedText]}>
            {formatDate(order.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
          <Icon name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusDisplayName(order.status)}
          </Text>
        </View>
      </View>

      {/* OTP Section */}
      {showOtp && (
        <View style={styles.otpContainer}>
          <View style={styles.otpHeader}>
            <Icon name="shield-checkmark" size={20} color="#FF6B9D" />
            <Text style={styles.otpHeaderText}>Service OTP</Text>
          </View>
          <View style={styles.otpBox}>
            <Text style={styles.otpCode}>{order.serviceOtp}</Text>
          </View>
          <View style={styles.otpInstructionsContainer}>
            <Icon name="information-circle-outline" size={18} color="#7F8C8D" />
            <Text style={styles.otpInstructions}>
              Share this OTP with the service professional when they arrive to start the service
            </Text>
          </View>
          {order.status === 'in_progress' && (
            <View style={styles.serviceInProgressBanner}>
              <Icon name="construct" size={16} color="#3498DB" />
              <Text style={styles.serviceInProgressText}>
                Service in progress
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Services List */}
      <View style={styles.servicesSection}>
        {order.serviceItems.map((item, index) => renderServiceItem(item, index, order))}
      </View>

      {/* Order Footer with Total and Actions */}
      <View style={styles.orderFooter}>
        <View style={styles.orderTotal}>
          <Text style={[styles.totalLabel, isCancelled && styles.fadedText]}>
            Total Amount
          </Text>
          <Text style={[styles.totalAmount, isCancelled && styles.fadedText]}>
            ₹{order.totalAmount}
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.orderActions}>
          {/* Cancel Button - Shows for pending, placed, confirmed orders */}
          {canCancel && !isCancelled && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => cancelOrder(order._id)}
            >
              <Icon name="close-circle-outline" size={18} color="#E74C3C" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {/* Primary Action Button */}
          {!isCancelled && (
            <>
              {order.status?.toLowerCase() === 'completed' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.rateButton]}
                  onPress={() => navigation.navigate('ReviewableItemsScreen', { 
                    orderId: order._id
                  })}
                >
                  <Icon name="star-outline" size={18} color="#FFD700" />
                  <Text style={styles.rateButtonText}>Rate Service</Text>
                </TouchableOpacity>
              ) : ['in_progress', 'out_for_delivery'].includes(order.status?.toLowerCase()) ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.trackButton]}
                  onPress={() => navigation.navigate('TrackServiceScreen', { 
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    orderType: 'service'
                  })}
                >
                  <Icon name="location" size={18} color="#fff" />
                  <Text style={styles.trackButtonText}>Track Live</Text>
                </TouchableOpacity>
              ) : canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => navigation.navigate('TrackServiceScreen', { 
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    orderType: 'service'
                  })}
                >
                  <Icon name="eye-outline" size={18} color="#fff" />
                  <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

  const renderEmptyOrders = () => {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="cut-outline" size={80} color="#FF6B9D" />
        <Text style={styles.emptyTitle}>No Service Orders Yet</Text>
        <Text style={styles.emptySubtitle}>
          You haven't ordered any services yet. Browse our professional services to get started!
        </Text>
        <TouchableOpacity
          style={styles.shopNowButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Services' })}
        >
          <Text style={styles.shopNowText}>Browse Services</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const filteredOrders = getFilteredOrders();

  return (
    <SafeAreaView style={styles.container}>
      <Header/> 
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Orders</Text>
        <View style={styles.headerRight}>
          <Text style={styles.orderCount}>{orders.length} orders</Text>
        </View>
      </View>

      {orders.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {statusFilters.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, selectedStatus === status && styles.selectedFilterButton]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.filterButtonText, selectedStatus === status && styles.selectedFilterButtonText]}>
                  {status === 'All' ? 'All' : getStatusDisplayName(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading service orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        orders.length === 0 ? renderEmptyOrders() : (
          <View style={styles.noFilterResultsContainer}>
            <Icon name="filter-outline" size={60} color="#FF6B9D" />
            <Text style={styles.noFilterResultsTitle}>
              No {getStatusDisplayName(selectedStatus)} Service Orders
            </Text>
            <Text style={styles.noFilterResultsSubtitle}>
              You don't have any {selectedStatus !== 'All' ? selectedStatus.toLowerCase() : ''} service orders at the moment.
            </Text>
          </View>
        )
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF6B9D']}
              tintColor="#FF6B9D"
            />
          }
        />
      )}
    {/* Footer here we can have the */}
      <Footer/>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  orderCount: {
    fontSize: 12,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedFilterButton: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  selectedFilterButtonText: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cancelledOrderCard: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  orderIdContainer: {
    flex: 1,
  },
  orderIdLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fadedText: {
    opacity: 0.5,
  },
  fadedItem: {
    opacity: 0.6,
  },
  fadedImage: {
    opacity: 0.4,
  },
  otpContainer: {
    backgroundColor: '#FFF9FB',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8F0',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  otpHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  otpBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderStyle: 'dashed',
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
    letterSpacing: 8,
  },
  otpInstructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
  },
  otpInstructions: {
    flex: 1,
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  serviceInProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  serviceInProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498DB',
  },
  servicesSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  serviceItemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  itemSchedule: {
    fontSize: 11,
    color: '#FF6B9D',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  professionalCard: {
    backgroundColor: '#F8FFF9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  professionalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  professionalTags: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  expertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  expertText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFA500',
  },
  rateProfessionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  rateProfessionalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFA500',
  },
  reviewedProfessionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2ECC71',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  reviewedProfessionalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  orderFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
   actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rateButton: {
    backgroundColor: '#FFFBF0',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
    trackButton: {
    backgroundColor: '#FF6B9D',
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
    detailsButton: {
    backgroundColor: '#FF6B9D',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  viewDetailsButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rateOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rateOrderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  shopNowButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
  },
  shopNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  noFilterResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noFilterResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  noFilterResultsSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ServicesOrderScreen;