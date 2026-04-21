import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { DropdownEndpoint, DropdownOption } from '../api/masterDropdownService';
import { Spacing, ThemeType, Themes, Typography, UI, getElevation } from '../constants/theme';
import { useMasterDropdown } from '../hooks/use-master-dropdown';

// Import your design tokens

interface MasterDropdownProps {
  endpoint: DropdownEndpoint;
  value: any;
  onChange: (value: any) => void;
  onSelect?: (data: any) => void;
  isMulti?: boolean;
  placeholder?: string;
  disabled?: boolean;
  themeVariant?: ThemeType; // ✅ Inject theme directly
  extraParams?: any;
}

export const MasterDropdown = ({
  endpoint,
  value,
  onChange,
  onSelect,
  isMulti = false,
  placeholder = 'Select an option...',
  disabled = false,
  themeVariant = 'light', // Default to your Light Default theme
  extraParams = {},
}: MasterDropdownProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Grab the specific color palette based on the chosen variant
  const activeTheme = Themes[themeVariant];

  // Dynamically generate styles using your token system
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const {
    options,
    loading,
    searchTerm,
    onSearch,
    onEndReached,
    isLastPage,
    getSelectedData
  } = useMasterDropdown({ endpoint, initialValue: value, isMulti, extraParams });

  const handleSelect = (item: DropdownOption) => {
    if (isMulti) {
      const currentValue = Array.isArray(value) ? value : [];
      const isSelected = currentValue.includes(item.value);

      let newValue;
      if (isSelected) {
        newValue = currentValue.filter((id) => id !== item.value);
      } else {
        newValue = [...currentValue, item.value];
      }
      onChange(newValue);
      if (onSelect) onSelect(getSelectedData(newValue));
    } else {
      onChange(item.value);
      if (onSelect) onSelect(item.data);
      setModalVisible(false);
    }
  };

  const displayText = useMemo(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) return placeholder;

    if (isMulti && Array.isArray(value)) {
      const selectedLabels = options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label);
      return selectedLabels.length > 0 ? selectedLabels.join(', ') : `${value.length} selected`;
    }

    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : 'Loading...';
  }, [value, options, isMulti, placeholder]);

  return (
    <View style={styles.container}>
      {/* Trigger Button with Elevation 1 applied */}
      <TouchableOpacity
        style={[
          styles.triggerButton,
          disabled && styles.disabledButton,
          !disabled && getElevation(1, activeTheme) // ✅ Applying your shadow helper
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]} numberOfLines={1}>
          {displayText}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          {/* Modal Content with Elevation 3 applied for depth */}
          <View style={[styles.modalContent, getElevation(3, activeTheme)]}>

            <View style={styles.header}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchTerm}
                onChangeText={onSearch}
                placeholderTextColor={activeTheme.textLabel}
              />
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = isMulti
                  ? Array.isArray(value) && value.includes(item.value)
                  : value === item.value;

                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && styles.selectedOptionItem]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => (
                <View style={styles.footerLoader}>
                  {loading && <ActivityIndicator size="small" color={activeTheme.accentPrimary} />}
                  {!loading && options.length === 0 && (
                    <Text style={styles.noDataText}>No results found.</Text>
                  )}
                </View>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// ✅ Dynamic Style Generator using your UI Constants, Typography, and Spacing
const getStyles = (theme: typeof Themes.light) => StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.md
  },
  triggerButton: {
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderSecondary,
    borderRadius: UI.borderRadius.md,
    padding: Spacing.lg,
    backgroundColor: theme.bgPrimary,
    justifyContent: 'center',
    minHeight: 50,
  },
  disabledButton: {
    backgroundColor: theme.disabled,
    borderColor: theme.borderPrimary
  },
  triggerText: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.normal,
    fontFamily: theme.fonts.body,
    color: theme.textPrimary
  },
  placeholderText: {
    color: theme.textLabel
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly dim background
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.bgSecondary,
    borderTopLeftRadius: UI.borderRadius.xl,
    borderTopRightRadius: UI.borderRadius.xl,
    height: '75%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: theme.bgTernary,
    borderRadius: UI.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.size.xl,
    fontFamily: theme.fonts.body,
    color: theme.textPrimary,
  },
  closeButton: {
    marginLeft: Spacing.lg,
    padding: Spacing.md
  },
  closeButtonText: {
    color: theme.accentPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    fontFamily: theme.fonts.body
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
  },
  selectedOptionItem: {
    backgroundColor: theme.bgTernary
  },
  optionText: {
    fontSize: Typography.size.xl,
    color: theme.textSecondary,
    fontFamily: theme.fonts.body
  },
  selectedOptionText: {
    color: theme.accentPrimary,
    fontWeight: Typography.weight.medium
  },
  checkIcon: {
    color: theme.accentPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold
  },
  footerLoader: {
    padding: Spacing['2xl'],
    alignItems: 'center'
  },
  noDataText: {
    color: theme.textTertiary,
    fontSize: Typography.size.md,
    fontFamily: theme.fonts.body
  },
});