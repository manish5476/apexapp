import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { User } from '../api/userService';
import { getElevation, Spacing, ThemeColors, Typography, UI } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemedText } from './themed-text';

// --- IMPORT YOUR TOKENS HERE ---
// Ensure the path matches where your tokens are stored
// import { Spacing, ThemeColors, Typography, UI, getElevation } from '../theme/tokens';

interface UserListCardProps {
  user: User;
  onPress: (id: string) => void;
}

export function UserListCard({ user, onPress }: UserListCardProps) {
  const theme = useAppTheme();

  // Dynamically generate styles based on the active theme
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Status Badge Logic
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return theme.success;
      case 'pending': return theme.warning;
      case 'inactive': return theme.textLabel;
      case 'suspended': return theme.error;
      case 'rejected': return theme.error;
      default: return theme.textTertiary;
    }
  };

  const roleName: string = (user.role && typeof user.role === 'object') ? user.role.name : String(user.role || 'No Role');
  const branchName: string = (user.branchId && typeof user.branchId === 'object') ? user.branchId.name : String(user.branchId || 'Global');

  return (
    <TouchableOpacity
      onPress={() => onPress(user._id)}
      activeOpacity={0.7}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarInitials}>
                {user.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          {user.isLoginBlocked && (
            <View style={styles.lockIcon}>
              <Ionicons name="lock-closed" size={10} color={theme.bgSecondary} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.name}>{user.name}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(user.status)}15` }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                {user.status}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.email} numberOfLines={1}>{user.email}</ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Ionicons name="briefcase-outline" size={14} color={theme.textTertiary} />
          <ThemedText style={styles.metaText}>{roleName}</ThemedText>
        </View>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
          <ThemedText style={styles.metaText}>{branchName}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- DYNAMIC STYLESHEET BASED ON TOKENS ---
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.xl,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...getElevation(1, theme),
  },
  header: {
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: UI.borderRadius.pill,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.bgPrimary,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: theme.fonts.heading,
    color: theme.accentPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.error,
    alignItems: 'center',
    justifyContent: 'center',
    // Using the card's background color creates a seamless "cutout" effect 
    // that works perfectly in both light and dark modes
    borderWidth: UI.borderWidth.base,
    borderColor: theme.bgSecondary,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: UI.borderRadius.sm,
  },
  statusText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  email: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: theme.bgPrimary, // Gives the footer a slight contrast from the main card body
    borderTopWidth: UI.borderWidth.thin,
    borderTopColor: theme.borderPrimary,
    gap: Spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: theme.textTertiary,
  },
});
// import { Ionicons } from '@expo/vector-icons';
// import React from 'react';
// import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
// import { User } from '../api/userService';
// import { Spacing, UI } from '../constants/theme';
// import { useAppTheme } from '../hooks/use-app-theme';
// import { ThemedText } from './themed-text';

// interface UserListCardProps {
//   user: User;
//   onPress: (id: string) => void;
// }

// export function UserListCard({ user, onPress }: UserListCardProps) {
//   const theme = useAppTheme();

//   // Status Badge Logic
//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'approved': return theme.success;
//       case 'pending': return theme.warning;
//       case 'inactive': return theme.textLabel;
//       case 'suspended': return theme.error;
//       case 'rejected': return theme.error;
//       default: return theme.textTertiary;
//     }
//   };

//   const roleName: string = (user.role && typeof user.role === 'object') ? user.role.name : String(user.role || 'No Role');
//   const branchName: string = (user.branchId && typeof user.branchId === 'object') ? user.branchId.name : String(user.branchId || 'Global');

//   return (
//     <TouchableOpacity
//       onPress={() => onPress(user._id)}
//       activeOpacity={0.7}
//       style={[styles.card, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}
//     >
//       <View style={styles.header}>
//         <View style={styles.avatarContainer}>
//           {user.avatar ? (
//             <Image source={{ uri: user.avatar }} style={styles.avatar} />
//           ) : (
//             <View style={[styles.avatarPlaceholder, { backgroundColor: theme.bgTernary }]}>
//               <ThemedText style={{ color: theme.accentPrimary, fontWeight: 'bold' }}>
//                 {user.name.charAt(0).toUpperCase()}
//               </ThemedText>
//             </View>
//           )}
//           {user.isLoginBlocked && (
//             <View style={[styles.lockIcon, { backgroundColor: theme.error }]}>
//               <Ionicons name="lock-closed" size={10} color="white" />
//             </View>
//           )}
//         </View>

//         <View style={styles.info}>
//           <View style={styles.nameRow}>
//             <ThemedText type="defaultSemiBold" style={styles.name}>{user.name}</ThemedText>
//             <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(user.status)}20` }]}>
//               <ThemedText style={[styles.statusText, { color: getStatusColor(user.status) }]}>
//                 {user.status}
//               </ThemedText>
//             </View>
//           </View>

//           <ThemedText style={styles.email} numberOfLines={1}>{user.email}</ThemedText>
//         </View>
//       </View>

//       <View style={[styles.footer, { borderTopColor: theme.borderSecondary }]}>
//         <View style={styles.meta}>
//           <Ionicons name="briefcase-outline" size={14} color={theme.textTertiary} />
//           <ThemedText style={styles.metaText}>{roleName}</ThemedText>
//         </View>
//         <View style={styles.meta}>
//           <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
//           <ThemedText style={styles.metaText}>{branchName}</ThemedText>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     borderRadius: UI.borderRadius.lg,
//     borderWidth: 1,
//     marginBottom: Spacing.md,
//     overflow: 'hidden',
//   },
//   header: {
//     padding: Spacing.lg,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   avatarContainer: {
//     position: 'relative',
//   },
//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   avatarPlaceholder: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   lockIcon: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: 'white',
//   },
//   info: {
//     flex: 1,
//     marginLeft: Spacing.md,
//   },
//   nameRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 2,
//   },
//   name: {
//     fontSize: 15,
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 6,
//   },
//   statusText: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     textTransform: 'uppercase',
//   },
//   email: {
//     fontSize: 12,
//     opacity: 0.6,
//   },
//   footer: {
//     flexDirection: 'row',
//     padding: Spacing.md,
//     borderTopWidth: StyleSheet.hairlineWidth,
//     gap: Spacing.lg,
//   },
//   meta: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   metaText: {
//     fontSize: 11,
//     opacity: 0.7,
//   },
// });
