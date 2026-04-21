/**
 * AppBadge.tsx — Status badge / pill
 * AppAvatar.tsx — User avatar with initials fallback
 * AppDivider.tsx — Styled section divider
 * AppChip.tsx — Dismissible / selectable chip tags
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

// ─────────────────────────────────────────
// AppBadge
// ─────────────────────────────────────────
type BadgeStatus = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const BADGE_COLORS: Record<BadgeStatus, { bg: string; text: string; dot: string }> = {
  success: { bg: '#00C89622', text: '#00C896', dot: '#00C896' },
  error:   { bg: '#FF4C6A22', text: '#FF4C6A', dot: '#FF4C6A' },
  warning: { bg: '#FFB54722', text: '#FFB547', dot: '#FFB547' },
  info:    { bg: '#6C63FF22', text: '#6C63FF', dot: '#6C63FF' },
  neutral: { bg: '#3A3A5C',   text: '#A0A0C0', dot: '#A0A0C0' },
};

interface AppBadgeProps {
  label: string;
  status?: BadgeStatus;
  dot?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({ label, status = 'neutral', dot = true, icon, style }) => {
  const c = BADGE_COLORS[status];
  return (
    <View style={[badgeStyles.container, { backgroundColor: c.bg }, style]}>
      {dot && !icon && <View style={[badgeStyles.dot, { backgroundColor: c.dot }]} />}
      {icon && <Ionicons name={icon} size={11} color={c.text} style={{ marginRight: 3 }} />}
      <Text style={[badgeStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});


// ─────────────────────────────────────────
// AppAvatar
// ─────────────────────────────────────────
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZES: Record<AvatarSize, number> = { xs: 28, sm: 36, md: 44, lg: 56, xl: 72 };

const AVATAR_COLORS = ['#6C63FF', '#FF4C6A', '#00C896', '#FFB547', '#FF6B9D', '#4ECDC4'];

function getColor(name: string) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface AppAvatarProps {
  name: string;
  uri?: string;
  size?: AvatarSize;
  online?: boolean;
  style?: ViewStyle;
}

export const AppAvatar: React.FC<AppAvatarProps> = ({ name, uri, size = 'md', online, style }) => {
  const dim = AVATAR_SIZES[size];
  const color = getColor(name);
  const fontSize = dim * 0.36;
  return (
    <View style={[avatarStyles.wrapper, style]}>
      <View style={[avatarStyles.container, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color + '33', borderColor: color + '66' }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
        ) : (
          <Text style={[avatarStyles.initials, { fontSize, color }]}>{initials(name)}</Text>
        )}
      </View>
      {online !== undefined && (
        <View style={[avatarStyles.onlineDot, {
          backgroundColor: online ? '#00C896' : '#6B6B8A',
          width: dim * 0.28, height: dim * 0.28, borderRadius: dim * 0.14,
          bottom: 0, right: 0,
        }]} />
      )}
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  wrapper: { position: 'relative', alignSelf: 'flex-start' },
  container: { borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  initials: { fontWeight: '800', letterSpacing: 0.5 },
  onlineDot: { position: 'absolute', borderWidth: 2, borderColor: '#12122A' },
});


// ─────────────────────────────────────────
// AppDivider
// ─────────────────────────────────────────
interface AppDividerProps {
  label?: string;
  color?: string;
  style?: ViewStyle;
}

export const AppDivider: React.FC<AppDividerProps> = ({ label, color = '#2E2E4A', style }) => (
  <View style={[dividerStyles.container, style]}>
    <View style={[dividerStyles.line, { backgroundColor: color }]} />
    {label && <Text style={dividerStyles.label}>{label}</Text>}
    {label && <View style={[dividerStyles.line, { backgroundColor: color }]} />}
  </View>
);

const dividerStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  line: { flex: 1, height: 1 },
  label: { marginHorizontal: 12, fontSize: 11, fontWeight: '700', color: '#6B6B8A', letterSpacing: 1, textTransform: 'uppercase' },
});


// ─────────────────────────────────────────
// AppChip
// ─────────────────────────────────────────
interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: ViewStyle;
}

export const AppChip: React.FC<AppChipProps> = ({
  label, selected, onPress, onRemove, icon, color = '#6C63FF', style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      chipStyles.chip,
      { backgroundColor: selected ? color + '22' : '#1E1E3A', borderColor: selected ? color : '#3A3A5C' },
      style,
    ]}
    activeOpacity={0.75}
  >
    {icon && <Ionicons name={icon} size={13} color={selected ? color : '#6B6B8A'} style={{ marginRight: 4 }} />}
    <Text style={[chipStyles.label, { color: selected ? color : '#A0A0C0' }]}>{label}</Text>
    {onRemove && (
      <TouchableOpacity onPress={onRemove} style={chipStyles.removeBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="close" size={13} color={selected ? color : '#6B6B8A'} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, marginRight: 6, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  removeBtn: { marginLeft: 5 },
});
