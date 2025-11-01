import { HapticTab } from '@/components/haptic-tab';
import AnimatedTabIcon from '@/components/ui/AnimatedTabIcon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#2E3A40',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderRadius: 100,
          overflow: 'visible', // ✅ allow bump animation
          position: 'absolute',
          marginHorizontal: 20,
          marginBottom: 20,
          height: 50,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} size={size}>
              <IconSymbol size={28} name="house.fill" color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Adjustments',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} size={size}>
              <Ionicons name="options-outline" size={28} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} size={size}>
              <Ionicons name="person-circle-outline" size={28} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tabs>
  );
}
