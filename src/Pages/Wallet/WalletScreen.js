import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const WalletScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(null); // null means T&C not accepted

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Check if terms have been accepted on mount
  useEffect(() => {
    checkTermsAcceptance();
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const accepted = await AsyncStorage.getItem('wallet_terms_accepted');
      if (accepted === 'true') {
        setTermsAccepted(true);
        setSelectedFilter('all'); // Auto-select 'all' after terms accepted
      } else {
        setShowTermsModal(true);
      }
    } catch (error) {
      console.error('Error checking terms:', error);
    }
  };

  const acceptTerms = async () => {
    try {
      await AsyncStorage.setItem('wallet_terms_accepted', 'true');
      setTermsAccepted(true);
      setSelectedFilter('all');
      setShowTermsModal(false);
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
    }
  };

  const fetchWalletData = async () => {
    try {
      const response = await fetch(`${API_URL}/wallet`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setWallet(data.data);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchTransactions = async (pageNum = 1, append = false) => {
    try {
      const response = await fetch(`${API_URL}/wallet/transactions?page=${pageNum}&limit=20`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          setTransactions(prev => [...prev, ...data.data.transactions]);
        } else {
          setTransactions(data.data.transactions);
        }
        setHasMore(data.data.pagination.page < data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchWalletData(), fetchTransactions(1, false)]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (termsAccepted && selectedFilter) {
      filterTransactions();
    }
  }, [transactions, selectedFilter, termsAccepted]);

  const filterTransactions = () => {
    if (selectedFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.type === selectedFilter));
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleFilterSelect = (filter) => {
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }
    setSelectedFilter(filter);
  };

  const handleAddMoney = async () => {
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    const amount = parseFloat(addAmount);
    
    if (!amount || amount < 10) {
      Alert.alert('Error', 'Minimum amount is ₹10');
      return;
    }

    if (amount > 50000) {
      Alert.alert('Error', 'Maximum amount is ₹50,000');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`${API_URL}/wallet/add-money`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount,
          paymentMethod: 'UPI',
          transactionId: `TXN${Date.now()}`
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Money added successfully!');
        setShowAddMoneyModal(false);
        setAddAmount('');
        await loadData();
      } else {
        Alert.alert('Error', data.message || 'Failed to add money');
      }
    } catch (error) {
      console.error('Add money error:', error);
      Alert.alert('Error', 'Failed to add money');
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return { name: 'arrow-down-circle', color: '#27AE60' };
      case 'refund':
        return { name: 'refresh-circle', color: '#3498DB' };
      case 'debit':
        return { name: 'arrow-up-circle', color: '#E74C3C' };
      default:
        return { name: 'swap-horizontal', color: '#666' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const calculateAmountByType = (type) => {
    return transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
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
      <Header
        title="HUSN Wallet"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        showCart={false}
        showWishlist={false}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B9D']} />
        }
      >
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Icon name="wallet" size={24} color="#FFF" />
            <Text style={styles.walletLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
          <View style={styles.walletInfo}>
            <View style={styles.walletInfoItem}>
              <Text style={styles.walletInfoLabel}>Wallet ID</Text>
              <Text style={styles.walletInfoValue}>{wallet?.walletAddress}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addMoneyButton}
            onPress={() => {
              if (!termsAccepted) {
                setShowTermsModal(true);
              } else {
                setShowAddMoneyModal(true);
              }
            }}
          >
            <Icon name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addMoneyButtonText}>Add Money</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.termsLink}
            onPress={() => setShowTermsModal(true)}
          >
            <Icon name="document-text-outline" size={14} color="#FFF" />
            <Text style={styles.termsLinkText}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Type Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="arrow-down-circle" size={24} color="#27AE60" />
            <Text style={styles.statValue}>₹{calculateAmountByType('credit').toFixed(2)}</Text>
            <Text style={styles.statLabel}>Credited</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="arrow-up-circle" size={24} color="#E74C3C" />
            <Text style={styles.statValue}>₹{calculateAmountByType('debit').toFixed(2)}</Text>
            <Text style={styles.statLabel}>Debited</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="refresh-circle" size={24} color="#3498DB" />
            <Text style={styles.statValue}>₹{calculateAmountByType('refund').toFixed(2)}</Text>
            <Text style={styles.statLabel}>Refunded</Text>
          </View>
        </View>

        {/* Transaction Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => handleFilterSelect('all')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                All
              </Text>
              {selectedFilter === 'all' && <Icon name="checkmark-circle" size={16} color="#FFF" style={styles.filterCheckIcon} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'credit' && styles.filterButtonActive]}
              onPress={() => handleFilterSelect('credit')}
            >
              <Icon name="arrow-down-circle" size={16} color={selectedFilter === 'credit' ? '#FFF' : '#27AE60'} />
              <Text style={[styles.filterButtonText, selectedFilter === 'credit' && styles.filterButtonTextActive]}>
                Credited
              </Text>
              {selectedFilter === 'credit' && <Icon name="checkmark-circle" size={16} color="#FFF" style={styles.filterCheckIcon} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'debit' && styles.filterButtonActive]}
              onPress={() => handleFilterSelect('debit')}
            >
              <Icon name="arrow-up-circle" size={16} color={selectedFilter === 'debit' ? '#FFF' : '#E74C3C'} />
              <Text style={[styles.filterButtonText, selectedFilter === 'debit' && styles.filterButtonTextActive]}>
                Debited
              </Text>
              {selectedFilter === 'debit' && <Icon name="checkmark-circle" size={16} color="#FFF" style={styles.filterCheckIcon} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'refund' && styles.filterButtonActive]}
              onPress={() => handleFilterSelect('refund')}
            >
              <Icon name="refresh-circle" size={16} color={selectedFilter === 'refund' ? '#FFF' : '#3498DB'} />
              <Text style={[styles.filterButtonText, selectedFilter === 'refund' && styles.filterButtonTextActive]}>
                Refunded
              </Text>
              {selectedFilter === 'refund' && <Icon name="checkmark-circle" size={16} color="#FFF" style={styles.filterCheckIcon} />}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Transactions Section */}
        {!termsAccepted || !selectedFilter ? (
          // Show T&C prompt when not accepted
          <View style={styles.transactionsSection}>
            <View style={styles.tocPrompt}>
              <Icon name="lock-closed" size={48} color="#FF6B9D" />
              <Text style={styles.tocPromptTitle}>Accept Terms & Conditions</Text>
              <Text style={styles.tocPromptText}>
                Please read and accept our wallet terms and conditions to view your transaction history and use wallet features.
              </Text>
              <TouchableOpacity 
                style={styles.tocPromptButton}
                onPress={() => setShowTermsModal(true)}
              >
                <Icon name="document-text" size={20} color="#FFF" />
                <Text style={styles.tocPromptButtonText}>Read Terms & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Show transactions after T&C accepted
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>
              {selectedFilter === 'all' ? 'Transaction History' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Transactions`}
            </Text>
            
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="receipt-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  {selectedFilter === 'all' ? 'No transactions yet' : `No ${selectedFilter} transactions`}
                </Text>
              </View>
            ) : (
              filteredTransactions.map((transaction, index) => {
                const icon = getTransactionIcon(transaction.type);
                return (
                  <View key={transaction._id || index} style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      <View style={[styles.transactionIconContainer, { backgroundColor: icon.color + '20' }]}>
                        <Icon name={icon.name} size={24} color={icon.color} />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription}>{transaction.description}</Text>
                        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'debit' ? '#E74C3C' : transaction.type === 'refund' ? '#3498DB' : '#27AE60' }
                    ]}>
                      {transaction.type === 'debit' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => termsAccepted && setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wallet Terms & Conditions</Text>
              {termsAccepted && (
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.termsScroll}>
              <View style={styles.termsContent}>
                <View style={styles.termsSection}>
                  <Icon name="wallet-outline" size={24} color="#FF6B9D" />
                  <Text style={styles.termsSectionTitle}>Wallet Usage</Text>
                  <Text style={styles.termsText}>
                    • Money added to HUSN Wallet can only be used for purchasing products and services within the HUSN app.{'\n\n'}
                    • Wallet balance cannot be transferred to bank accounts or used outside the app.{'\n\n'}
                    • All transactions are secure and encrypted.
                  </Text>
                </View>

                <View style={styles.termsSection}>
                  <Icon name="cash-outline" size={24} color="#FF6B9D" />
                  <Text style={styles.termsSectionTitle}>Refunds & Credits</Text>
                  <Text style={styles.termsText}>
                    • Refunds for cancelled orders will be credited back to your wallet within 5-7 business days.{'\n\n'}
                    • Wallet credits from promotions are non-refundable and non-transferable.{'\n\n'}
                    • Refunded amounts can be used for future purchases.
                  </Text>
                </View>

                <View style={styles.termsSection}>
                  <Icon name="shield-checkmark-outline" size={24} color="#FF6B9D" />
                  <Text style={styles.termsSectionTitle}>Security & Validity</Text>
                  <Text style={styles.termsText}>
                    • Your wallet is protected with secure authentication.{'\n\n'}
                    • Wallet balance does not expire and remains valid indefinitely.{'\n\n'}
                    • Keep your account credentials secure. HUSN is not responsible for unauthorized transactions.
                  </Text>
                </View>

                <View style={styles.termsSection}>
                  <Icon name="information-circle-outline" size={24} color="#FF6B9D" />
                  <Text style={styles.termsSectionTitle}>Important Information</Text>
                  <Text style={styles.termsText}>
                    • Minimum add money amount: ₹10{'\n\n'}
                    • Maximum add money amount: ₹50,000 per transaction{'\n\n'}
                    • HUSN reserves the right to modify these terms at any time.{'\n\n'}
                    • By using the wallet, you agree to these terms and conditions.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {!termsAccepted ? (
              <View style={styles.termsActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={acceptTerms}
                >
                  <Icon name="checkmark-circle" size={20} color="#FFF" style={styles.acceptButtonIcon} />
                  <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.termsActions}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowTermsModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Money Modal */}
      <Modal
        visible={showAddMoneyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddMoneyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setShowAddMoneyModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Enter Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={addAmount}
                  onChangeText={setAddAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.quickAmounts}>
                {[100, 500, 1000, 2000, 5000].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setAddAmount(amount.toString())}
                  >
                    <Text style={styles.quickAmountText}>₹{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.walletNotice}>
                <Icon name="information-circle" size={20} color="#3498DB" />
                <Text style={styles.walletNoticeText}>
                  Money can only be used within the app for products and services
                </Text>
              </View>

              <Text style={styles.modalNote}>
                • Minimum: ₹10{'\n'}
                • Maximum: ₹50,000
              </Text>

              <TouchableOpacity
                style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
                onPress={handleAddMoney}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  walletCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#667eea',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.9,
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  walletInfo: {
    marginBottom: 16,
  },
  walletInfoItem: {
    marginBottom: 4,
  },
  walletInfoLabel: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.8,
  },
  walletInfoValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  addMoneyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  termsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  termsLinkText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.9,
    textDecorationLine: 'underline',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  filterCheckIcon: {
    marginLeft: 4,
  },
  transactionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  tocPrompt: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  tocPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  tocPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  tocPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tocPromptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  quickAmountButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  walletNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  walletNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 18,
  },
  modalNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsScroll: {
    maxHeight: 400,
  },
  termsContent: {
    padding: 20,
  },
  termsSection: {
    marginBottom: 24,
  },
  termsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  termsActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B9D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonIcon: {
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletScreen