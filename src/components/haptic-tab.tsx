import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  // Filters out all 'null' values that React Navigation might pass (e.g., onBlur, disabled, etc.)
  // since TouchableOpacity only accepts 'undefined' or the specific type.
  const cleanedProps = Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === null ? undefined : value])
  );

  return (
    <TouchableOpacity
      {...cleanedProps}
      activeOpacity={0.7}
      onPressIn={(e) => {
        // Trigger a subtle premium haptic bump on mobile devices when pressed
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Ensure we don't break the original navigation functionality
        if (props.onPressIn) {
          props.onPressIn(e);
        }
      }}
    />
  );
}