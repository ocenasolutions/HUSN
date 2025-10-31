import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const LandingPage = ({ navigation }) => {
  const { user } = useAuth();
  
  const hOpacity = useRef(new Animated.Value(0)).current;
  const hScale = useRef(new Animated.Value(8)).current;
  
  const uOpacity = useRef(new Animated.Value(0)).current;
  const sOpacity = useRef(new Animated.Value(0)).current;
  const nOpacity = useRef(new Animated.Value(0)).current;
  
  const usnScale = useRef(new Animated.Value(0.8)).current;
  
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  
  const fullWordOpacity = useRef(new Animated.Value(1)).current;
  
  const [particles] = useState(() => 
    Array.from({ length: 20 }, () => ({
      translateX: useRef(new Animated.Value(Math.random() * width)).current,
      translateY: useRef(new Animated.Value(Math.random() * height)).current,
      scale: useRef(new Animated.Value(Math.random() * 0.5 + 0.5)).current,
      opacity: useRef(new Animated.Value(Math.random() * 0.4 + 0.2)).current,
      size: Math.random() * 30 + 20,
      duration: Math.random() * 8000 + 12000,
    }))
  );
  
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    particles.forEach((particle, index) => {
      const animateParticle = () => {
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(particle.translateY, {
                toValue: Math.random() * height,
                duration: particle.duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateY, {
                toValue: Math.random() * height,
                duration: particle.duration,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(particle.translateX, {
                toValue: Math.random() * width,
                duration: particle.duration * 0.8,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateX, {
                toValue: Math.random() * width,
                duration: particle.duration * 0.8,
                useNativeDriver: true,
              }),
            ]),
            Animated.loop(
              Animated.sequence([
                Animated.timing(particle.opacity, {
                  toValue: Math.random() * 0.6 + 0.3,
                  duration: 3000,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.opacity, {
                  toValue: Math.random() * 0.3 + 0.1,
                  duration: 3000,
                  useNativeDriver: true,
                }),
              ])
            ),
            Animated.loop(
              Animated.sequence([
                Animated.timing(particle.scale, {
                  toValue: Math.random() * 0.5 + 0.8,
                  duration: 4000,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.scale, {
                  toValue: Math.random() * 0.5 + 0.5,
                  duration: 4000,
                  useNativeDriver: true,
                }),
              ])
            ),
          ])
        ).start();
      };
      
      setTimeout(() => animateParticle(), index * 100);
    });
    
    // Animate waves
    Animated.loop(
      Animated.timing(wave1, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
    
    Animated.loop(
      Animated.timing(wave2, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
    
    Animated.loop(
      Animated.timing(wave3, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(hOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(hScale, {
          toValue: 6.5,
          tension: 25,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
      Animated.spring(hScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Animated.stagger(200, [
        Animated.parallel([
          Animated.timing(uOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(usnScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(sOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(nOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(subtitleTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        
        setTimeout(() => {
          Animated.timing(fullWordOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => {
              if (user) {
                navigation.replace('Home'); 
              } else {
                navigation.replace('SignUp');
              }
            }, 100);
          });
        }, 1500);
      });
    });
  }, [user, navigation]);

  const wave1Scale = wave1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });
  
  const wave1Opacity = wave1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.25, 0.15],
  });
  
  const wave2Scale = wave2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });
  
  const wave2Opacity = wave2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.3, 0.2],
  });
  
  const wave3Scale = wave3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });
  
  const wave3Opacity = wave3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.2, 0.1],
  });

  return (
    <View style={styles.container}>
      {/* Animated Wave Backgrounds */}
      <Animated.View 
        style={[
          styles.wave,
          styles.wave1,
          {
            opacity: wave1Opacity,
            transform: [{ scale: wave1Scale }],
          },
        ]}
      />
      
      <Animated.View 
        style={[
          styles.wave,
          styles.wave2,
          {
            opacity: wave2Opacity,
            transform: [{ scale: wave2Scale }],
          },
        ]}
      />
      
      <Animated.View 
        style={[
          styles.wave,
          styles.wave3,
          {
            opacity: wave3Opacity,
            transform: [{ scale: wave3Scale }],
          },
        ]}
      />
      
      {/* Floating Particles */}
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
                { scale: particle.scale },
              ],
              backgroundColor: index % 3 === 0 ? '#CA217C' : index % 3 === 1 ? '#ffffff' : '#FF69B4',
            },
          ]}
        />
      ))}
      
      {/* Word Container */}
      <Animated.View 
        style={[
          styles.contentContainer,
          { opacity: fullWordOpacity }
        ]}
      >
        <View style={styles.wordContainer}>
          <Animated.Text
            style={[
              styles.letter,
              styles.letterH,
              {
                opacity: hOpacity,
                transform: [{ scale: hScale }],
              },
            ]}
          >
            H
          </Animated.Text>
          <Animated.Text
            style={[
              styles.letter,
              {
                opacity: uOpacity,
                transform: [{ scale: usnScale }],
              },
            ]}
          >
            U
          </Animated.Text>
          <Animated.Text
            style={[
              styles.letter,
              {
                opacity: sOpacity,
                transform: [{ scale: usnScale }],
              },
            ]}
          >
            S
          </Animated.Text>
          <Animated.Text
            style={[
              styles.letter,
              {
                opacity: nOpacity,
                transform: [{ scale: usnScale }],
              },
            ]}
          >
            N
          </Animated.Text>
        </View>
        
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          Beauty Salon
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7DFF1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    borderRadius: 9999,
  },
  wave1: {
    width: width * 1.5,
    height: width * 1.5,
    backgroundColor: '#CA217C',
    top: -width * 0.5,
    left: -width * 0.25,
  },
  wave2: {
    width: width * 1.8,
    height: width * 1.8,
    backgroundColor: '#ffffff',
    bottom: -width * 0.7,
    right: -width * 0.4,
  },
  wave3: {
    width: width * 1.3,
    height: width * 1.3,
    backgroundColor: '#FF69B4',
    top: height * 0.6,
    left: -width * 0.3,
  },
  particle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  contentContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 80,
    fontWeight: '700',
    color: '#CA217C',
    letterSpacing: 2,
    textShadowColor: '#44190030',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  letterH: {
    fontSize: 80,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#441900',
    letterSpacing: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    textShadowColor: '#ffffff80',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default LandingPage;