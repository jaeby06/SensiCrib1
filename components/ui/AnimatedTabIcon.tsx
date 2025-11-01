// components/ui/AnimatedTabIcon.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  color: string;
  size: number;
  label?: string; // 👈 added optional label
  children: React.ReactNode;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  focused,
  color,
  label,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 0 : 1)).current;

  useEffect(() => {
    // Icon scale animation
    Animated.spring(scale, {
      toValue: focused ? 1.5 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();

    // Lift effect (slightly move up)
    Animated.spring(translateY, {
      toValue: focused ? -5 : 0,
      useNativeDriver: true,
      friction: 6,
    }).start();

    // Glow fade
    Animated.timing(glowOpacity, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Label fade out/in
    Animated.timing(labelOpacity, {
      toValue: focused ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <View style={styles.wrapper}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />

      {/* Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale }, { translateY }] },
        ]}
      >
        {children}
      </Animated.View>

      {/* Label */}
      {label && (
        <Animated.Text style={[styles.label, { opacity: labelOpacity, color }]}>
          {label}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 30,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default AnimatedTabIcon;
