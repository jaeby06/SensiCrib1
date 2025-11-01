import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_COUNT = 3; // 👈 adjust if you add/remove tabs
const TAB_WIDTH = width / TAB_COUNT;
const CURVE_HEIGHT = 22;

export default function TabBumpOverlay({ activeIndex }: { activeIndex: number }) {
  const x = useRef(new Animated.Value(activeIndex * TAB_WIDTH)).current;

  useEffect(() => {
    Animated.spring(x, {
      toValue: activeIndex * TAB_WIDTH,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [activeIndex]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.curveContainer,
          {
            transform: [{ translateX: x }],
          },
        ]}
      >
        <Svg width={TAB_WIDTH} height={60}>
          <Path
            d={`M0,20 C${TAB_WIDTH / 4},0 ${TAB_WIDTH * 0.75},0 ${TAB_WIDTH},20 L${TAB_WIDTH},60 L0,60 Z`}
            fill="#FFFFFF"
            stroke="#E5E7EB"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  curveContainer: {
    position: 'absolute',
    bottom: 50, // 👈 same height as your tab bar
  },
});
