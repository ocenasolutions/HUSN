// SignUp.js - Fixed version with proper role handling
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
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { Linking } from 'react-native';

const openTermsAndConditions = () => {
  Linking.openURL('https://tobo-salon.vercel.app/terms');
};

const openPrivacyPolicy = () => {
  Linking.openURL('https://tobo-salon.vercel.app/privacy');
};

const SignUp = ({ navigation, route }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // ✅ Get role from route params - 'professional' or undefined (which means regular user)
  const role = route?.params?.role || 'user'; // Default to 'user' for customers
  const isProfessional = role === 'professional';

  const { signupSendOTP, signupVerifyOTP } = useAuth();

  // Timer effect for OTP resend
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

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return false;
    }
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!password) {
      Alert.alert('Error', 'Password is required');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // ✅ Pass the correct role to backend
      await signupSendOTP({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: isProfessional ? 'professional' : 'user' // Explicitly set role
      });
      setStep(2);
      setTimer(600);
      setCanResend(false);
      Alert.alert('Success', 'OTP sent to your email for verification');
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
      await signupVerifyOTP(email.toLowerCase(), otp);
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await signupSendOTP({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: isProfessional ? 'professional' : 'user'
      });
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

  const renderSignupForm = () => (
    <View style={styles.formContainer}>
      {isProfessional && (
        <View style={styles.roleIndicator}>
          <Icon name="briefcase" size={24} color="#ED2B8C" />
          <Text style={styles.roleText}>Creating Professional Account</Text>
        </View>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, { paddingRight: 50 }]}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
          disabled={loading}
        >
          <Icon 
            name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
            size={20} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, { paddingRight: 50 }]}
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
          disabled={loading}
        >
          <Icon 
            name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
            size={20} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.signupButton, loading && styles.disabledButton]}
        onPress={handleSendOTP}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.signupButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Login', isProfessional ? { role: 'professional' } : {})}
          disabled={loading}
        >
          <Text style={[styles.loginLink, loading && styles.disabledText]}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOTPForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.otpIconContainer}>
        <Icon name="shield-checkmark-outline" size={60} color="#ED2B8C" />
      </View>
      
      <Text style={styles.otpTitle}>Verify Your Email</Text>
      <Text style={styles.otpSubtitle}>
        We've sent a 6-digit verification code to{'\n'}{email}
      </Text>

      <View style={styles.otpInputContainer}>
        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit code"
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
        style={[styles.verifyButton, loading && styles.disabledButton]}
        onPress={handleVerifyOTP}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify & Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={!canResend || loading}
        >
          <Text style={[
            styles.resendLink,
            (!canResend || loading) && styles.disabledText
          ]}>
            Resend
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.changeEmailButton}
        onPress={() => {
          setStep(1);
          setOtp('');
          setTimer(0);
          setCanResend(false);
        }}
        disabled={loading}
      >
        <Icon name="arrow-back" size={16} color="#ED2B8C" />
        <Text style={styles.changeEmailText}>Change Email</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
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
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Create Account' : 'Verify Email'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? renderSignupForm() : renderOTPForm()}
        </ScrollView>
      </KeyboardAvoidingView>

      {step === 1 && (
        <View style={styles.termsContainer}>
          <View style={styles.termsRow}>
            <Text style={styles.termsText}>By signing up, you agree to our </Text>
          </View>
          <View style={styles.termsLinksRow}>
            <TouchableOpacity onPress={openTermsAndConditions}>
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}> and </Text>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    marginTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 50,
  },
  formContainer: {
    flex: 1,
    paddingTop: 40,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(237, 43, 140, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ED2B8C',
    marginLeft: 10,
  },
  inputWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    backgroundColor: '#F5F0F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  signupButton: {
    backgroundColor: '#ED2B8C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 10,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  otpIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(237, 43, 140, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  otpTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  otpSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  otpInputContainer: {
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#F5F0F2',
    borderRadius: 12,
    paddingVertical: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    letterSpacing: 3,
  },
  timerText: {
    color: '#ED2B8C',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#ED2B8C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  changeEmailText: {
    color: '#ED2B8C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
  },
  loginLink: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  termsRow: {
    alignItems: 'center',
  },
  termsLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  termsText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  termsLink: {
    color: '#E91E63',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default SignUp;