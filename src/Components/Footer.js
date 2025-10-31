import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Footer = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tabs = [
    {
      name: 'Home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home'
    },
    {
      name: 'Services',
      label: 'Services',
      icon: 'calendar-number-outline',
      activeIcon: 'grid'
    },
    // {
    //   name: 'Play',
    //   label: 'Play',
    //   icon: 'calendar-outline',
    //   activeIcon: 'calendar'
    // },
    // {
    //   name: 'Offers',
    //   label: 'Offers',
    //   icon: 'pricetag-outline',
    //   activeIcon: 'pricetag'
    // },
    {
      name: 'Product',
      label: 'Shop',
      icon: 'bag-handle-outline',
      activeIcon: 'cube'
    },
    {
      name: 'Profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person'
    },
  ];
  const currentRouteName = route.name;
  const handleTabPress = (tabName) => {
    if (currentRouteName !== tabName) {
      navigation.navigate(tabName);
    }
  };
  return (
    <View style={styles.footer}>
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => {
          const isFocused = currentRouteName === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.name)}
              style={[styles.tabButton, isFocused && styles.activeTabButton]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isFocused && styles.activeIconContainer,
                ]}>
                <Icon
                  name={isFocused ? tab.activeIcon : tab.icon}
                  size={isFocused ? 26 : 24}
                  color={isFocused ? '#FF6B9D' : '#B8B8B8'}
                />
              </View>
              <Text
                style={[styles.tabLabel, isFocused && styles.activeTabLabel]}
              >
                {tab.label}
              </Text>
              {isFocused && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#ffffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
    paddingBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: (width - 60) / 6,
    position: 'relative',
  },
  activeTabButton: {
    transform: [{ translateY: -2 }],
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 10, 
    color: '#B8B8B8',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#FF6B9D',
    fontWeight: '700',
    fontSize: 11,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B9D',
  },
});

export default Footer;