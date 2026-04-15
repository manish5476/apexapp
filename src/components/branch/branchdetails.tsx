import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 1. THEME TOKENS
// ==========================================
export const Typography = {
  size: { xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, '2xl': 18, '3xl': 22, '4xl': 28 },
  weight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
};

export const Spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, '3xl': 32, '4xl': 44 };
export const UI = { borderRadius: { sm: 6, md: 10, lg: 18, xl: 24, pill: 9999 }, borderWidth: { thin: 1, base: 2 } };

export const ActiveTheme = {
  name: 'Coastal Command',
  fonts: { heading: 'System', body: 'System', mono: 'monospace' },
  bgPrimary: '#f3f7f9',
  bgSecondary: '#ffffff',
  bgTernary: '#e2ecf1',
  textPrimary: '#072530',
  textSecondary: '#1a4d5e',
  textTertiary: '#427888',
  textLabel: '#7aaab8',
  borderPrimary: 'rgba(13,148,136,0.22)',
  borderSecondary: 'rgba(13,148,136,0.1)',
  accentPrimary: '#0a857a',
  accentSecondary: '#0fb3a4',
  success: '#047857',
  warning: '#9a5c00',
  error: '#b81818',
  info: '#0260a8',
  elevationShadow: 'rgba(10, 133, 122, 0.09)',
};

export type ThemeColors = typeof ActiveTheme;

export const getElevation = (level: number, theme: ThemeColors = ActiveTheme) => ({
  shadowColor: theme.elevationShadow,
  shadowOffset: { width: 0, height: level * 2 },
  shadowOpacity: level * 0.05 + 0.1,
  shadowRadius: level * 3,
  elevation: level * 2,
});

export const useAppTheme = () => ActiveTheme;

// ==========================================
// 2. MOCK ROUTER & SERVICES
// ==========================================
const router = {
  back: () => Alert.alert('Navigation', 'Going back to Branch List'),
  push: (route: string) => Alert.alert('Navigation', `Navigating to: ${route}`),
};

const MockUsers = [
  { _id: 'user_001', name: 'Eleanor Shellstrop' },
  { _id: 'user_002', name: 'Chidi Anagonye' }
];

