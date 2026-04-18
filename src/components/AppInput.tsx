/**
 * AppInput.tsx
 * Floating label text input with icon, error/success state, char count.
 * Usage:
 *   <AppInput label="Email" value={email} onChangeText={setEmail} />
 *   <AppInput label="Password" secureTextEntry icon="lock-closed-outline" />
 *   <AppInput label="Notes" multiline error="Required field" />
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  success?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  maxChars?: number;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  success,
  icon,
  containerStyle,
  maxChars,
  secureTextEntry,
  value,
  multiline,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const onBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, -8] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#6B6B8A', error ? '#FF4C6A' : focused ? '#6C63FF' : '#6B6B8A'],
  });

  const borderColor = error ? '#FF4C6A' : success ? '#00C896' : focused ? '#6C63FF' : '#2E2E4A';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.container, { borderColor }]}>
        <Animated.Text style={[styles.floatingLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
          {label}
        </Animated.Text>

        <View style={styles.row}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={focused ? '#6C63FF' : '#6B6B8A'}
              style={styles.leftIcon}
            />
          )}
          <TextInput
            {...rest}
            value={value}
            secureTextEntry={secure}
            multiline={multiline}
            onFocus={onFocus}
            onBlur={onBlur}
            maxLength={maxChars}
            style={[
              styles.input,
              { paddingLeft: icon ? 0 : 4, height: multiline ? 88 : 48 },
            ]}
            placeholderTextColor="transparent"
            selectionColor="#6C63FF"
          />
          {secureTextEntry && (
            <TouchableOpacity onPress={() => setSecure(s => !s)} style={styles.rightIcon}>
              <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B6B8A" />
            </TouchableOpacity>
          )}
          {success && !error && (
            <View style={styles.rightIcon}>
              <Ionicons name="checkmark-circle" size={18} color="#00C896" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={13} color="#FF4C6A" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : <View />}
        {maxChars && (
          <Text style={styles.charCount}>{(value as string)?.length ?? 0}/{maxChars}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#12122A',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  floatingLabel: {
    position: 'absolute',
    left: 14,
    backgroundColor: '#12122A',
    paddingHorizontal: 4,
    zIndex: 1,
    fontWeight: '600',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  leftIcon: { marginRight: 8, marginBottom: 4 },
  rightIcon: { marginLeft: 8, marginBottom: 4 },
  input: {
    flex: 1,
    color: '#E8E8FF',
    fontSize: 15,
    paddingBottom: 10,
    fontWeight: '500',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { color: '#FF4C6A', fontSize: 12, marginLeft: 3 },
  charCount: { color: '#6B6B8A', fontSize: 11 },
});

export default AppInput;
