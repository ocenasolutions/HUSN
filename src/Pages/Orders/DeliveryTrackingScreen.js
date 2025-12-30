// src/Pages/Orders/DeliveryTrackingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const DeliveryTrackingScreen = ({ route, navigation }) => {
  const { orderId, orderNumber } = route.params;
  const { user, tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchDeliveryStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDeliveryStatus(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [orderId]);

  const fetchDeliveryStatus = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await fetch(`${API_URL}/borzo/status/${orderId}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setDeliveryData(data.data);
      }
    } catch (error) {
      console.error('Fetch delivery status error:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryStatus(false);
  };

  const openTrackingUrl = () => {
    if (deliveryData?.trackingUrl) {
      Linking.openURL(deliveryData.trackingUrl);
    }
  };

  const callCourier = () => {
    if (deliveryData?.courier?.phone) {
      Linking.openURL(`tel:${deliveryData.courier.phone}`);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_admin_approval: 'time-outline',
      price_calculated: 'calculator-outline',
      creating: 'hourglass-outline',
      new: 'checkmark-circle-outline',
      available: 'radio-button-on-outline',
      active: 'play-circle-outline',
      courier_assigned: 'person-circle-outline',
      pickup_arrived: 'location-outline',
      picked_up: 'checkmark-done-outline',
      delivering: 'bicycle-outline',
      delivered: 'checkmark-done-circle',
      cancelled: 'close-circle-outline',
      failed: 'alert-circle-outline',
    };
    return icons[status] || 'help-circle-outline';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_admin_approval: '#FFA500',
      price_calculated: '#2196F3',
      creating: '#9C27B0',
      new: '#4CAF50',
      available: '#00BCD4',
      active: '#FF5722',
      courier_assigned: '#673AB7',
      pickup_arrived: '#3F51B5',
      picked_up: '#009688',
      delivering: '#FF9800',
      delivered: '#4CAF50',
      cancelled: '#F44336',
      failed: '#F44336',
    };
    return colors[status] || '#666';
  };

  const getStatusMessage = (status) => {
    const messages = {
      pending_admin_approval: 'Your order is being reviewed by our team',
      price_calculated: 'Delivery price calculated, awaiting confirmation',
      creating: 'Creating delivery request...',
      new: 'Delivery request created, finding courier',
      available: 'Looking for available courier',
      active: 'Courier assigned and on the way to pickup',
      courier_assigned: 'Courier assigned to your delivery',
      pickup_arrived: 'Courier has arrived at pickup location',
      picked_up: 'Your order has been picked up',
      delivering: 'Your order is on the way!',
      delivered: 'Successfully delivered!',
      cancelled: 'Delivery was cancelled',
      failed: 'Delivery failed, please contact support',
    };
    return messages[status] || 'Processing your delivery...';
  };

  const renderProgressStep = (stepStatus, label, isActive, isCompleted) => {
    return (
      <View style={styles.progressStep}>
        <View style={[
          styles.stepCircle,
          isActive && styles.stepCircleActive,
          isCompleted && styles.stepCircleCompleted,
        ]}>
          {isCompleted ? (
            <Icon name="checkmark" size={20} color="#FFF" />
          ) : (
            <View style={[
              styles.stepDot,
              isActive && styles.stepDotActive,
            ]} />
          )}
        </View>
        <Text style={[
          styles.stepLabel,
          isActive && styles.stepLabelActive,
          isCompleted && styles.stepLabelCompleted,
        ]}>
          {label}
        </Text>
      </View>
    );
  };

  const renderProgressBar = () => {
    if (!deliveryData) return null;

    const status = deliveryData.status;
    const steps = [
      { key: 'new', label: 'Created' },
      { key: 'courier_assigned', label: 'Courier Assigned' },
      { key: 'picked_up', label: 'Picked Up' },
      { key: 'delivering', label: 'Delivering' },
      { key: 'delivered', label: 'Delivered' },
    ];

    const statusOrder = [
      'new', 'available', 'active', 'courier_assigned',
      'pickup_arrived', 'picked_up', 'delivering', 'delivered'
    ];

    const currentIndex = statusOrder.indexOf(status);

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const stepIndex = statusOrder.indexOf(step.key);
          const isCompleted = currentIndex > stepIndex;
          const isActive = currentIndex === stepIndex;

          return (
            <React.Fragment key={step.key}>
              {renderProgressStep(step.key, step.label, isActive, isCompleted)}
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  isCompleted && styles.progressLineCompleted,
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Loading delivery status...</Text>
        </View>
      </SafeAreaView>
    );
  }

if (!deliveryData) {
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
        <Text style={styles.headerTitle}>Delivery Tracking</Text>
      </View>
      <View style={styles.emptyContainer}>
        <Icon name="bicycle-outline" size={80} color="#CCC" />
        <Text style={styles.emptyTitle}>Delivery Not Assigned Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your order is being processed. Tracking information will be available once a delivery partner is assigned.
        </Text>
        <TouchableOpacity
          style={styles.refreshEmptyButton}
          onPress={() => {
            setLoading(true);
            fetchDeliveryStatus();
          }}
        >
          <Icon name="refresh" size={20} color="#FF1493" />
          <Text style={styles.refreshEmptyText}>Check Again</Text>
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
        <Text style={styles.headerTitle}>Delivery Tracking</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={24} color="#FF1493" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order Info */}
        <View style={styles.card}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderValue}>{orderNumber}</Text>
          </View>
          {deliveryData.borzoOrderId && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderLabel}>Tracking ID</Text>
              <Text style={styles.orderValue}>{deliveryData.borzoOrderId}</Text>
            </View>
          )}
        </View>

        {/* Current Status */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <Icon
              name={getStatusIcon(deliveryData.status)}
              size={48}
              color={getStatusColor(deliveryData.status)}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {deliveryData.status?.toUpperCase().replace(/_/g, ' ')}
              </Text>
              <Text style={styles.statusMessage}>
                {getStatusMessage(deliveryData.status)}
              </Text>
            </View>
          </View>

          {deliveryData.estimatedDeliveryTime && (
            <View style={styles.estimatedTime}>
              <Icon name="time-outline" size={20} color="#FF1493" />
              <Text style={styles.estimatedTimeText}>
                Estimated: {new Date(deliveryData.estimatedDeliveryTime).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {!['pending_admin_approval', 'price_calculated', 'cancelled', 'failed'].includes(deliveryData.status) && (
          <View style={styles.card}>
            {renderProgressBar()}
          </View>
        )}

        {/* Courier Info */}
        {deliveryData.courier?.name && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Partner</Text>
            <View style={styles.courierContainer}>
              {deliveryData.courier.photo ? (
                <Image
                  source={{ uri: deliveryData.courier.photo }}
                  style={styles.courierPhoto}
                />
              ) : (
                <View style={styles.courierPhotoPlaceholder}>
                  <Icon name="person" size={32} color="#FFF" />
                </View>
              )}
              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>{deliveryData.courier.name}</Text>
                <Text style={styles.courierPhone}>{deliveryData.courier.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={callCourier}
              >
                <Icon name="call" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Addresses */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Icon name="location" size={20} color="#4CAF50" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Pickup Address</Text>
              <Text style={styles.addressText}>
                {deliveryData.pickupAddress?.address}
              </Text>
            </View>
          </View>

          <View style={styles.addressDivider}>
            <View style={styles.dashedLine} />
          </View>

          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Icon name="location" size={20} color="#FF1493" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>
                {deliveryData.dropAddress?.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing */}
        {deliveryData.pricing?.finalPrice && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Fee</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Distance</Text>
              <Text style={styles.pricingValue}>
                {deliveryData.pricing.distance?.toFixed(2)} km
              </Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Delivery Charge</Text>
              <Text style={styles.pricingValueLarge}>
                ₹{deliveryData.pricing.finalPrice?.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Track Button */}
        {deliveryData.trackingUrl && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={openTrackingUrl}
          >
            <Icon name="map" size={24} color="#FFF" />
            <Text style={styles.trackButtonText}>View Live Map Tracking</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  refreshButton: {
    padding: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF1493',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  estimatedTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF1493',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  stepCircleActive: {
    backgroundColor: '#FFF5F8',
    borderColor: '#FF1493',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CCC',
  },
  stepDotActive: {
    backgroundColor: '#FF1493',
  },
  stepLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    maxWidth: 60,
  },
  stepLabelActive: {
    color: '#FF1493',
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  progressLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  courierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courierPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
  },
  courierPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF1493',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  courierPhone: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  addressDivider: {
    paddingLeft: 20,
    marginVertical: 12,
  },
  dashedLine: {
    height: 30,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  pricingValueLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF1493',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomSpacer: {
    height: 20,
  },
  refreshEmptyButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 20,
  paddingVertical: 12,
  paddingHorizontal: 24,
  backgroundColor: '#FFF5F8',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#FF1493',
},
refreshEmptyText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FF1493',
},
});

export default DeliveryTrackingScreen;