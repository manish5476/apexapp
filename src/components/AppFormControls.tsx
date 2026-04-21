/**
 * AppSwitch.tsx   — Animated toggle switch
 * AppCheckbox.tsx — Animated checkbox
 * AppRadioGroup.tsx — Radio button group
 * AppSelect.tsx   — Native-style select with modal picker
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─────────────────────────────────────────
// AppSwitch
// ─────────────────────────────────────────
interface AppSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const AppSwitch: React.FC<AppSwitchProps> = ({
  value, onValueChange, label, sublabel, disabled, color = '#6C63FF', style,
}) => {
  const translateX = useRef(new Animated.Value(value ? 20 : 2)).current;
  const bgAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: value ? 20 : 2, useNativeDriver: true, speed: 25, bounciness: 10 }),
      Animated.timing(bgAnim, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [value]);

  const bgColor = bgAnim.interpolate({ inputRange: [0, 1], outputRange: ['#2E2E4A', color] });

  return (
    <TouchableOpacity
      style={[switchStyles.row, style]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.9}
    >
      {(label || sublabel) && (
        <View style={switchStyles.textBlock}>
          {label && <Text style={[switchStyles.label, disabled && { opacity: 0.4 }]}>{label}</Text>}
          {sublabel && <Text style={switchStyles.sublabel}>{sublabel}</Text>}
        </View>
      )}
      <Animated.View style={[switchStyles.track, { backgroundColor: bgColor, opacity: disabled ? 0.4 : 1 }]}>
        <Animated.View style={[switchStyles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const switchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  textBlock: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#C8C8E8' },
  sublabel: { fontSize: 12, color: '#6B6B8A', marginTop: 2 },
  track: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
});


// ─────────────────────────────────────────
// AppCheckbox
// ─────────────────────────────────────────
interface AppCheckboxProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const AppCheckbox: React.FC<AppCheckboxProps> = ({
  value, onValueChange, label, disabled, color = '#6C63FF', style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const toggle = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    onValueChange(!value);
  };

  return (
    <TouchableOpacity style={[cbStyles.row, style]} onPress={toggle} activeOpacity={0.9}>
      <Animated.View style={[
        cbStyles.box,
        { borderColor: value ? color : '#3A3A5C', backgroundColor: value ? color : 'transparent', transform: [{ scale }], opacity: disabled ? 0.4 : 1 }
      ]}>
        {value && <Ionicons name="checkmark" size={14} color="#fff" />}
      </Animated.View>
      {label && <Text style={[cbStyles.label, disabled && { opacity: 0.4 }]}>{label}</Text>}
    </TouchableOpacity>
  );
};

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#C8C8E8', flex: 1 },
});


// ─────────────────────────────────────────
// AppRadioGroup
// ─────────────────────────────────────────
interface RadioOption { label: string; value: string; description?: string }

interface AppRadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (val: string) => void;
  color?: string;
  style?: ViewStyle;
}

export const AppRadioGroup: React.FC<AppRadioGroupProps> = ({
  options, value, onChange, color = '#6C63FF', style,
}) => (
  <View style={style}>
    {options.map(opt => {
      const selected = opt.value === value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[radioStyles.row, selected && { borderColor: color + '66', backgroundColor: color + '11' }]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <View style={[radioStyles.outer, { borderColor: selected ? color : '#3A3A5C' }]}>
            {selected && <View style={[radioStyles.inner, { backgroundColor: color }]} />}
          </View>
          <View style={radioStyles.text}>
            <Text style={[radioStyles.label, selected && { color: '#E8E8FF' }]}>{opt.label}</Text>
            {opt.description && <Text style={radioStyles.desc}>{opt.description}</Text>}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const radioStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#2E2E4A', marginBottom: 8, gap: 12 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  inner: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: '#A0A0C0' },
  desc: { fontSize: 12, color: '#6B6B8A', marginTop: 3 },
});


// ─────────────────────────────────────────
// AppSelect
// ─────────────────────────────────────────
interface SelectOption { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap; description?: string }

interface AppSelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange: (opt: SelectOption) => void;
  placeholder?: string;
  error?: string;
  style?: ViewStyle;
}

export const AppSelect: React.FC<AppSelectProps> = ({
  label, options, value, onChange, placeholder = 'Select an option…', error, style,
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={[{ marginBottom: 8 }, style]}>
      <Text style={selectStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[selectStyles.trigger, error && { borderColor: '#FF4C6A' }]}
        onPress={() => setOpen(true)}
      >
        {selected?.icon && <Ionicons name={selected.icon} size={16} color="#6C63FF" style={{ marginRight: 8 }} />}
        <Text style={[selectStyles.triggerText, !selected && { color: '#4A4A6A' }]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B6B8A" />
      </TouchableOpacity>
      {error && <Text style={selectStyles.error}>{error}</Text>}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={selectStyles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={selectStyles.sheet}>
            <View style={selectStyles.sheetHandle} />
            <Text style={selectStyles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[selectStyles.option, isSelected && selectStyles.optionSelected]}
                    onPress={() => { onChange(item); setOpen(false); }}
                  >
                    {item.icon && <Ionicons name={item.icon} size={18} color={isSelected ? '#6C63FF' : '#6B6B8A'} />}
                    <View style={{ flex: 1, marginLeft: item.icon ? 10 : 0 }}>
                      <Text style={[selectStyles.optionLabel, isSelected && { color: '#6C63FF' }]}>{item.label}</Text>
                      {item.description && <Text style={selectStyles.optionDesc}>{item.description}</Text>}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 32 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const selectStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: '#6B6B8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  trigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12122A', borderWidth: 1.5, borderColor: '#2E2E4A', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  triggerText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#E8E8FF' },
  error: { fontSize: 12, color: '#FF4C6A', marginTop: 4, marginLeft: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%', borderTopWidth: 1, borderColor: '#2E2E4A' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3A5C', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#E8E8FF', marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#1E1E3A' },
  optionSelected: { backgroundColor: '#6C63FF11' },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#C8C8E8' },
  optionDesc: { fontSize: 12, color: '#6B6B8A', marginTop: 2 },
});
