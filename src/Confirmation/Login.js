import React, { useState, useRef, useEffect } from 'react';
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
  ImageBackground,
  StatusBar,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation references
  const cardAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(30)).current;
  const inputAnim = useRef(new Animated.Value(50)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const skipButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Floating animations for decorative elements
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  const { login } = useAuth();

  useEffect(() => {
    // Initial animations
    Animated.stagger(200, [
      Animated.spring(skipButtonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(inputAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animations
    const createFloatingAnimation = (animValue, duration, delay = 0) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -15,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 10,
            duration: duration,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    };

    const sparkleAnimation = () => {
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => sparkleAnimation());
    };

    createFloatingAnimation(bubble1Anim, 2000, 0);
    createFloatingAnimation(bubble2Anim, 2500, 500);
    sparkleAnimation();
  }, []);

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

  const handleSkip = () => {
    Alert.alert(
      'Continue as Guest', 
      'You can explore the app without signing in. Some features may be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => navigation.navigate('Home'),
          style: 'default'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background */}
      <ImageBackground
        source={require('./assets/1.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            'rgba(255,192,203,0.3)', 
            'rgba(255,182,193,0.5)', 
            'rgba(255,105,180,0.7)',
            'rgba(219,112,147,0.8)'
          ]}
          style={styles.gradientOverlay}
        />
      </ImageBackground>

      {/* Skip Button - Top Right */}
      <Animated.View
        style={[
          styles.skipButtonContainer,
          {
            opacity: skipButtonAnim,
            transform: [{ scale: skipButtonAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
            style={styles.skipButtonGradient}
          >
            <Text style={styles.skipButtonText}>SKIP</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Floating Decorative Elements */}
      <Animated.View
        style={[
          styles.bubble1,
          { transform: [{ translateY: bubble1Anim }] }
        ]}
      />
      <Animated.View
        style={[
          styles.bubble2,
          { transform: [{ translateY: bubble2Anim }] }
        ]}
      />
      <Animated.View
        style={[
          styles.sparkle1,
          { opacity: sparkleAnim }
        ]}
      >
        <Text style={styles.sparkleIcon}>✨</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.sparkle2,
          { opacity: sparkleAnim }
        ]}
      >
        <Text style={styles.sparkleIcon}>🌸</Text>
      </Animated.View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.backButtonGradient}
              >
                <Icon name="arrow-back" size={20} color="#FF1493" />
              </LinearGradient>
            </TouchableOpacity>
            
            <Animated.View 
              style={[
                styles.titleContainer,
                { transform: [{ translateY: titleAnim }] }
              ]}
            >
              <Text style={styles.headerTitle}>Welcome Back</Text>
              <Text style={styles.headerSubtitle}>Sign in to continue your journey</Text>
            </Animated.View>
          </View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.cardContainer,
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardAnim },
                  { translateY: inputAnim }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)', 'rgba(255,240,245,0.9)']}
              style={styles.card}
            >
              {/* Form Title */}
              <View style={styles.formTitleContainer}>
                <Text style={styles.formTitle}>Log In</Text>
                <View style={styles.decorativeLine} />
              </View>

              {/* Form Inputs */}
              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <View style={styles.inputContainer}>
                    <Icon name="mail-outline" size={16} color="#FF69B4" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor="#FF69B4"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.inputUnderline} />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <View style={styles.inputContainer}>
                    <Icon name="lock-closed-outline" size={16} color="#FF69B4" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Password"
                      placeholderTextColor="#FF69B4"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Icon 
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                        size={16} 
                        color="#FF69B4" 
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputUnderline} />
                </View>

                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => navigation.navigate('ForgetPassword')}
                >
                  <Text style={styles.forgotPasswordText}>I forgot</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Animated.View
                  style={[
                    styles.buttonWrapper,
                    {
                      opacity: buttonAnim,
                      transform: [{ scale: buttonAnim }]
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FF69B4', '#FF1493', '#DC143C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.loginButtonText}>Log in</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>New to our community? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFB6C1',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  // Skip Button Styles
  skipButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  skipButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  skipButtonText: {
    color: '#FF1493',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  
  // Header
  header: {
    marginTop: Platform.OS === 'ios' ? 50 : 40,
    marginBottom: 30,
    zIndex: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Card Container
  cardContainer: {
    flex: 1,
    zIndex: 1,
  },
  card: {
    borderRadius: 25,
    padding: 28,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  // Form Title
  formTitleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#FF1493',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  decorativeLine: {
    width: 50,
    height: 2,
    backgroundColor: '#FF69B4',
    borderRadius: 1,
  },

  form: {
    width: '100%',
  },

  // Input Styles
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.8,
  },
  input: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '400',
    flex: 1,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: '#FFB6C1',
    marginTop: 4,
    opacity: 0.6,
  },
  eyeIcon: {
    padding: 6,
  },

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: '#FF69B4',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Button Styles
  buttonWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  loginButton: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },

  // Sign Up Link
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  signupText: {
    color: '#FF69B4',
    fontSize: 13,
    fontWeight: '400',
  },
  signupLink: {
    color: '#FF1493',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Floating Decorative Elements
  bubble1: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 0,
  },
  bubble2: {
    position: 'absolute',
    top: '35%',
    right: '20%',
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    zIndex: 0,
  },
  sparkle1: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    zIndex: 0,
  },
  sparkle2: {
    position: 'absolute',
    top: '70%',
    right: '15%',
    zIndex: 0,
  },
  sparkleIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default Login;