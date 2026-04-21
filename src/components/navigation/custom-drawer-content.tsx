import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Typography, UI, getElevation } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useAuthStore } from '../../store/auth.store';
import { IconSymbol } from '../ui/icon-symbol';

export function CustomDrawerContent(props: any) {
  const { user, logout } = useAuthStore();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      
      {/* Main Drawer Content */}

      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HEADER SECTION */}
        <View style={[styles.header, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderPrimary }]}>
          <View style={styles.avatarWrapper}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={[styles.avatarImage, { borderColor: theme.borderPrimary }]} />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: `${theme.accentPrimary}15`, borderColor: `${theme.accentPrimary}30` }]}>
                <IconSymbol name="person.fill" size={32} color={theme.accentPrimary} />
              </View>
            )}
            
            {/* Online Status Indicator */}
            <View style={[styles.statusBadge, { borderColor: theme.bgSecondary, backgroundColor: theme.success || '#10b981' }]} />
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Apex User'}
            </Text>
            
            <View style={styles.roleRow}>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                {user?.email || 'admin@apexcrm.com'}
              </Text>
              
              {/* Optional CRM Role Badge */}
              <View style={[styles.roleBadge, { backgroundColor: `${theme.accentPrimary}15` }]}>
                <Text style={[styles.roleBadgeText, { color: theme.accentPrimary }]}>
                  {user?.role || 'Admin'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* NAVIGATION ITEMS */}
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* FOOTER SECTION */}
      <View style={[styles.footer, { 
        borderTopColor: theme.borderPrimary, 
        paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl)
      }]}>
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary }]} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.logoutIconContainer, { backgroundColor: `${theme.error || '#ef4444'}15` }]}>
            <Ionicons name="log-out-outline" size={20} color={theme.error || '#ef4444'} />
          </View>
          <Text style={[styles.logoutText, { color: theme.error || '#ef4444' }]}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: theme.textTertiary }]}>
          Apex CRM v2.4.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // HEADER STYLES
  scrollContent: {
    flexGrow: 1,
  },
  
  // HEADER STYLES
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    borderBottomWidth: UI.borderWidth.thin,
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  userInfo: {
    gap: 4,
  },
  userName: {
    fontFamily: 'System', // Replace with your theme.fonts.heading if available
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    letterSpacing: -0.5,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userEmail: {
    flex: 1,
    fontFamily: 'System', // Replace with your theme.fonts.body if available
    fontSize: Typography.size.sm,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: UI.borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // NAV ITEMS
  drawerItemsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // FOOTER STYLES
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: UI.borderWidth.thin,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: UI.borderRadius.xl,
    borderWidth: UI.borderWidth.thin,
    gap: Spacing.md,
    ...getElevation(1, { elevationShadow: 'rgba(0,0,0,0.05)' } as any),
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.size.xs,
    marginTop: Spacing.xl,
    letterSpacing: 0.5,
  }
});
// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
// import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
// import { useAuthStore } from '../../store/auth.store';
// import { useAppTheme } from '../../hooks/use-app-theme';
// import { Spacing, UI, Typography, getElevation } from '../../constants/theme';
// import { IconSymbol } from '../ui/icon-symbol';
// import { router } from 'expo-router';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// export function CustomDrawerContent(props: any) {
//   const { user, logout } = useAuthStore();
//   const theme = useAppTheme();
//   const insets = useSafeAreaInsets();

//   const handleLogout = async () => {
//     await logout();
//     router.replace('/(auth)/login');
//   };

//   return (
//     <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
//       <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
//         {/* Header Section */}
//         <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
//           <View style={[styles.avatarContainer, { backgroundColor: theme.bgTernary, borderColor: theme.accentPrimary }]}>
//             <IconSymbol name="person.fill" size={40} color={theme.accentPrimary} />
//           </View>
//           <View style={styles.userInfo}>
//             <Text style={[styles.userName, { color: theme.textPrimary }]}>
//               {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Apex User'}
//             </Text>
//             <Text style={[styles.userEmail, { color: theme.textTertiary }]} numberOfLines={1}>
//               {user?.email || 'admin@apexcrm.com'}
//             </Text>
//           </View>
//         </View>

//         {/* Navigation Items */}
//         <View style={styles.drawerItemsContainer}>
//           <DrawerItemList {...props} />
//         </View>
//       </DrawerContentScrollView>

//       {/* Footer Section with Logout */}
//       <View style={[styles.footer, { 
//         borderTopColor: theme.borderPrimary, 
//         paddingBottom: insets.bottom + Spacing.xl 
//       }]}>
//         <TouchableOpacity 
//           style={[styles.logoutButton, { backgroundColor: theme.bgTernary }]} 
//           onPress={handleLogout}
//           activeOpacity={0.7}
//         >
//           <View style={[styles.logoutIconContainer, { backgroundColor: '#fee2e2' }]}>
//             <IconSymbol name="paperplane.fill" size={20} color="#ef4444" />
//           </View>
//           <Text style={[styles.logoutText, { color: '#ef4444' }]}>Logout</Text>
//         </TouchableOpacity>
        
//         <Text style={[styles.versionText, { color: theme.textLabel }]}>
//           Apex CRM v2.4.0
//         </Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingTop: 0,
//   },
//   header: {
//     padding: Spacing['2xl'],
//     paddingTop: Spacing['4xl'],
//     borderBottomWidth: UI.borderWidth.thin,
//     marginBottom: Spacing.md,
//   },
//   avatarContainer: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     marginBottom: Spacing.lg,
//     ...getElevation(1, { elevationShadow: 'rgba(0,0,0,0.1)' } as any),
//   },
//   userInfo: {
//     gap: 2,
//   },
//   userName: {
//     fontSize: Typography.size.xl,
//     fontWeight: Typography.weight.bold,
//   },
//   userEmail: {
//     fontSize: Typography.size.sm,
//     fontWeight: Typography.weight.normal,
//   },
//   drawerItemsContainer: {
//     paddingHorizontal: Spacing.md,
//   },
//   footer: {
//     paddingHorizontal: Spacing['2xl'],
//     paddingTop: Spacing.xl,
//     borderTopWidth: UI.borderWidth.thin,
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: Spacing.md,
//     borderRadius: UI.borderRadius.lg,
//     gap: Spacing.lg,
//   },
//   logoutIconContainer: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logoutText: {
//     fontSize: Typography.size.md,
//     fontWeight: Typography.weight.semibold,
//   },
//   versionText: {
//     textAlign: 'center',
//     fontSize: Typography.size.xs,
//     marginTop: Spacing.xl,
//     opacity: 0.6,
//   }
// });
