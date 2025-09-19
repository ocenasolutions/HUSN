import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
const { width, height } = Dimensions.get('window');

const beautyImages = [
  require('./assets/1.jpg'),
  require('./assets/2.jpg'),
  require('./assets/3.jpg'),
  require('./assets/4.jpg'),
];

const LandingPage = ({ navigation }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(50)).current;
  const subtitleAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(-50)).current;
  
  // Floating animations for decorative elements
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const bubble3Anim = useRef(new Animated.Value(0)).current;
  const smokeAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 0,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(subtitleAnim, {
        toValue: 0,
        duration: 1200,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        duration: 1400,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Image cycling animation
    const imageInterval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImageIndex((prev) => (prev + 1) % beautyImages.length);
        
        scaleAnim.setValue(0.9);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 4000);

    // Floating bubbles animation
    const createBubbleAnimation = (animValue, duration, delay = 0) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -20,
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
    const smokeAnimation = () => {
      Animated.sequence([
        Animated.timing(smokeAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(smokeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => smokeAnimation());
    };

    // Heart pulse animation
    const heartPulse = () => {
      Animated.sequence([
        Animated.timing(heartAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => setTimeout(heartPulse, 2000));
    };

    // Sparkle twinkle animation
    const sparkleAnimation = () => {
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => sparkleAnimation());
    };

    // Start all animations
    createBubbleAnimation(bubble1Anim, 2500, 0);
    createBubbleAnimation(bubble2Anim, 3000, 500);
    createBubbleAnimation(bubble3Anim, 2800, 1000);
    smokeAnimation();
    heartPulse();
    sparkleAnimation();

    return () => clearInterval(imageInterval);
  }, []);

  const handleGetStarted = () => {
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('SignUp');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Image with Animation */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ImageBackground
          source={beautyImages[currentImageIndex]}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Elegant Gradient Overlay */}
          <LinearGradient
            colors={[
              'rgba(255,192,203,0.2)', 
              'rgba(255,182,193,0.4)', 
              'rgba(255,105,180,0.6)',
              'rgba(219,112,147,0.8)'
            ]}
            style={styles.gradientOverlay}
          />
        </ImageBackground>
      </Animated.View>

      {/* Top Logo */}
      <Animated.View
        style={[
          styles.topLogoContainer,
          { transform: [{ translateY: logoAnim }] }
        ]}
      >
        <Text style={styles.topLogo}>HUSN</Text>
      </Animated.View>

      {/* Main Content - Bottom Left */}
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.textContainer,
            { transform: [{ translateY: titleAnim }] }
          ]}
        >
          <Text style={styles.mainTitle}>Husn</Text>
          <Animated.View
            style={[
              styles.subtitleContainer,
              { transform: [{ translateY: subtitleAnim }] }
            ]}
          >
            <Text style={styles.subtitle}>Beauty Salon</Text>
            <Text style={styles.tagline}>Where elegance meets beauty</Text>
          </Animated.View>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            { 
              opacity: buttonAnim,
              transform: [{ scale: buttonAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF69B4', '#FF1493', '#DC143C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Discover Beauty</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Floating Decorative Elements */}
      {/* Bubbles */}
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
          styles.bubble3,
          { transform: [{ translateY: bubble3Anim }] }
        ]}
      />

      {/* Smoke/Mist Effect */}
      <Animated.View
        style={[
          styles.smokeEffect,
          { opacity: smokeAnim }
        ]}
      />

      {/* Heart Shape */}
      <Animated.View
        style={[
          styles.heartShape,
          { transform: [{ scale: heartAnim }] }
        ]}
      >
        <Text style={styles.heartIcon}>♥</Text>
      </Animated.View>

      {/* Sparkles */}
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
        <Text style={styles.sparkleIcon}>✦</Text>
      </Animated.View>

      {/* Flower petals */}
      <View style={styles.petal1}>
        <Text style={styles.petalIcon}>🌸</Text>
      </View>
      <View style={styles.petal2}>
        <Text style={styles.petalIcon}>🌺</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFB6C1',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topLogoContainer: {
    position: 'absolute',
    top: StatusBar.currentHeight + 30,
    left: 30,
    zIndex: 10,
  },
  topLogo: {
    fontSize: 42,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 80,
    left: 30,
    right: 30,
  },
  textContainer: {
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    marginLeft: 5,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
    opacity: 0.9,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    alignItems: 'flex-start',
  },
  getStartedButton: {
    width: width * 0.6,
    height: 55,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF1493',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginRight: 8,
  },
  buttonIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  subButtonText: {
    marginTop: 12,
  },
  subButtonTextContent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  // Decorative Elements
  bubble1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 25,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  bubble2: {
    position: 'absolute',
    top: '35%',
    right: '20%',
    width: 18,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  bubble3: {
    position: 'absolute',
    top: '25%',
    right: '5%',
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  smokeEffect: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    blur: 10,
  },
  heartShape: {
    position: 'absolute',
    top: '40%',
    left: '20%',
  },
  heartIcon: {
    fontSize: 20,
    color: 'rgba(255, 182, 193, 0.8)',
  },
  sparkle1: {
    position: 'absolute',
    top: '30%',
    right: '15%',
  },
  sparkle2: {
    position: 'absolute',
    top: '50%',
    left: '10%',
  },
  sparkleIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  petal1: {
    position: 'absolute',
    top: '60%',
    right: '8%',
    opacity: 0.6,
  },
  petal2: {
    position: 'absolute',
    top: '45%',
    right: '25%',
    opacity: 0.5,
  },
  petalIcon: {
    fontSize: 14,
  },
});

export default LandingPage;