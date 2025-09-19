import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const { width, height } = Dimensions.get('window');

const ProfilePage = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  
  const [cartItemCount, setCartItemCount] = useState(3);
  const [activeBookingsCount, setActiveBookingsCount] = useState(2);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSaveProfile = async () => {
    try {
      // In a real app, you would make an API call here
      await updateUser({ name: editedName, email: editedEmail });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const ProfileOption = ({ icon, title, subtitle, onPress, showBadge, badgeCount, color = '#FF6B9D' }) => (
    <TouchableOpacity style={styles.profileOption} onPress={onPress}>
      <View style={[styles.optionIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
        {showBadge && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-forward" size={16} color="#C0C0C0" />
    </TouchableOpacity>
  );

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isEditModalVisible}
      onRequestClose={() => setIsEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={() => setIsEditModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                placeholderTextColor="#B8B8B8"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="Enter your email"
                placeholderTextColor="#B8B8B8"
                keyboardType="email-address"
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header/>      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
<View style={styles.profileImageContainer}>
  {user?.avatar || true ? ( 
    <Image
      source={{
        uri:
          user?.avatar ||
          "https://i.pinimg.com/736x/5d/39/8c/5d398c0400bd3ea6d05463e28889684c.jpg",
      }}
      style={styles.profileImage}
    />
  ) : (
    <View style={styles.profilePlaceholder}>
      <Text style={styles.profileInitials}>{getInitials(user?.name)}</Text>
    </View>
  )}
  <TouchableOpacity style={styles.editImageButton}>
    <Icon name="camera" size={14} color="#fff" />
  </TouchableOpacity>
</View>

          
          <Text style={styles.profileName}>{user?.name || 'Beautiful User'}</Text>
        </Animated.View>

        {/* Account Section */}
        <Animated.View 
          style={[
            styles.optionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          
          <ProfileOption
            icon="calendar-outline"
            title="Booking History"
            onPress={() => navigation.navigate('MyBookings')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="bag-outline"
            title="Purchased Products"
            onPress={() => navigation.navigate('MyOrders')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="settings-outline"
            title="Settings"
            onPress={() => navigation.navigate('Settings')}
            color="#FF6B9D"
          />

          {/* Wallet Section */}
          <Text style={styles.sectionTitle}>Wallet</Text>
          
          <ProfileOption
            icon="wallet-outline"
            title="Wallet"
            onPress={() => navigation.navigate('Wallet')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="gift-outline"
            title="Rewards"
            onPress={() => navigation.navigate('Rewards')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="trophy-outline"
            title="Loyalty Points"
            onPress={() => navigation.navigate('LoyaltyPoints')}
            color="#FF6B9D"
          />

          {/* Quick Access Section */}
          <Text style={styles.sectionTitle}>Quick Access</Text>
          
          <ProfileOption
            icon="cart-outline"
            title="My Cart"
            subtitle={`${cartItemCount} items in your cart`}
            onPress={() => navigation.navigate('ViewCart')}
            showBadge={true}
            badgeCount={cartItemCount}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="notifications-outline"
            title="Notifications"
            subtitle="View your notifications"
            onPress={() => navigation.navigate('Notifications')}
            color="#FF6B9D"
          />

          {/* Admin Access Section */}
          <Text style={styles.sectionTitle}>Admin Access</Text>
          
          <ProfileOption
            icon="cloud-upload-outline"
            title="Admin Upload"
            subtitle="Upload admin content"
            onPress={() => navigation.navigate('AdminUpload')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="bag-add-outline"
            title="Product Upload"
            subtitle="Add new products"
            onPress={() => navigation.navigate('ProductUploadScreen')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="image-outline"
            title="Media Upload"
            subtitle="Upload media files"
            onPress={() => navigation.navigate('MediaUploadScreen')}
            color="#FF6B9D"
          />

          <ProfileOption
            icon="settings-outline"
            title="Booking Management"
            subtitle="Manage all bookings"
            onPress={() => navigation.navigate('BookingManagement')}
            color="#FF6B9D"
          />

          {/* Personal Section */}
          <Text style={styles.sectionTitle}>Personal</Text>
          
          <ProfileOption
            icon="heart-outline"
            title="My Wishlist"
            subtitle="View your saved items"
            onPress={() => navigation.navigate('Wishlist')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="location-outline"
            title="Saved Addresses"
            subtitle="Manage your addresses"
            onPress={() => navigation.navigate('SavedAddresses')}
            color="#FF6B9D"
          />

          {/* Support Section */}
          <Text style={styles.sectionTitle}>Support & Info</Text>
          
          <ProfileOption
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get support & answers"
            onPress={() => navigation.navigate('HelpCenter')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="information-circle-outline"
            title="About Us"
            subtitle="Learn more about our story"
            onPress={() => navigation.navigate('AboutUs')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="star-outline"
            title="Rate Us"
            subtitle="Share your experience"
            onPress={() => navigation.navigate('RateUs')}
            color="#FF6B9D"
          />

          {/* Legal Section */}
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <ProfileOption
            icon="document-text-outline"
            title="Terms & Conditions"
            subtitle="Read our terms"
            onPress={() => navigation.navigate('Terms')}
            color="#FF6B9D"
          />
          
          <ProfileOption
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="Your privacy matters"
            onPress={() => navigation.navigate('Privacy')}
            color="#FF6B9D"
          />

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="log-out-outline" size={20} color="#FF6B9D" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {renderEditModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 30,
    marginTop: 0,
    alignItems: 'center',
    marginHorizontal: -20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8D5B7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B9D',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  goldTierContainer: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goldTierText: {
    color: '#B8860B',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 25,
  },
  profileOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#999',
  },

  // Logout Button
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  logoutText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width - 40,
    maxHeight: height * 0.8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 5,
  },
  editForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#F8F8F8',
  },
  saveButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomSpacer: {
    height: 50,
  },
});

export default ProfilePage;