const BranchService = {
  getBranchById: async (id: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (id === 'error') {
          reject(new Error('Branch not found.'));
        } else {
          resolve({
            data: {
              data: {
                _id: id || 'br_12345abc',
                name: 'Downtown Headquarters',
                isActive: true,
                isMainBranch: true,
                branchCode: 'HQ-1001',
                managerId: 'user_001',
                phoneNumber: '+91 98765 43210',
                createdAt: '2022-01-15T08:00:00.000Z',
                updatedAt: new Date().toISOString(),
                address: {
                  street: '123 Marine Drive',
                  city: 'Mumbai',
                  state: 'Maharashtra',
                  zipCode: '400020',
                  country: 'India'
                },
                organizationId: {
                  _id: 'org_999',
                  name: 'Apex Global Industries'
                }
              }
            }
          });
        }
      }, 1200); // Simulate network delay
    });
  }
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function BranchDetailsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- STATE ---
  const [branch, setBranch] = useState<any | null>(null);
  const [managerName, setManagerName] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchBranchData = async () => {
      setLoading(true);
      setIsError(false);

      try {
        const mockBranchId = 'br_12345abc'; // Simulate route param
        const response = await BranchService.getBranchById(mockBranchId) as any;

        if (response?.data?.data) {
          const branchData = response.data.data;
          setBranch(branchData);

          // Resolve Manager
          if (branchData.managerId) {
            const manager = MockUsers.find(u => u._id === branchData.managerId);
            if (manager) setManagerName(manager.name);
          }
        } else {
          setIsError(true);
        }
      } catch (err) {
        setIsError(true);
        Alert.alert('Error', 'Failed to load branch details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBranchData();
  }, []);

  // --- UTILS ---
  const formatAddress = (address: any) => {
    if (!address) return 'No address on file.';
    return [address.street, address.city, address.state, address.zipCode, address.country]
      .filter(p => p && p.trim())
      .join(', ');
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // --- RENDERS ---
  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Skeleton Header */}
          <View style={styles.header}>
            <View style={styles.skeletonCircle} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <View style={[styles.skeletonLine, { width: '60%', height: 20, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 14 }]} />
            </View>
          </View>
          {/* Skeleton Content */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.card, { height: 250, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.accentPrimary} />
            </View>
            <View style={[styles.card, { height: 180 }]} />
            <View style={[styles.card, { height: 120 }]} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (isError || !branch) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.errorState}>
            <View style={styles.errorIconBox}>
              <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
            </View>
            <Text style={styles.errorTitle}>Branch Not Found</Text>
            <Text style={styles.errorDesc}>The branch you are looking for does not exist or could not be loaded.</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={router.back}>
              <Ionicons name="arrow-back" size={20} color={theme.textPrimary} style={{ marginRight: Spacing.sm }} />
              <Text style={styles.outlineBtnText}>Back to Branches</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={router.back}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <Text style={styles.pageTitle} numberOfLines={1}>{branch.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.idBadge}>
                <Ionicons name="pricetag-outline" size={12} /> {branch.branchCode || branch._id.slice(-6).toUpperCase()}
              </Text>
              <Text style={styles.categoryBadge} numberOfLines={1}>Org: {branch.organizationId?._id || 'N/A'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/branches/${branch._id}/edit`)}>
            <Ionicons name="pencil" size={20} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* PROFILE CARD */}
          <View style={styles.card}>
            <View style={styles.cardBanner} />
            <View style={styles.profileContent}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  <Ionicons name="business" size={32} color={theme.accentPrimary} />
                </View>
                <View style={[styles.statusDot, { backgroundColor: branch.isActive ? theme.success : theme.error }]} />
              </View>

              <Text style={styles.contactName}>{branch.name}</Text>
              <Text style={styles.contactEmail}>{branch.isMainBranch ? 'Headquarters' : 'Branch Office'}</Text>

              <View style={styles.tagsRow}>
                <View style={[styles.tag, { backgroundColor: branch.isActive ? `${theme.success}15` : `${theme.error}15` }]}>
                  <Text style={[styles.tagText, { color: branch.isActive ? theme.success : theme.error }]}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {branch.isMainBranch && (
                  <View style={[styles.tag, { backgroundColor: `${theme.info}15` }]}>
                    <Ionicons name="star" size={12} color={theme.info} style={{ marginRight: 4 }} />
                    <Text style={[styles.tagText, { color: theme.info }]}>Main Branch</Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <View style={styles.iconBox}><Ionicons name="person-outline" size={16} color={theme.textSecondary} /></View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Manager</Text>
                    <Text style={styles.infoValue}>{managerName}</Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.iconBox}><Ionicons name="call-outline" size={16} color={theme.textSecondary} /></View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={[styles.infoValue, { color: theme.accentPrimary }]}>{branch.phoneNumber || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.iconBox}><Ionicons name="calendar-outline" size={16} color={theme.textSecondary} /></View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Established</Text>
                    <Text style={styles.infoValue}>{formatDate(branch.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* LOCATION DETAILS CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color={theme.accentPrimary} />
              <Text style={styles.cardTitle}>Location Details</Text>
            </View>

            <View style={styles.fullAddressBox}>
              <Text style={styles.infoLabel}>Formatted Address</Text>
              <Text style={styles.fullAddressText}>{formatAddress(branch.address)}</Text>
            </View>

            <View style={styles.addressGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Street</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{branch.address?.street || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{branch.address?.city || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>State</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{branch.address?.state || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Zip Code</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{branch.address?.zipCode || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Country</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{branch.address?.country || '—'}</Text>
              </View>
            </View>
          </View>

          {/* ORGANIZATION CONTEXT CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="git-network-outline" size={20} color={theme.accentPrimary} />
              <Text style={styles.cardTitle}>Organization Context</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Parent Organization</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary, fontWeight: Typography.weight.semibold }]}>
                {branch.organizationId?.name || branch.organizationId || 'Unknown Org'}
              </Text>
            </View>
            <View style={[styles.divider, { marginVertical: Spacing.md }]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hierarchy Level</Text>
              <Text style={styles.infoValue}>
                {branch.isMainBranch ? 'Level 1 (Top)' : 'Level 2 (Sub)'}
              </Text>
            </View>
          </View>

          {/* SYSTEM INFO CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textTertiary} />
              <Text style={styles.cardTitle}>System Info</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{formatDate(branch.updatedAt)}</Text>
            </View>
            <View style={[styles.divider, { marginVertical: Spacing.md }]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database ID</Text>
              <Text style={[styles.infoValue, { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs }]}>
                {branch._id}
              </Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  safeArea: {
    flex: 1,
  },

  // SKELETON
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.bgTernary,
  },
  skeletonLine: {
    backgroundColor: theme.bgTernary,
    borderRadius: UI.borderRadius.sm,
  },

  // ERROR STATE
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  errorIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  errorTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  errorDesc: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderRadius: UI.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    backgroundColor: theme.bgSecondary,
  },
  outlineBtnText: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: theme.textPrimary,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: theme.bgSecondary,
    borderBottomWidth: UI.borderWidth.thin,
    borderBottomColor: theme.borderPrimary,
    ...getElevation(1, theme),
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitles: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  pageTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: Spacing.sm,
  },
  idBadge: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.textTertiary,
  },
  categoryBadge: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.textTertiary,
    flexShrink: 1,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.accentPrimary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // LAYOUT
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  card: {
    backgroundColor: theme.bgPrimary,
    borderRadius: UI.borderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    overflow: 'hidden',
    ...getElevation(1, theme),
  },
  divider: {
    height: 1,
    backgroundColor: theme.borderPrimary,
    width: '100%',
  },

  // PROFILE CARD
  cardBanner: {
    height: 80,
    backgroundColor: theme.accentPrimary,
    opacity: 0.15,
  },
  profileContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: -40, // Pulls content up over the banner
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.bgSecondary,
    borderWidth: 4,
    borderColor: theme.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    ...getElevation(2, theme),
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.bgPrimary,
  },
  contactName: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
  },
  contactEmail: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: UI.borderRadius.pill,
  },
  tagText: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoList: {
    width: '100%',
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: UI.borderRadius.sm,
    backgroundColor: theme.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderPrimary,
    marginRight: Spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textSecondary,
    fontWeight: Typography.weight.medium,
  },

  // DATA CARDS (Location, Org Context, System)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderPrimary,
    backgroundColor: theme.bgSecondary,
  },
  cardTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: theme.textPrimary,
    marginLeft: Spacing.sm,
  },
  fullAddressBox: {
    padding: Spacing.lg,
    backgroundColor: theme.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderPrimary,
  },
  fullAddressText: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
    lineHeight: 22,
    marginTop: 4,
  },
  addressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
  },
  gridItem: {
    width: '50%',
    padding: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});