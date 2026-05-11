import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Spacing, ThemeColors, Typography, UI } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useSettingsStore } from '../../store/settings.store';
import { SecurityUtils } from '../../utils/security';

import { ThemeSelector } from '../../components/ThemeSelector';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { themeType, setThemeType, biometricEnabled, setBiometricEnabled } = useSettingsStore();

  const toggleBiometrics = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const success = await SecurityUtils.canUseBiometrics();
      if (!success) {
        Alert.alert('Not Available', 'Biometric authentication is not set up on this device.');
        return;
      }
      setBiometricEnabled(true);
    } else {
      setBiometricEnabled(false);
      await SecurityUtils.disableBiometrics();
    }
  };

  const handleClearCredentials = () => {
    Alert.alert(
      'Clear Credentials',
      'This will disable biometric login and remove stored credentials. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await SecurityUtils.disableBiometrics();
            setBiometricEnabled(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          <ThemedText style={styles.headerSub}>Manage your workspace & security</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* THEME SECTION */}
          <Section label="Appearance" styles={styles}>
            <ThemeSelector />
          </Section>

          {/* SECURITY SECTION */}
          <Section label="Security & Biometrics" styles={styles}>
            <View style={styles.card}>
              <SettingRow
                icon="finger-print"
                label="Biometric Login"
                sub="Use Fingerprint/FaceID for quick access"
                theme={theme}
                styles={styles}
              >
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometrics}
                  trackColor={{ false: theme.borderPrimary, true: `${theme.accentPrimary}80` }}
                  thumbColor={biometricEnabled ? theme.accentPrimary : '#f4f3f4'}
                />
              </SettingRow>

              {biometricEnabled && (
                <ThemedText style={styles.noteText}>
                  Note: You'll need to log in manually once more to securely save your credentials for biometric use.
                </ThemedText>
              )}

              <View style={styles.divider} />

              <SettingRow
                icon="shield-checkmark"
                label="Clear Stored Data"
                sub="Delete saved credentials from this device"
                theme={theme}
                styles={styles}
                onPress={handleClearCredentials}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
              </SettingRow>
            </View>
          </Section>

          {/* APP INFO */}
          <Section label="About" styles={styles}>
            <View style={styles.card}>
              <SettingRow icon="information-circle" label="Version" sub="Apex CRM v2.4.0 (Stable)" theme={theme} styles={styles} />
              <View style={styles.divider} />
              <SettingRow icon="help-circle" label="Help & Support" sub="Visit our help center" theme={theme} styles={styles} />
            </View>
          </Section>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ label, children, styles }: { label: string; children: React.ReactNode; styles: any }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

function SettingRow({ icon, label, sub, theme, styles, children, onPress }: {
  icon: string; label: string; sub?: string; theme: ThemeColors; styles: any; children?: React.ReactNode; onPress?: () => void;
}) {
  const Content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.accentPrimary}12` }]}>
        <Ionicons name={icon as any} size={20} color={theme.accentPrimary} />
      </View>
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {sub && <ThemedText style={styles.rowSub}>{sub}</ThemedText>}
      </View>
      {children}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{Content}</TouchableOpacity>;
  }
  return Content;
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.size['4xl'],
    fontWeight: '800',
    letterSpacing: -1,
  },
  headerSub: {
    fontSize: Typography.size.md,
    color: 'rgba(128,128,128,0.6)',
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(128,128,128,0.5)',
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: UI.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: Typography.size.md,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: Typography.size.xs,
    color: 'rgba(128,128,128,0.6)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginHorizontal: Spacing.xl,
  },
  noteText: {
    fontSize: 10,
    color: 'rgba(128,128,128,0.6)',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    fontStyle: 'italic',
  }
});
