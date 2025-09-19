// src/Pages/Booking/TrackOrderScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';
import { useAuth } from '../../contexts/AuthContext';

const TrackOrderScreen = ({ navigation, route }) => {
  const { orderData } = route.params || {};
  const { user, tokens } = useAuth();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    if (orderData) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderData.orderId || orderData._id}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setOrderDetails(data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Fetch order details error:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getOrderStatusSteps = () => {
    const currentOrder = orderDetails || orderData;
    
    return [
      {
        id: 'placed',
        title: 'Order Placed',
        date: currentOrder?.createdAt ? formatDate(currentOrder.createdAt) : 'June 15, 2024',
        icon: 'checkmark-circle',
        completed: true,
        current: currentOrder?.status === 'placed',
      },
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        date: currentOrder?.confirmedAt ? formatDate(currentOrder.confirmedAt) : 'June 16, 2024',
        icon: 'document-text',
        completed: ['confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered'].includes(currentOrder?.status),
        current: currentOrder?.status === 'confirmed',
      },
      {
        id: 'preparing',
        title: currentOrder?.type === 'product' ? 'Order Shipped' : 'Service Scheduled',
        date: currentOrder?.shippedAt ? formatDate(currentOrder.shippedAt) : 'June 16, 2024',
        icon: currentOrder?.type === 'product' ? 'car' : 'calendar',
        completed: ['preparing', 'shipped', 'out_for_delivery', 'delivered'].includes(currentOrder?.status),
        current: currentOrder?.status === 'preparing',
      },
      {
        id: 'out_for_delivery',
        title: currentOrder?.type === 'product' ? 'Out for Delivery' : 'Service in Progress',
        date: currentOrder?.outForDeliveryAt ? formatDate(currentOrder.outForDeliveryAt) : 'June 17, 2024',
        icon: currentOrder?.type === 'product' ? 'cube' : 'construct',
        completed: ['out_for_delivery', 'delivered'].includes(currentOrder?.status),
        current: currentOrder?.status === 'out_for_delivery',
      },
      {
        id: 'delivered',
        title: currentOrder?.type === 'product' ? 'Delivered' : 'Service Completed',
        date: currentOrder?.deliveredAt ? formatDate(currentOrder.deliveredAt) : 'June 17, 2024',
        icon: 'checkmark-circle',
        completed: currentOrder?.status === 'delivered',
        current: currentOrder?.status === 'delivered',
      },
    ];
  };

  const getTrackingInfo = () => {
    const currentOrder = orderDetails || orderData;
    
    return {
      trackingId: currentOrder?.trackingId || 'XYZ1234567890',
      courier: currentOrder?.courier || 'FedEx',
      estimatedDelivery: currentOrder?.estimatedDelivery ? 
        formatDate(currentOrder.estimatedDelivery) : 'June 17, 2024',
    };
  };

  if (loading) {
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
          <Text style={styles.headerTitle}>Order Status</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
        <Footer />
      </SafeAreaView>
    );
  }

  const orderStatusSteps = getOrderStatusSteps();
  const trackingInfo = getTrackingInfo();
  const currentOrder = orderDetails || orderData;

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
        <Text style={styles.headerTitle}>Order Status</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Number */}
        <View style={styles.orderNumberSection}>
          <Text style={styles.orderNumber}>
            Order #{currentOrder?.orderNumber || '1234567890'}
          </Text>
        </View>

        {/* Order Status Steps */}
        <View style={styles.statusContainer}>
          {orderStatusSteps.map((step, index) => (
            <View key={step.id} style={styles.statusStep}>
              <View style={styles.statusLeft}>
                <View style={[
                  styles.statusIcon,
                  step.completed && styles.statusIconCompleted,
                  step.current && styles.statusIconCurrent,
                ]}>
                  <Icon 
                    name={step.icon} 
                    size={20} 
                    color={step.completed || step.current ? '#FFFFFF' : '#999'}
                  />
                </View>
                
                {index < orderStatusSteps.length - 1 && (
                  <View style={[
                    styles.statusLine,
                    step.completed && styles.statusLineCompleted,
                  ]} />
                )}
              </View>
              
              <View style={styles.statusRight}>
                <Text style={[
                  styles.statusTitle,
                  step.completed && styles.statusTitleCompleted,
                  step.current && styles.statusTitleCurrent,
                ]}>
                  {step.title}
                </Text>
                <Text style={styles.statusDate}>{step.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Package Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tracking ID</Text>
              <Text style={styles.detailValue}>{trackingInfo.trackingId}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Courier</Text>
              <Text style={styles.detailValue}>{trackingInfo.courier}</Text>
            </View>
          </View>

          <View style={styles.estimateSection}>
            <Text style={styles.detailLabel}>Estimate Delivery</Text>
            <Text style={styles.estimateDate}>{trackingInfo.estimatedDelivery}</Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <Text style={styles.contactText}>Contact Support</Text>
            <Icon name="chevron-forward" size={20} color="#FF1493" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('MyOrders')}
          >
            <Text style={styles.primaryButtonText}>View All Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  orderNumberSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  statusIconCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  statusIconCurrent: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  statusLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
  },
  statusLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  statusRight: {
    flex: 1,
    paddingBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  statusTitleCompleted: {
    color: '#000',
  },
  statusTitleCurrent: {
    color: '#FF1493',
  },
  statusDate: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  estimateSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  estimateDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  secondaryButtonText: {
    color: '#FF1493',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default TrackOrderScreen;