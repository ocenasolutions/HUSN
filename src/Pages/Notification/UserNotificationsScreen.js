// src/Pages/Notifications/UserNotificationsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'your-api-url/api';

const UserNotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/push-notifications/user`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter === 'unread' ? { isRead: false } : {}
      });

      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [filter]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/push-notifications/user/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/push-notifications/user/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Success', 'All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      console.error('Mark all as read error:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read and track click
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/push-notifications/user/${notification._id}/click`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Track click error:', error);
    }

    // Navigate based on notification type and deep link
    if (notification.deepLink) {
      const { screen, params } = notification.deepLink;
      if (screen) {
        navigation.navigate(screen, params);
        return;
      }
    }

    // Default navigation based on type
    switch (notification.type) {
      case 'offer':
        navigation.navigate('Offers');
        break;
      case 'product':
        navigation.navigate('Product');
        break;
      case 'service':
        navigation.navigate('Services');
        break;
      case 'salon':
        navigation.navigate('Salons');
        break;
      default:
        break;
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(
                `${API_URL}/push-notifications/user/${notificationId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              setNotifications(prev => prev.filter(n => n._id !== notificationId));
            } catch (error) {
              console.error('Delete notification error:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const getTypeConfig = (type) => {
    const configs = {
      offer: { icon: 'pricetag', color: '#FF6B9D', bg: '#FFE5EE' },
      product: { icon: 'cube', color: '#9B59B6', bg: '#F4E8FF' },
      service: { icon: 'construct', color: '#3498DB', bg: '#E3F2FD' },
      salon: { icon: 'cut', color: '#E74C3C', bg: '#FFEBEE' },
      general: { icon: 'notifications', color: '#95A5A6', bg: '#F5F5F5' },
      announcement: { icon: 'megaphone', color: '#F39C12', bg: '#FFF3E0' }
    };
    return configs[type] || configs.general;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderNotification = ({ item }) => {
    const typeConfig = getTypeConfig(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard
        ]}
        onPress={() => handleNotificationClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeConfig.bg }]}>
            <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
          </View>

          {/* Content */}
          <View style={styles.textContent}>
            <View style={styles.headerRow}>
              <Text style={styles.notificationTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            
            <Text style={styles.notificationBody} numberOfLines={3}>
              {item.body}
            </Text>

            {item.image && (
              <Image source={{ uri: item.image }} style={styles.notificationImage} />
            )}

            <View style={styles.footer}>
              <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(item._id);
                }}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={16} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color="#FF6B9D" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.filterText, filter === 'all' && styles.activeFilterText]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}
          >
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B9D']}
            tintColor="#FF6B9D"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={filter === 'unread' ? 'checkmark-done-circle' : 'notifications-off'}
              size={80}
              color="#BDC3C7"
            />
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread'
                ? "You've read all your notifications"
                : "We'll notify you when something new arrives"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
    marginLeft: 15
  },
  markAllButton: {
    padding: 8
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1'
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA'
  },
  activeFilterTab: {
    backgroundColor: '#FF6B9D'
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D'
  },
  activeFilterText: {
    color: '#FFF'
  },
  badge: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B9D'
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30
  },
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D'
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 15
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContent: {
    flex: 1
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    lineHeight: 22
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
    marginLeft: 8,
    marginTop: 7
  },
  notificationBody: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 8
  },
  notificationImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  timeText: {
    fontSize: 12,
    color: '#95A5A6',
    fontWeight: '500'
  },
  deleteButton: {
    padding: 4
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20
  }
});

export default UserNotificationsScreen;