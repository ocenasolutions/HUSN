import React, { useState } from 'react';
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

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.toLowerCase(), password });
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login</Text>
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
          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Email or Phone"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            
            {/* Password Input */}
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
            
            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgetPassword')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
            
            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignUp')}
                disabled={loading}
              >
                <Text style={[styles.signupLink, loading && styles.disabledText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <View style={styles.termsRow}>
          <Text style={styles.termsText}>By signing in, you agree to our </Text>
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
  
  // Header
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 50,
  },

  // Form Container
  formContainer: {
    flex: 1,
    paddingTop: 40,
  },

  // Input Styles
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

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },

  // Login Button
  loginButton: {
    backgroundColor: '#ED2B8C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },

  // Sign Up Link
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
  },
  signupLink: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },

  // Terms
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

export default Login;