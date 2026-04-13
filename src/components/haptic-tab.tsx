// src/components/haptic-tab.tsx
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

export function HapticTab(props: TouchableOpacityProps) {
  return <TouchableOpacity {...props} activeOpacity={0.7} />;
}