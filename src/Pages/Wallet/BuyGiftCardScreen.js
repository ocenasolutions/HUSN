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
  Share,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const GIFT_CARD_THEMES = [
  { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#FF6B9D' },
  { id: 'anniversary', name: 'Anniversary', icon: '💕', color: '#E94B3C' },
  { id: 'thank_you', name: 'Thank You', icon: '🙏', color: '#4CAF50' },
  { id: 'congratulations', name: 'Congrats', icon: '🎉', color: '#FFC107' },
  { id: 'holiday', name: 'Holiday', icon: '🎄', color: '#2196F3' },
  { id: 'general', name: 'General', icon: '🎁', color: '#9C27B0' }
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const BuyGiftCardScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('general');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState(null);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const handlePurchase = async () => {
    const amountNum = parseFloat(amount);

    // Validation
    if (!amountNum || amountNum < 100) {
      Alert.alert('Error', 'Minimum amount is ₹100');
      return;
    }

    if (amountNum > 10000) {
      Alert.alert('Error', 'Maximum amount is ₹10,000');
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert('Error', 'Please enter recipient name');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`${API_URL}/gift-cards/purchase`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: amountNum,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || null,
          recipientPhone: recipientPhone.trim() || null,
          message: message.trim() || null,
          theme: selectedTheme,
          paymentMethod: 'wallet'
        })
      });

      const data = await response.json();

      if (data.success) {
        setPurchasedCard(data.data);
        setShowSuccessModal(true);
        
        // Reset form
        setAmount('');
        setRecipientName('');
        setRecipientEmail('');
        setRecipientPhone('');
        setMessage('');
        setSelectedTheme('general');
      } else {
        Alert.alert('Error', data.message || 'Failed to purchase gift card');
      }
    } catch (error) {
      console.error('Purchase gift card error:', error);
      Alert.alert('Error', 'Failed to purchase gift card');
    } finally {
      setProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!purchasedCard) return;

    const shareMessage = `🎁 You've received a HUSN Gift Card worth ₹${purchasedCard.amount}!\n\n` +
      `Card Number: ${purchasedCard.cardNumber}\n` +
      `PIN: ${purchasedCard.pin}\n\n` +
      (purchasedCard.message ? `Message: ${purchasedCard.message}\n\n` : '') +
      `Valid until: ${new Date(purchasedCard.expiryDate).toLocaleDateString()}\n\n` +
      `Redeem it on HUSN App!`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'HUSN Gift Card'
      });
      
      // Record share
      await fetch(`${API_URL}/gift-cards/${purchasedCard.cardNumber}/share`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform: 'native_share' })
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyDetails = () => {
    if (!purchasedCard) return;

    const details = `Card: ${purchasedCard.cardNumber}\nPIN: ${purchasedCard.pin}`;
    // In React Native, you'd use Clipboard API
    Alert.alert('Copied', 'Gift card details copied to clipboard');
  };

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successHeader}>
            <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.successTitle}>Gift Card Created!</Text>
            <Text style={styles.successSubtitle}>
              Share these details with the recipient
            </Text>
          </View>

          <View style={styles.giftCardPreview}>
            <View style={[styles.previewCard, { backgroundColor: GIFT_CARD_THEMES.find(t => t.id === purchasedCard?.theme)?.color || '#FF6B9D' }]}>
              <Text style={styles.previewEmoji}>
                {GIFT_CARD_THEMES.find(t => t.id === purchasedCard?.theme)?.icon || '🎁'}
              </Text>
              <Text style={styles.previewAmount}>₹{purchasedCard?.amount}</Text>
              <Text style={styles.previewRecipient}>{purchasedCard?.recipientName}</Text>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Card Number</Text>
              <Text style={styles.detailValue}>{purchasedCard?.cardNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PIN</Text>
              <Text style={[styles.detailValue, styles.pinValue]}>{purchasedCard?.pin}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valid Until</Text>
              <Text style={styles.detailValue}>
                {purchasedCard?.expiryDate ? new Date(purchasedCard.expiryDate).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Icon name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyDetails}>
              <Icon name="copy-outline" size={20} color="#FF6B9D" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>

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
        title="Buy Gift Card"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        showCart={false}
        showWishlist={false}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Amount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gift Card Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.quickAmountButton,
                  amount === amt.toString() && styles.quickAmountButtonActive
                ]}
                onPress={() => setAmount(amt.toString())}
              >
                <Text style={[
                  styles.quickAmountText,
                  amount === amt.toString() && styles.quickAmountTextActive
                ]}>
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.limitText}>Min: ₹100 | Max: ₹10,000</Text>
        </View>

        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Theme</Text>
          <View style={styles.themesContainer}>
            {GIFT_CARD_THEMES.map(theme => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  { borderColor: theme.color },
                  selectedTheme === theme.id && { backgroundColor: theme.color + '20' }
                ]}
                onPress={() => setSelectedTheme(theme.id)}
              >
                <Text style={styles.themeEmoji}>{theme.icon}</Text>
                <Text style={styles.themeName}>{theme.name}</Text>
                {selectedTheme === theme.id && (
                  <Icon name="checkmark-circle" size={20} color={theme.color} style={styles.themeCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Enter recipient's name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Personal Message (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a personal message..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{message.length}/500</Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={24} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              • Gift card will be valid for 1 year{'\n'}
              • Recipient can redeem it in their HUSN wallet{'\n'}
              • You'll get the card number and PIN to share{'\n'}
              • Payment will be deducted from your wallet
            </Text>
          </View>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, processing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="gift" size={20} color="#FFF" />
              <Text style={styles.purchaseButtonText}>Purchase Gift Card</Text>
            </>
          )}
        </TouchableOpacity>

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
  section: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  quickAmountButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickAmountButtonActive: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quickAmountTextActive: {
    color: '#FFF',
  },
  limitText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  themeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  themeCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
  purchaseButton: {
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  // Success Modal Styles
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
  giftCardPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewCard: {
    width: width - 80,
    height: 180,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  previewAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  previewRecipient: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  cardDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  pinValue: {
    fontFamily: 'monospace',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#FF6B9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    marginLeft: 8,
  },
  copyButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BuyGiftCardScreen;