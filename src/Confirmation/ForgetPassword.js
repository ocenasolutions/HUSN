import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

const ForgetPassword = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1 = email step, 2 = OTP verification step
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const { forgotPasswordSendOTP, forgotPasswordVerifyOTP } = useAuth();

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => timer - 1);
      }, 1000);
    } else if (timer === 0 && step === 2) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordSendOTP(email.toLowerCase());
      setStep(2);
      setTimer(600); // 10 minutes
      setCanResend(false);
      Alert.alert('Success', 'OTP sent to your email');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordVerifyOTP(email.toLowerCase(), otp);
      Alert.alert('Success', 'Login successful! You can now change your password in settings.', [
        {
          text: 'OK',
          onPress: () => {
            // Navigation will be handled by AuthContext
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await forgotPasswordSendOTP(email.toLowerCase());
      setTimer(600);
      setCanResend(false);
      setOtp('');
      Alert.alert('Success', 'OTP resent to your email');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.form}>
      <View style={styles.iconContainer}>
        <Icon name="mail-outline" size={60} color="#ED2B8C" />
      </View>
      
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you an OTP to login to your account
      </Text>

      <View style={styles.inputContainer}>
        <Icon name="mail-outline" size={20} color="#ED2B8C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleSendOTP}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backToLogin}
        onPress={() => navigation.navigate('Login')}
        disabled={loading}
      >
        <Icon name="arrow-back" size={16} color="#ED2B8C"/>
        <Text style={styles.backToLoginText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.form}>
      <View style={styles.iconContainer}>
        <Icon name="shield-checkmark-outline" size={60} color="#ED2B8C" />
      </View>
      
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit code to{'\n'}{email}
      </Text>
      
      <View style={styles.otpContainer}>
        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          editable={!loading}
        />
      </View>
      
      {timer > 0 && (
        <Text style={styles.timerText}>
          Code expires in {formatTime(timer)}
        </Text>
      )}
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleVerifyOTP}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify & Login</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={!canResend || loading}>
          <Text style={[
            styles.resendLink,
            (!canResend || loading) && styles.disabledText]}>
            Resend
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.backToLogin}
        onPress={() => {
          setStep(1);
          setOtp('');
          setTimer(0);
          setCanResend(false);
        }}
        disabled={loading}
      >
        <Icon name="arrow-back" size={16} color="#ED2B8C" />
        <Text style={styles.backToLoginText}>Change Email</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setOtp('');
                setTimer(0);
                setCanResend(false);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        {step === 1 ? renderEmailStep() : renderOTPStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffd3',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  form: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(237, 43, 140, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0F2',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 25,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#F5F0F2',
    borderRadius: 12,
    paddingVertical: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    letterSpacing: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timerText: {
    color: '#ED2B8C',
    fontSize: 14,
    marginBottom: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#ED2B8C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    color: '#ED2B8C',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#ccc',
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backToLoginText: {
    color: '#ED2B8C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ForgetPassword;