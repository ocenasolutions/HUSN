// src/Pages/Orders/MyOrdersScreen.js - Updated with Rate Professional Button
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

const MyOrdersScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTab, setSelectedTab] = useState('All');
  const [reviewedProfessionals, setReviewedProfessionals] = useState(new Set());

  const statusFilters = ['All', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];

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
        setOrders(allOrders);
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
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
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
                Alert.alert('Success', 'Order cancelled successfully');
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

  const getStatusColor = (status, type) => {
    const serviceColors = {
      pending: '#F39C12',
      confirmed: '#27AE60',
      rejected: '#E74C3C',
      in_progress: '#3498DB',
      completed: '#8E44AD',
      cancelled: '#95A5A6',
    };

    const productColors = {
      placed: '#FF9F43',
      confirmed: '#27AE60',
      shipped: '#3498DB',
      out_for_delivery: '#9B59B6',
      delivered: '#2ECC71',
      cancelled: '#E74C3C',
      preparing: '#3498DB',
    };

    const serviceStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
    const isService = type === 'service' || serviceStatuses.includes(status);

    return isService 
      ? (serviceColors[status] || '#7F8C8D')
      : (productColors[status?.toLowerCase()] || '#7F8C8D');
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed':
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'shipped':
      case 'preparing':
        return 'cube-outline';
      case 'out_for_delivery':
      case 'in_progress':
        return 'car-outline';
      case 'delivered':
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
      placed: 'Placed',
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      in_progress: 'In Progress',
    };
    return names[status?.toLowerCase()] || status;
  };

  const getFilteredOrdersByTab = () => {
    let tabFiltered = orders;
    
    if (selectedTab === 'Services') {
      tabFiltered = orders.filter(order => 
        order.serviceItems && order.serviceItems.length > 0 && 
        (!order.productItems || order.productItems.length === 0)
      );
    } else if (selectedTab === 'Products') {
      tabFiltered = orders.filter(order => 
        order.productItems && order.productItems.length > 0 && 
        (!order.serviceItems || order.serviceItems.length === 0)
      );
    }
    
    if (selectedStatus === 'All') {
      return tabFiltered;
    }
    return tabFiltered.filter(order => order.status === selectedStatus);
  };

  const StatusFilter = ({ status, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, selected && styles.selectedFilterButton]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, selected && styles.selectedFilterButtonText]}>
        {status === 'All' ? 'All' : getStatusDisplayName(status)}
      </Text>
    </TouchableOpacity>
  );

  const TabButton = ({ tab, label, icon, selected, onPress, count }) => (
    <TouchableOpacity
      style={[styles.tabButton, selected && styles.selectedTabButton]}
      onPress={onPress}
    >
      <View style={styles.tabContent}>
        <Icon name={icon} size={20} color={selected ? '#FF6B9D' : '#7F8C8D'} />
        <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, selected && styles.selectedTabBadge]}>
            <Text style={[styles.tabBadgeText, selected && styles.selectedTabBadgeText]}>
              {count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getOrderItems = (order) => {
    const items = [];
    
    if (order.serviceItems && order.serviceItems.length > 0) {
      order.serviceItems.forEach(item => {
        items.push({
          ...item,
          name: item.serviceId?.name || 'Service',
          type: 'service',
          quantity: item.quantity,
          price: item.price,
          image_url: item.serviceId?.image_url || 'https://via.placeholder.com/50x50',
          selectedDate: item.selectedDate,
          selectedTime: item.selectedTime,
          professionalId: item.professionalId,
          professionalName: item.professionalName
        });
      });
    }
    
    if (order.productItems && order.productItems.length > 0) {
      order.productItems.forEach(item => {
        items.push({
          name: item.productId?.name || 'Product',
          type: 'product',
          quantity: item.quantity,
          price: item.price,
          image_url: item.productId?.primaryImage || item.productId?.images?.[0]?.url || 'https://via.placeholder.com/50x50'
        });
      });
    }
    
    return items;
  };

  const getOrderTypeBadge = (order) => {
    const hasServices = order.serviceItems && order.serviceItems.length > 0;
    const hasProducts = order.productItems && order.productItems.length > 0;
    
    if (hasServices && hasProducts) {
      return { label: 'Mixed', icon: 'cube-outline', color: '#9B59B6' };
    } else if (hasServices) {
      return { label: 'Service', icon: 'cut-outline', color: '#FF6B9D' };
    } else {
      return { label: 'Product', icon: 'bag-outline', color: '#54A0FF' };
    }
  };

  const getOrderCounts = () => {
    const serviceOrders = orders.filter(order => 
      order.serviceItems && order.serviceItems.length > 0 && 
      (!order.productItems || order.productItems.length === 0)
    ).length;
    
    const productOrders = orders.filter(order => 
      order.productItems && order.productItems.length > 0 && 
      (!order.serviceItems || order.serviceItems.length === 0)
    ).length;
    
    return { all: orders.length, services: serviceOrders, products: productOrders };
  };

  const shouldShowOtp = (order) => {
    const hasServices = order.serviceItems && order.serviceItems.length > 0;
    const canShowOtp = ['placed', 'confirmed', 'out_for_delivery'].includes(order.status);
    return hasServices && canShowOtp && order.serviceOtp;
  };

  const renderServiceItemWithProfessional = (item, index, order) => {
    const hasProfessional = item.professionalId && item.professionalName;
    const isDelivered = order.status === 'delivered';
    const reviewed = hasProfessional && isProfessionalReviewed(order._id, item.professionalId);
    
    return (
      <View key={index} style={styles.serviceItemContainer}>
        <View style={styles.orderItem}>
          <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemType}>
              âœ‚ï¸ Service â€¢ Qty: {item.quantity}
            </Text>
            {item.selectedDate && (
              <Text style={styles.itemSchedule}>
                ðŸ“… {formatDate(item.selectedDate)} at {item.selectedTime}
              </Text>
            )}
          </View>
          <Text style={styles.itemPrice}>â‚¹{item.price}</Text>
        </View>
        
        {hasProfessional && (
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

            {/* Rate Professional Button - Only show if delivered and not reviewed */}
            {isDelivered && !reviewed && (
              <TouchableOpacity
                style={styles.rateProfessionalButton}
                onPress={() => handleRateProfessional(order, item)}
              >
                <Icon name="star-outline" size={16} color="#FFD700" />
                <Text style={styles.rateProfessionalText}>Rate Professional</Text>
              </TouchableOpacity>
            )}

            {/* Already Reviewed Badge */}
            {isDelivered && reviewed && (
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
    const orderItems = getOrderItems(order);
    const typeBadge = getOrderTypeBadge(order);
    const orderType = typeBadge.label === 'Service' ? 'service' : 'product';
    const showOtp = shouldShowOtp(order);
    
    const serviceItems = orderItems.filter(item => item.type === 'service');
    const productItems = orderItems.filter(item => item.type === 'product');
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            {selectedTab === 'All' && (
              <View style={[styles.typeBadge, { backgroundColor: typeBadge.color + '15' }]}>
                <Icon name={typeBadge.icon} size={14} color={typeBadge.color} />
                <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>
                  {typeBadge.label}
                </Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status, orderType) + '15' }]}>
              <Icon name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status, orderType)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status, orderType) }]}>
                {getStatusDisplayName(order.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Service OTP Display */}
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
            {order.status === 'out_for_delivery' && (
              <View style={styles.serviceInProgressBanner}>
                <Icon name="construct" size={16} color="#3498DB" />
                <Text style={styles.serviceInProgressText}>
                  Service in progress
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Service Items with Professional Info */}
        {serviceItems.length > 0 && (
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <Icon name="cut" size={16} color="#FF6B9D" />
              <Text style={styles.sectionTitle}>Service Items</Text>
            </View>
            {serviceItems.map((item, index) => renderServiceItemWithProfessional(item, index, order))}
          </View>
        )}

        {/* Product Items */}
        {productItems.length > 0 && (
          <View style={styles.orderItems}>
            {productItems.slice(0, 2).map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>
                    ðŸ“¦ Product â€¢ Qty: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>â‚¹{item.price}</Text>
              </View>
            ))}
            {productItems.length > 2 && (
              <Text style={styles.moreItemsText}>
                +{productItems.length - 2} more products
              </Text>
            )}
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.orderTotal}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>â‚¹{order.totalAmount}</Text>
          </View>
          
          <View style={styles.orderActions}>
            {['placed'].includes(order.status?.toLowerCase()) && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelOrder(order._id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            
            {order.status?.toLowerCase() === 'delivered' ? (
              <TouchableOpacity
                style={styles.rateOrderButton}
                onPress={() => navigation.navigate('ReviewableItemsScreen', { 
                  orderId: order._id
                })}
              >
                <Icon name="star-outline" size={16} color="#FFD700" />
                <Text style={styles.rateOrderButtonText}>Rate Items</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('TrackOrder', { 
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  orderType: 'order'
                })}
              >
                <Text style={styles.viewDetailsButtonText}>Track Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyOrders = () => {
    let emptyMessage = "You haven't placed any orders yet.";
    let emptyIcon = "receipt-outline";
    
    if (selectedTab === 'Services') {
      emptyMessage = "You haven't ordered any services yet.";
      emptyIcon = "cut-outline";
    } else if (selectedTab === 'Products') {
      emptyMessage = "You haven't ordered any products yet.";
      emptyIcon = "bag-outline";
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name={emptyIcon} size={80} color="#FF6B9D" />
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptySubtitle}>{emptyMessage}</Text>
        <View style={styles.emptyButtons}>
          {(selectedTab === 'All' || selectedTab === 'Services') && (
            <TouchableOpacity
              style={styles.shopNowButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Services' })}
            >
              <Text style={styles.shopNowText}>Browse Services</Text>
            </TouchableOpacity>
          )}
          {(selectedTab === 'All' || selectedTab === 'Products') && (
            <TouchableOpacity
              style={[styles.shopNowButton, selectedTab !== 'All' && styles.shopNowButtonPrimary]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Products' })}
            >
              <Text style={[styles.shopNowText, selectedTab === 'All' && styles.shopNowTextSecondary]}>
                Browse Products
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const filteredOrders = getFilteredOrdersByTab();
  const orderCounts = getOrderCounts();

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerRight}>
          <Text style={styles.orderCount}>{orders.length} orders</Text>
        </View>
      </View>

      {orders.length > 0 && (
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            <TabButton
              tab="All"
              label="All Orders"
              icon="apps-outline"
              selected={selectedTab === 'All'}
              onPress={() => setSelectedTab('All')}
              count={orderCounts.all}
            />
            <TabButton
              tab="Services"
              label="Services"
              icon="cut-outline"
              selected={selectedTab === 'Services'}
              onPress={() => setSelectedTab('Services')}
              count={orderCounts.services}
            />
            <TabButton
              tab="Products"
              label="Products"
              icon="bag-outline"
              selected={selectedTab === 'Products'}
              onPress={() => setSelectedTab('Products')}
              count={orderCounts.products}
            />
          </ScrollView>
        </View>
      )}

      {orders.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {statusFilters.map((status) => (
              <StatusFilter
                key={status}
                status={status}
                selected={selectedStatus === status}
                onPress={() => setSelectedStatus(status)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        orders.length === 0 ? renderEmptyOrders() : (
          <View style={styles.noFilterResultsContainer}>
            <Icon name="filter-outline" size={60} color="#FF6B9D" />
            <Text style={styles.noFilterResultsTitle}>
              No {selectedTab !== 'All' ? selectedTab : ''} {getStatusDisplayName(selectedStatus)} Orders
            </Text>
            <Text style={styles.noFilterResultsSubtitle}>
              You don't have any {selectedStatus !== 'All' ? selectedStatus.toLowerCase() : ''} {selectedTab.toLowerCase()} orders at the moment.
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
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTabButton: {
    backgroundColor: '#FFE8F0',
    borderColor: '#FF6B9D',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  selectedTabLabel: {
    color: '#FF6B9D',
  },
  tabBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedTabBadge: {
    backgroundColor: '#FF6B9D',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  selectedTabBadgeText: {
    color: '#fff',
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
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  serviceItemContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderItems: {
    padding: 16,
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
  moreItemsText: {
    fontSize: 13,
    color: '#FF6B9D',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
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
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#E74C3C',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
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
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shopNowButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#FF6B9D',
  },
  shopNowButtonPrimary: {
    backgroundColor: '#FF6B9D',
  },
  shopNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  shopNowTextSecondary: {
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

export default MyOrdersScreen;