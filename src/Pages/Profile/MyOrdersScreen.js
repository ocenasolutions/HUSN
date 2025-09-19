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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const MyOrdersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');

  const statusFilters = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/user/${user.id}`);
      const data = await response.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
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
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                fetchOrders();
                Alert.alert('Success', 'Order cancelled successfully');
              }
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const reorderItems = async (order) => {
    try {
      const response = await fetch(`${API_URL}/orders/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          original_order_id: order.id,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Items added to cart successfully');
        navigation.navigate('MainTabs', { screen: 'Bookings' });
      }
    } catch (error) {
      console.error('Error reordering:', error);
      Alert.alert('Error', 'Failed to reorder items');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9F43';
      case 'confirmed':
        return '#54A0FF';
      case 'in progress':
        return '#9B59B6';
      case 'completed':
        return '#2ECC71';
      case 'cancelled':
        return '#E74C3C';
      default:
        return '#7F8C8D';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'in progress':
        return 'hourglass-outline';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const filteredOrders = selectedStatus === 'All' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const StatusFilter = ({ status, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, selected && styles.selectedFilterButton]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, selected && styles.selectedFilterButtonText]}>
        {status}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item: order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>Order #{order.order_number}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
          <Icon name={getStatusIcon(order.status)} size={16} color={getStatusColor(order.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.orderItems}>
        {order.items && order.items.slice(0, 2).map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemType}>
                {item.type === 'service' ? 'Service' : 'Product'} • Qty: {item.quantity}
              </Text>
            </View>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
        ))}
        {order.items && order.items.length > 2 && (
          <Text style={styles.moreItemsText}>
            +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      {/* Order Total */}
      <View style={styles.orderFooter}>
        <View style={styles.orderTotal}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{order.total_amount}</Text>
        </View>
        
        <View style={styles.orderActions}>
          {order.status.toLowerCase() === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => cancelOrder(order.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {order.status.toLowerCase() === 'completed' && (
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => reorderItems(order)}
            >
              <Icon name="refresh-outline" size={16} color="#FF6B9D" />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyOrders = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bag-outline" size={80} color="#FF6B9D" />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        You haven't placed any orders yet. Start exploring our services and products!
      </Text>
      <TouchableOpacity
        style={styles.shopNowButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Services' })}
      >
        <Text style={styles.shopNowText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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

      {/* Status Filters */}
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
            <Text style={styles.noFilterResultsTitle}>No {selectedStatus} Orders</Text>
            <Text style={styles.noFilterResultsSubtitle}>
              You don't have any {selectedStatus.toLowerCase()} orders at the moment.
            </Text>
          </View>
        )
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
    paddingVertical: 15,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  listContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
    borderRadius: 15,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderItems: {
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
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
    color: '#FF6B9D',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#54A0FF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#E74C3C15',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: '600',
  },
  reorderButton: {
    backgroundColor: '#FF6B9D15',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderButtonText: {
    color: '#FF6B9D',
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: '#54A0FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
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
    lineHeight: 24,
  },
  shopNowButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shopNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
export default MyOrdersScreen;