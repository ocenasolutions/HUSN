// src/Pages/Orders/ProductsOrderScreen.js
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

const ProductsOrderScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');

  const statusFilters = ['All', 'placed', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

  // ✅ NEW: Helper to check if order uses Borzo delivery
  const hasBorzoDelivery = (order) => {
    return order.courier?.toLowerCase().includes('borzo') || 
           order.trackingNumber?.toLowerCase().includes('borzo');
  };

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchOrders();
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
        // Filter only product orders
        const productOrders = allOrders.filter(order => 
          order.productItems && order.productItems.length > 0
        );
        setOrders(productOrders);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const cancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this product order?',
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
                Alert.alert('Success', 'Product order cancelled successfully');
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

  const getStatusColor = (status) => {
    const colors = {
      placed: '#FF9F43',
      confirmed: '#27AE60',
      shipped: '#3498DB',
      out_for_delivery: '#9B59B6',
      delivered: '#2ECC71',
      cancelled: '#E74C3C',
      preparing: '#3498DB',
    };
    return colors[status?.toLowerCase()] || '#7F8C8D';
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'shipped':
      case 'preparing':
        return 'cube-outline';
      case 'out_for_delivery':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusDisplayName = (status) => {
    const names = {
      placed: 'Placed',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
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

  const renderProductItem = (item, index) => {
    return (
      <View key={index} style={styles.orderItem}>
        <Image 
          source={{ 
            uri: item.productId?.primaryImage || 
                 item.productId?.images?.[0]?.url || 
                 'https://via.placeholder.com/50x50' 
          }} 
          style={styles.itemImage} 
        />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.productId?.name || 'Product'}</Text>
          <Text style={styles.itemType}>
            📦 Product • Qty: {item.quantity}
          </Text>
        </View>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
      </View>
    );
  };

  const renderOrderItem = ({ item: order }) => {
    const productItems = order.productItems || [];
    const isBorzoOrder = hasBorzoDelivery(order);
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Product Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
          <View style={styles.orderBadges}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
              <Icon name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusDisplayName(order.status)}
              </Text>
            </View>
            {/* ✅ NEW: Borzo Badge */}
            {isBorzoOrder && (
              <View style={styles.borzoBadge}>
                <Icon name="bicycle" size={12} color="#10B981" />
                <Text style={styles.borzoBadgeText}>Borzo</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderItems}>
          {productItems.slice(0, 3).map((item, index) => renderProductItem(item, index))}
          {productItems.length > 3 && (
            <Text style={styles.moreItemsText}>
              +{productItems.length - 3} more products
            </Text>
          )}
        </View>

        {order.address && (
          <View style={styles.addressSection}>
            <View style={styles.addressHeader}>
              <Icon name="location" size={16} color="#FF6B9D" />
              <Text style={styles.addressLabel}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>
              {order.address.street}, {order.address.city}, {order.address.state} - {order.address.zipCode}
            </Text>
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.orderTotal}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
          </View>
          
          <View style={styles.orderActions}>
            {/* Cancel Button - Only for placed orders */}
            {['placed'].includes(order.status?.toLowerCase()) && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelOrder(order._id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            
            {/* ✅ NEW: Track Delivery Button - For Borzo orders that are active */}
            {isBorzoOrder && 
             ['confirmed', 'shipped', 'out_for_delivery', 'preparing'].includes(order.status?.toLowerCase()) && (
              <TouchableOpacity
                style={styles.trackDeliveryButton}
                onPress={() => navigation.navigate('DeliveryTracking', {
                  orderId: order._id,
                  orderNumber: order.orderNumber
                })}
              >
                <Icon name="bicycle-outline" size={16} color="#fff" />
                <Text style={styles.trackDeliveryButtonText}>Track Delivery</Text>
              </TouchableOpacity>
            )}
            
            {/* Rate Order Button - Only for delivered orders */}
            {order.status?.toLowerCase() === 'delivered' ? (
              <TouchableOpacity
                style={styles.rateOrderButton}
                onPress={() => navigation.navigate('ReviewableItemsScreen', { 
                  orderId: order._id
                })}
              >
                <Icon name="star-outline" size={16} color="#FFD700" />
                <Text style={styles.rateOrderButtonText}>Rate Products</Text>
              </TouchableOpacity>
            ) : !isBorzoOrder && !['placed'].includes(order.status?.toLowerCase()) && (
              /* Regular Track Order Button - For non-Borzo orders */
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('DeliveryTrackingScreen', { 
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
    return (
      <View style={styles.emptyContainer}>
        <Icon name="bag-outline" size={80} color="#FF6B9D" />
        <Text style={styles.emptyTitle}>No Product Orders Yet</Text>
        <Text style={styles.emptySubtitle}>
          You haven't ordered any products yet. Browse our collection to find what you love!
        </Text>
        <TouchableOpacity
          style={styles.shopNowButton}
          onPress={() => navigation.navigate('Product' )}
        >
          <Text style={styles.shopNowText}>Browse Products</Text>
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
        <Text style={styles.headerTitle}>Product Orders</Text>
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
          <Text style={styles.loadingText}>Loading product orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        orders.length === 0 ? renderEmptyOrders() : (
          <View style={styles.noFilterResultsContainer}>
            <Icon name="filter-outline" size={60} color="#FF6B9D" />
            <Text style={styles.noFilterResultsTitle}>
              No {getStatusDisplayName(selectedStatus)} Product Orders
            </Text>
            <Text style={styles.noFilterResultsSubtitle}>
              You don't have any {selectedStatus !== 'All' ? selectedStatus.toLowerCase() : ''} product orders at the moment.
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
  orderBadges: {
    alignItems: 'flex-end',
    gap: 6,
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
  // ✅ NEW: Borzo Badge Style
  borzoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  borzoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  orderItems: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
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
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  moreItemsText: {
    fontSize: 13,
    color: '#FF6B9D',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  addressSection: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  addressText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  orderFooter: {
    padding: 16,
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
  // ✅ Track Delivery Button (already existed)
  trackDeliveryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4B7BE5',
  },
  trackDeliveryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

export default ProductsOrderScreen;