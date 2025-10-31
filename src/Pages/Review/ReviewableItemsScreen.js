// src/Pages/Reviews/ReviewableItemsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const ReviewableItemsScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { tokens } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [items, setItems] = useState([]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens?.accessToken}`
  });

  useEffect(() => {
    fetchReviewableItems();
  }, []);

  const fetchReviewableItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/reviews/order/${orderId}/items`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrderData({
          orderId: data.data.orderId,
          orderNumber: data.data.orderNumber,
        });
        setItems(data.data.items);
      } else {
        Alert.alert('Error', data.message || 'Failed to load items');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Fetch reviewable items error:', error);
      Alert.alert('Error', 'Failed to load items');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleReviewItem = (item) => {
    if (item.reviewed) {
      Alert.alert('Already Reviewed', 'You have already reviewed this item');
      return;
    }
    
    navigation.navigate('WriteReviewScreen', {
      orderId: orderData.orderId,
      item: item,
    });
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'product': return 'bag-outline';
      case 'service': return 'cut-outline';
      case 'professional': return 'person-outline';
      default: return 'help-outline';
    }
  };

  const getItemTypeLabel = (type) => {
    switch (type) {
      case 'product': return 'Product';
      case 'service': return 'Service';
      case 'professional': return 'Professional';
      default: return type;
    }
  };

  const getItemTypeColor = (type) => {
    switch (type) {
      case 'product': return '#54A0FF';
      case 'service': return '#FF6B9D';
      case 'professional': return '#9B59B6';
      default: return '#7F8C8D';
    }
  };

  const renderItem = (item, index) => {
    const typeColor = getItemTypeColor(item.type);

    return (
      <TouchableOpacity
        key={index}
        style={[styles.itemCard, { borderLeftColor: typeColor }]}
        onPress={() => handleReviewItem(item)}
        disabled={item.reviewed}
      >
        <View style={[styles.imageContainer, { borderColor: typeColor }]}>
          {item.type === 'professional' ? (
            <View style={[styles.professionalIcon, { backgroundColor: typeColor + '20' }]}>
              <Icon name="person" size={32} color={typeColor} />
            </View>
          ) : (
            <Image 
              source={{ uri: item.image || 'https://via.placeholder.com/80x80' }}
              style={styles.itemImage}
            />
          )}
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          {item.serviceName && (
            <Text style={styles.serviceName} numberOfLines={1}>
              Service: {item.serviceName}
            </Text>
          )}
          {item.price && <Text style={styles.itemPrice}>₹{item.price}</Text>}
          
          <View style={styles.itemFooter}>
            <View style={[styles.itemTypeBadge, { backgroundColor: typeColor + '20' }]}>
              <Icon 
                name={getItemIcon(item.type)} 
                size={12} 
                color={typeColor} 
              />
              <Text style={[styles.itemTypeText, { color: typeColor }]}>
                {getItemTypeLabel(item.type)}
              </Text>
            </View>
            
            {item.reviewed && (
              <View style={styles.reviewedBadge}>
                <Icon name="checkmark-circle" size={14} color="#2ECC71" />
                <Text style={styles.reviewedText}>Reviewed</Text>
              </View>
            )}
          </View>
        </View>
        
        {!item.reviewed && (
          <TouchableOpacity 
            style={[styles.reviewButton, { backgroundColor: typeColor + '20' }]}
            onPress={() => handleReviewItem(item)}
          >
            <Icon name="create-outline" size={20} color={typeColor} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreviewedItems = items.filter(item => !item.reviewed);
  const reviewedItems = items.filter(item => item.reviewed);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Rate Your Order</Text>
          {orderData && (
            <Text style={styles.orderNumber}>Order #{orderData.orderNumber}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {unreviewedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items to Review</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{unreviewedItems.length}</Text>
              </View>
            </View>
            {unreviewedItems.map((item, index) => renderItem(item, `unreviewed-${index}`))}
          </View>
        )}

        {reviewedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Already Reviewed</Text>
              <View style={[styles.countBadge, styles.reviewedCountBadge]}>
                <Text style={styles.countText}>{reviewedItems.length}</Text>
              </View>
            </View>
            {reviewedItems.map((item, index) => renderItem(item, `reviewed-${index}`))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Items to Review</Text>
            <Text style={styles.emptySubtitle}>
              This order doesn't have any reviewable items
            </Text>
          </View>
        )}

        {unreviewedItems.length === 0 && reviewedItems.length > 0 && (
          <View style={styles.completedCard}>
            <Icon name="checkmark-circle" size={48} color="#2ECC71" />
            <Text style={styles.completedTitle}>All Done! 🎉</Text>
            <Text style={styles.completedText}>
              Thank you for reviewing all items in this order
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  orderNumber: {
    fontSize: 12,
    color: '#FF6B9D',
    marginTop: 2,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  countBadge: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  reviewedCountBadge: {
    backgroundColor: '#2ECC71',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  professionalIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  itemTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reviewedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2ECC71',
  },
  reviewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  completedCard: {
    backgroundColor: '#E8F8F5',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginTop: 15,
    marginBottom: 10,
  },
  completedText: {
    fontSize: 15,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ReviewableItemsScreen;