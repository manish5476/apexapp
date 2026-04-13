import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { TouchableOpacity } from 'react-native';

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
    />
  );
}