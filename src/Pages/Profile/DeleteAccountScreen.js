import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Components/Header';

const { width, height } = Dimensions.get('window');

const DeleteAccountScreen = ({ navigation }) => {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1);

  const handleDeleteAccount = async () => {
    if (!user.googleId && !password.trim()) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type "DELETE" to confirm');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.warningHeader}>
        <Icon name="warning" size={64} color="#FF4444" />
        <Text style={styles.warningTitle}>Delete Account</Text>
        <Text style={styles.warningSubtitle}>This action cannot be undone</Text>
      </View>

      <View style={styles.consequencesContainer}>
        <Text style={styles.consequencesTitle}>What will happen:</Text>
        
        <View style={styles.consequenceItem}>
          <Icon name="checkmark-circle" size={20} color="#FF4444" />
          <Text style={styles.consequenceText}>
            Your profile and personal information will be permanently deleted
          </Text>
        </View>

        <View style={styles.consequenceItem}>
          <Icon name="checkmark-circle" size={20} color="#FF4444" />
          <Text style={styles.consequenceText}>
            All your bookings and order history will be lost
          </Text>
        </View>

        <View style={styles.consequenceItem}>
          <Icon name="checkmark-circle" size={20} color="#FF4444" />
          <Text style={styles.consequenceText}>
            Your wishlist and saved addresses will be deleted
          </Text>
        </View>

        <View style={styles.consequenceItem}>
          <Icon name="checkmark-circle" size={20} color="#FF4444" />
          <Text style={styles.consequenceText}>
            Any loyalty points or rewards will be forfeited
          </Text>
        </View>

        <View style={styles.consequenceItem}>
          <Icon name="checkmark-circle" size={20} color="#FF4444" />
          <Text style={styles.consequenceText}>
            You will need to create a new account to use our services again
          </Text>
        </View>
      </View>

      <View style={styles.alternativesContainer}>
        <Text style={styles.alternativesTitle}>Consider these alternatives:</Text>
        
        <TouchableOpacity 
          style={styles.alternativeButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings-outline" size={20} color="#FF6B9D" />
          <Text style={styles.alternativeText}>Update your privacy settings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.alternativeButton}
          onPress={() => {
            Alert.alert('Contact Support', 'Would you like to contact our support team?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Contact', onPress: () => navigation.navigate('HelpCenter') }
            ]);
          }}
        >
          <Icon name="help-circle-outline" size={20} color="#FF6B9D" />
          <Text style={styles.alternativeText}>Contact support for help</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.alternativeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="pause-outline" size={20} color="#FF6B9D" />
          <Text style={styles.alternativeText}>Take a break and come back later</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Keep My Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={() => setStep(2)}
        >
          <Text style={styles.continueButtonText}>Continue to Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.confirmationHeader}>
        <Icon name="shield-outline" size={48} color="#FF4444" />
        <Text style={styles.confirmationTitle}>Final Confirmation</Text>
        <Text style={styles.confirmationSubtitle}>
          We need to verify your identity before deleting your account
        </Text>
      </View>

      <View style={styles.formContainer}>
        {!user.googleId && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Enter your password</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Your account password"
              placeholderTextColor="#B8B8B8"
              secureTextEntry
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Type <Text style={styles.deleteText}>DELETE</Text> to confirm
          </Text>
          <TextInput
            style={styles.textInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE here"
            placeholderTextColor="#B8B8B8"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.finalWarning}>
          <Icon name="alert-circle" size={24} color="#FF4444" />
          <Text style={styles.finalWarningText}>
            This will permanently delete your account and all associated data. 
            This action cannot be undone.
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.deleteButton, 
            isDeleting && styles.disabledButton,
            (!password.trim() && !user.googleId) || confirmText !== 'DELETE' ? styles.disabledButton : null
          ]} 
          onPress={handleDeleteAccount}
          disabled={isDeleting || ((!password.trim() && !user.googleId) || confirmText !== 'DELETE')}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, step >= 1 && styles.activeStep]}>
              <Text style={[styles.stepNumber, step >= 1 && styles.activeStepText]}>1</Text>
            </View>
            <View style={[styles.progressLine, step >= 2 && styles.activeLine]} />
            <View style={[styles.progressStep, step >= 2 && styles.activeStep]}>
              <Text style={[styles.stepNumber, step >= 2 && styles.activeStepText]}>2</Text>
            </View>
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabel}>Warning</Text>
            <Text style={styles.stepLabel}>Confirm</Text>
          </View>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  progressContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: '#FF4444',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  activeStepText: {
    color: '#fff',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  activeLine: {
    backgroundColor: '#FF4444',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4444',
    marginTop: 15,
    marginBottom: 5,
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  consequencesContainer: {
    marginBottom: 25,
  },
  consequencesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 5,
  },
  consequenceText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  alternativesContainer: {
    marginBottom: 30,
  },
  alternativesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  alternativeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF4444',
    marginTop: 15,
    marginBottom: 10,
  },
  confirmationSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  deleteText: {
    color: '#FF4444',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F8F8',
  },
  finalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  finalWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#FFB3B3',
  },
  bottomSpacer: {
    height: 50,
  },
});
export default DeleteAccountScreen;