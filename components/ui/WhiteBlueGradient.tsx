// components/GradientBackground.js
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const GradientBackground = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Base gradient */}
      <LinearGradient
        colors={['#E8F0EF', '#DDE9F1', '#C7DCE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle blue blob (top-right) */}
      <LinearGradient
        colors={['rgba(173, 216, 230, 0.35)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.6, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft white glow (center-top) */}
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Gentle gray-blue accent (bottom-left) */}
      <LinearGradient
        colors={['rgba(180,200,220,0.25)', 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});

export default GradientBackground;
