import { ActiveTheme } from '@/src/app/(auth)/findShopScreen';
import { Spacing, Typography, UI } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface AppDatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Select Date',
  containerStyle,
}) => {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }

    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={ActiveTheme.textLabel} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontFamily: ActiveTheme.fonts?.body,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: ActiveTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ActiveTheme.bgPrimary,
    borderWidth: 1,
    borderColor: ActiveTheme.borderPrimary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  pickerText: {
    color: ActiveTheme.textPrimary,
    fontFamily: ActiveTheme.fonts?.mono,
    fontSize: Typography.size.md,
  },
  placeholderText: {
    color: ActiveTheme.textLabel,
  },
});

export default AppDatePicker;
