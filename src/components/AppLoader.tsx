import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ThemedText } from '@/src/components/themed-text';
import { getElevation } from '@/src/constants/theme';

interface AppLoaderProps {
  /** If true, the loader will cover the entire screen with a semi-transparent backdrop */
  overlay?: boolean;
  /** Optional text to display below the loader */
  text?: string;
  /** Size of the loader (default 48) */
  size?: number;
  /** Color of the primary spinner (defaults to theme primary accent) */
  color?: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ 
  overlay = false, 
  text, 
  size = 48, 
  color 
}) => {
  const theme = useAppTheme();
  
  // Animation Values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous Spin Animation
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Continuous Pulse Animation (Breathing effect)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, []);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinnerColor = color || theme.accentPrimary || '#1d4ed8';
  const trackColor = `${spinnerColor}30`; // 30% opacity track

  const loaderSize = size;
  const strokeWidth = Math.max(3, loaderSize * 0.1);

  const loaderContent = (
    <View style={styles.contentContainer}>
      <Animated.View style={{ transform: [{ scale: pulseValue }] }}>
        <View style={{ width: loaderSize, height: loaderSize, justifyContent: 'center', alignItems: 'center' }}>
          {/* Background Track */}
          <View
            style={[
              styles.circle,
              {
                width: loaderSize,
                height: loaderSize,
                borderRadius: loaderSize / 2,
                borderWidth: strokeWidth,
                borderColor: trackColor,
                position: 'absolute',
              },
            ]}
          />
          {/* Animated Spinner */}
          <Animated.View
            style={[
              styles.circle,
              {
                width: loaderSize,
                height: loaderSize,
                borderRadius: loaderSize / 2,
                borderWidth: strokeWidth,
                borderTopColor: spinnerColor,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
                position: 'absolute',
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          />
          {/* Inner Dot */}
          <View
            style={{
              width: strokeWidth * 2.5,
              height: strokeWidth * 2.5,
              borderRadius: strokeWidth * 1.5,
              backgroundColor: spinnerColor,
            }}
          />
        </View>
      </Animated.View>
      
      {text && (
        <ThemedText style={styles.text}>
          {text}
        </ThemedText>
      )}
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={true} animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.glassCard, { backgroundColor: theme.bgPrimary }, getElevation(3, theme)]}>
            {loaderContent}
          </View>
        </View>
      </Modal>
    );
  }

  return loaderContent;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  circle: {
    borderStyle: 'solid',
  },
  text: {
    fontFamily: 'Inter-SemiBold', // Fallback handled by ThemedText
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
