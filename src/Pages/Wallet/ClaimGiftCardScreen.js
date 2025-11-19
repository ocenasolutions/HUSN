import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const ClaimGiftCardScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const insets = useSafeAreaInsets();

  const [cardNumber, setCardNumber] = useState('');
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  
  // Verification state
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedCardDetails, setVerifiedCardDetails] = useState(null);
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [claimedDetails, setClaimedDetails] = useState(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const formatCardNumber = (text) => {
    // Remove all non-alphanumeric characters
    const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Add hyphens every 4 characters
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substring(i, i + 4));
    }
    
    return parts.join('-');
  };

  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
    setIsVerified(false); // Reset verification when card number changes
  };

  const handleVerifyCard = async () => {
    if (!cardNumber.trim()) {
      Alert.alert('Error', 'Please enter card number');
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch(`${API_URL}/gift-cards/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ cardNumber: cardNumber.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setIsVerified(true);
        setVerifiedCardDetails(data.data);
        Alert.alert('Success', 'Gift card is valid! Now enter the PIN to claim.');
      } else {
        Alert.alert('Invalid Card', data.message || 'This gift card is not valid');
        setIsVerified(false);
        setVerifiedCardDetails(null);
      }
    } catch (error) {
      console.error('Verify card error:', error);
      Alert.alert('Error', 'Failed to verify gift card');
    } finally {
      setVerifying(false);
    }
  };

  const handleClaimCard = async () => {
    if (!cardNumber.trim()) {
      Alert.alert('Error', 'Please enter card number');
      return;
    }

    if (!pin.trim()) {
      Alert.alert('Error', 'Please enter PIN');
      return;
    }

    if (pin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }

    setClaiming(true);

    try {
      const response = await fetch(`${API_URL}/gift-cards/claim`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cardNumber: cardNumber.trim(),
          pin: pin.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setClaimedDetails(data.data);
        setShowSuccessModal(true);
        
        // Reset form
        setCardNumber('');
        setPin('');
        setIsVerified(false);
        setVerifiedCardDetails(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to claim gift card');
      }
    } catch (error) {
      console.error('Claim card error:', error);
      Alert.alert('Error', 'Failed to claim gift card');
    } finally {
      setClaiming(false);
    }
  };

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowSuccessModal(false);
        navigation.navigate('Wallet');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successHeader}>
            <Icon name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.successTitle}>Gift Card Claimed!</Text>
            <Text style={styles.successSubtitle}>
              Money has been added to your wallet
            </Text>
          </View>

          <View style={styles.claimedDetailsContainer}>
            <View style={styles.amountCircle}>
              <Text style={styles.claimedAmount}>₹{claimedDetails?.amount}</Text>
              <Text style={styles.claimedLabel}>Added to Wallet</Text>
            </View>

            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>New Balance</Text>
                <Text style={styles.detailValue}>₹{claimedDetails?.newBalance?.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Card Number</Text>
                <Text style={styles.detailValue}>{claimedDetails?.cardNumber}</Text>
              </View>
              {claimedDetails?.message && (
                <View style={styles.messageBox}>
                  <Icon name="mail-outline" size={16} color="#666" />
                  <Text style={styles.messageText}>{claimedDetails.message}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewWalletButton}
            onPress={() => {
              setShowSuccessModal(false);
              navigation.navigate('Wallet');
            }}
          >
            <Icon name="wallet" size={20} color="#FFF" />
            <Text style={styles.viewWalletButtonText}>View Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setShowSuccessModal(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Claim Gift Card"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        showCart={false}
        showWishlist={false}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Icon name="gift" size={40} color="#FF6B9D" />
          <Text style={styles.instructionsTitle}>Have a Gift Card?</Text>
          <Text style={styles.instructionsText}>
            Enter the card number and PIN to add the amount to your HUSN wallet
          </Text>
        </View>

        {/* Card Number Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Number</Text>
          <View style={styles.inputContainer}>
            <Icon name="card-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              placeholder="HUSN-XXXX-XXXX-XXXX"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={19} // HUSN-XXXX-XXXX-XXXX
            />
          </View>

          {!isVerified && cardNumber.length >= 19 && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyCard}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#FF6B9D" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={20} color="#FF6B9D" />
                  <Text style={styles.verifyButtonText}>Verify Card</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Verified Card Details */}
        {isVerified && verifiedCardDetails && (
          <View style={styles.verifiedBox}>
            <View style={styles.verifiedHeader}>
              <Icon name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.verifiedTitle}>Card Verified!</Text>
            </View>
            <View style={styles.verifiedDetails}>
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedLabel}>Amount:</Text>
                <Text style={styles.verifiedValue}>₹{verifiedCardDetails.amount}</Text>
              </View>
              {verifiedCardDetails.message && (
                <View style={styles.verifiedMessage}>
                  <Icon name="chatbox-outline" size={16} color="#666" />
                  <Text style={styles.verifiedMessageText}>{verifiedCardDetails.message}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PIN Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6-Digit PIN</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter 6-digit PIN"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
            />
          </View>
          <Text style={styles.helpText}>
            The PIN was provided with the gift card
          </Text>
        </View>

        {/* Security Info */}
        <View style={styles.securityBox}>
          <Icon name="shield-checkmark-outline" size={24} color="#4CAF50" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Secure & Protected</Text>
            <Text style={styles.securityText}>
              Your gift card details are encrypted and secure. Once claimed, the amount will be instantly added to your wallet.
            </Text>
          </View>
        </View>

        {/* Claim Button */}
        <TouchableOpacity
          style={[
            styles.claimButton,
            (!isVerified || !pin || claiming) && styles.claimButtonDisabled
          ]}
          onPress={handleClaimCard}
          disabled={!isVerified || !pin || claiming}
        >
          {claiming ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="wallet" size={20} color="#FFF" />
              <Text style={styles.claimButtonText}>Claim to Wallet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpItem}>
            <Icon name="help-circle-outline" size={20} color="#FF6B9D" />
            <Text style={styles.helpItemText}>Where do I find my card number?</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Icon name="help-circle-outline" size={20} color="#FF6B9D" />
            <Text style={styles.helpItemText}>What if my PIN doesn't work?</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Icon name="help-circle-outline" size={20} color="#FF6B9D" />
            <Text style={styles.helpItemText}>Gift card expired or invalid?</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {renderSuccessModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  verifyButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  verifiedBox: {
    backgroundColor: '#E8F5E9',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  verifiedDetails: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  verifiedLabel: {
    fontSize: 14,
    color: '#666',
  },
  verifiedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  verifiedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  verifiedMessageText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  securityBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
  claimButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpSection: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  helpItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 20,
  },
  // Success Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  claimedDetailsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  claimedAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  claimedLabel: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  viewWalletButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  viewWalletButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doneButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClaimGiftCardScreen;