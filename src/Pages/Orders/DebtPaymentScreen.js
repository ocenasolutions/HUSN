// Create a new screen: DebtPaymentScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const DebtPaymentScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [debtInfo, setDebtInfo] = useState(null);
  const [paying, setPaying] = useState(false);

  const getAuthHeaders = () => {
    const token = tokens?.accessToken || user?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    fetchDebtStatus();
  }, []);

  const fetchDebtStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/wallet/debt-status`, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDebtInfo(data);
      }
    } catch (error) {
      console.error('Error fetching debt status:', error);
      Alert.alert('Error', 'Failed to load debt information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebt = async () => {
    Alert.alert(
      'Clear Debt',
      `Pay ₹${debtInfo.debtAmount.toFixed(2)} to clear your cancellation penalty?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setPaying(true);
            try {
              const response = await fetch(`${API_URL}/wallet/pay-debt`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  amount: debtInfo.debtAmount,
                  paymentMethod: 'online',
                  transactionId: `TXN${Date.now()}`
                })
              });
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert(
                  'Success',
                  'Debt cleared successfully! You can now book services.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert('Error', data.message || 'Payment failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Payment processing failed');
            } finally {
              setPaying(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  if (!debtInfo?.hasDebt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Outstanding Debt</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.noDebtContainer}>
          <Icon name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.noDebtTitle}>No Outstanding Debt</Text>
          <Text style={styles.noDebtText}>
            You're all clear! You can book services anytime.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outstanding Debt</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <Icon name="warning" size={60} color="#FF6B9D" />
          <Text style={styles.warningTitle}>Cancellation Penalty Due</Text>
          <Text style={styles.warningText}>
            You have an outstanding cancellation fee that must be cleared before booking new services.
          </Text>
        </View>

        <View style={styles.debtCard}>
          <Text style={styles.debtLabel}>Amount Due</Text>
          <Text style={styles.debtAmount}>₹{debtInfo.debtAmount.toFixed(2)}</Text>
          <View style={styles.debtInfo}>
            <Icon name="information-circle" size={20} color="#7F8C8D" />
            <Text style={styles.debtInfoText}>
              This penalty was charged for cancelling a service within 2 hours of the scheduled time.
            </Text>
          </View>
        </View>

        <View style={styles.restrictionCard}>
          <View style={styles.restrictionHeader}>
            <Icon name="ban" size={24} color="#E74C3C" />
            <Text style={styles.restrictionTitle}>Service Booking Restricted</Text>
          </View>
          <Text style={styles.restrictionText}>
            Until this debt is cleared, you won't be able to book new services. Product orders are still available.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, paying && styles.payButtonDisabled]}
          onPress={handlePayDebt}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.laterButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.laterButtonText}>Pay Later</Text>
        </TouchableOpacity>
      </View>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE8F0',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  debtCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  debtLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  debtAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 16,
  },
  debtInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  debtInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  restrictionCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  restrictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  restrictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  restrictionText: {
    fontSize: 13,
    color: '#C62828',
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  laterButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  noDebtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDebtTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 12,
  },
  noDebtText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DebtPaymentScreen;