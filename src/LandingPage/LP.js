import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext'; // Assuming you have this context
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const LandPage = ({ navigation }) => {
  const { user } = useAuth(); // Get user authentication status
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Smoke animations
  const smokeAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0.8),
    }))
  ).current;

  // Brand name animations
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(50)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const hasSeenLanding = await AsyncStorage.getItem('hasSeenLanding');
        
        startInitialAnimations();
        
        const navigationTimer = setTimeout(() => {
          navigateToNextScreen();
          if (!hasSeenLanding) {
            AsyncStorage.setItem('hasSeenLanding', 'true');
          }
        }, 8000); 
        
        return () => clearTimeout(navigationTimer);
      } catch (error) {
        console.log('Error checking first-time user:', error);
        startInitialAnimations();
        
        setTimeout(() => {
          navigateToNextScreen();
        }, 10000);
      }
    };
    
    checkFirstTimeUser();
  }, []);

  const startInitialAnimations = () => {
    smokeAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 300),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim.translateY, {
                toValue: -20,
                duration: 3000 + index * 500,
                useNativeDriver: true,
              }),
              Animated.timing(anim.translateY, {
                toValue: 0,
                duration: 3000 + index * 500,
                useNativeDriver: true,
              }),
            ]),
            { iterations: -1 }
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim.scale, {
                toValue: 1.2,
                duration: 3000 + index * 500,
                useNativeDriver: true,
              }),
              Animated.timing(anim.scale, {
                toValue: 0.8,
                duration: 3000 + index * 500,
                useNativeDriver: true,
              }),
            ]),
            { iterations: -1 }
          ),
        ]),
      ]).start();
    });

    setTimeout(() => {
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }).start();
      Animated.timing(brandTranslateY, {
        toValue: 0,
        duration: 2500,
        useNativeDriver: true,
      }).start();
    }, 2000);

    // Tagline animation - extended timing
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }).start();
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 2500,
        useNativeDriver: true,
      }).start();
    }, 3000);
  };

  const navigateToNextScreen = () => {
    if (user) {
      // User is logged in, go to Dashboard
      navigation.replace('Home');
    } else {
      // User is not logged in, go to SignUp
      navigation.replace('SignUp');
    }
  };

  // const SmokeParticle = ({ animation, size, left, top }) => (
  //   <Animated.View
  //     style={[
  //       styles.smokeParticle,
  //       {
  //         width: size,
  //         height: size,
  //         left: `${left}%`,
  //         top: `${top}%`,
  //         opacity: animation.opacity,
  //         transform: [
  //           { translateY: animation.translateY },
  //           { scale: animation.scale },
  //         ],
  //       },
  //     ]}
  //   />
  // );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* HUSN Animation Screen - 10 seconds */}
      <Animated.View
        style={[
          styles.splashScreen,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={['#ccb1c0ff', '#daa8a8ff', '#b8a0d4ff']}
          style={styles.splashGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Smoke Effects */}
          {/* {smokeAnimations.map((animation, index) => (
            <SmokeParticle
              key={index}
              animation={animation}
              size={200 + index * 50}
              left={Math.random() * 80 + 10}
              top={Math.random() * 80 + 10}
            />
          ))} */}

          {/* Brand Name */}
          <View style={styles.brandContainer}>
            <Animated.Text
              style={[
                styles.brandName,
                {
                  opacity: brandOpacity,
                  transform: [{ translateY: brandTranslateY }],
                },
              ]}
            >
              HUSN
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandTagline,
                {
                  opacity: taglineOpacity,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
            >
              Beauty Salon
            </Animated.Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  splashGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // smokeParticle: {
  //   position: 'absolute',
  //   backgroundColor: 'white',
  //   borderRadius: 1000,
  //   opacity: 0.7,
  // },
  brandContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
brandName: {
  fontSize: width > 400 ? 80 : 60,
  fontWeight: 'bold', 
  letterSpacing: 8,
  color: '#492e68d2',
  marginBottom: 16,
  textAlign: 'center',
},
  brandTagline: {
    fontSize: width > 400 ? 24 : 20,
    color: '#6B7280',
    letterSpacing: 6,
    textAlign: 'center',
  },
});

export default LandPage;