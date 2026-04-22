import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/src/store/auth.store';
import { DropdownOption } from '../../../api/masterDropdownService';
import { OrganizationService } from '../../../api/organizationService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';

type TabKey = 'team' | 'settings' | 'danger';

type OrgFormState = {
    name: string;
    primaryEmail: string;
    primaryPhone: string;
    gstNumber: string;
};

type InviteFormState = {
    name: string;
    email: string;
    password: string;
    role: DropdownOption | null;
    branch: DropdownOption | null;
};

const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'team', label: 'Team Management', icon: 'people-outline' },
    { key: 'settings', label: 'Organization Settings', icon: 'settings-outline' },
    { key: 'danger', label: 'Danger Zone', icon: 'warning-outline' },
];

const getInitial = (name?: string) => (name?.trim()?.[0] || 'O').toUpperCase();
const getInitials = (name?: string) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'U';

export default function OrganizationSettingsScreen() {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const roleDropdown = useMasterDropdown({ endpoint: 'roles' });
    const branchDropdown = useMasterDropdown({ endpoint: 'branches' });

    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('team');

    const [organization, setOrganization] = useState<any>(null);
    const [activeMembers, setActiveMembers] = useState<any[]>([]);
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<Record<string, DropdownOption | null>>({});
    const [selectedBranches, setSelectedBranches] = useState<Record<string, DropdownOption | null>>({});

    const [orgForm, setOrgForm] = useState<OrgFormState>({
        name: '',
        primaryEmail: '',
        primaryPhone: '',
        gstNumber: '',
    });

    const [inviteForm, setInviteForm] = useState<InviteFormState>({
        name: '',
        email: '',
        password: '',
        role: null,
        branch: null,
    });

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string | null>(null);
    const [transferConfirmName, setTransferConfirmName] = useState('');
    const [deleteConfirmName, setDeleteConfirmName] = useState('');

    const [showOwnerListModal, setShowOwnerListModal] = useState(false);
    const [ownerSearch, setOwnerSearch] = useState('');

    const { user: currentUser, logout } = useAuthStore();
    const isOwner = useMemo(() => {
        const ownerId = organization?.owner?._id || organization?.owner;
        return !!currentUser?._id && ownerId === currentUser._id;
    }, [currentUser?._id, organization]);

    const ownerCandidates = useMemo(() => {
        const search = ownerSearch.trim().toLowerCase();
        if (!search) return activeMembers;
        return activeMembers.filter(
            (member) =>
                member?.name?.toLowerCase()?.includes(search) ||
                member?.email?.toLowerCase()?.includes(search)
        );
    }, [activeMembers, ownerSearch]);

    const organizationHealth = useMemo(() => {
        const totalBranches = organization?.branches?.length || branchDropdown.options.length || 0;
        return [
            {
                label: 'Workspace ID',
                value: organization?.uniqueShopId || 'Not assigned',
            },
            {
                label: 'Branches',
                value: `${totalBranches}`,
            },
            {
                label: 'Pending approvals',
                value: `${pendingMembers.length}`,
            },
        ];
    }, [branchDropdown.options.length, organization?.branches?.length, organization?.uniqueShopId, pendingMembers.length]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [orgRes, pendingRes] = await Promise.all([
                OrganizationService.getMyOrganization(),
                OrganizationService.getPendingMembers(),
            ]);

            const orgBody: any = orgRes?.data ?? orgRes;
            const pendingBody: any = pendingRes?.data ?? pendingRes;

            const orgData = orgBody?.data ?? orgBody;
            const pendingData = pendingBody?.data?.pendingMembers ?? pendingBody?.pendingMembers ?? [];
            const members = orgData?.members ?? [];

            setOrganization(orgData);
            setActiveMembers(members.filter((member: any) => member.status === 'approved' || !member.status));
            setPendingMembers(pendingData);
            setOrgForm({
                name: orgData?.name || '',
                primaryEmail: orgData?.primaryEmail || '',
                primaryPhone: orgData?.primaryPhone || '',
                gstNumber: orgData?.gstNumber || '',
            });
        } catch (error) {
            console.error('Organization settings load failed', error);
            Alert.alert('Error', 'Failed to load organization details.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void loadData();
    }, [loadData]);

    const updateOrgDetails = useCallback(async () => {
        if (!orgForm.name || !orgForm.primaryEmail || !orgForm.primaryPhone) {
            Alert.alert('Validation Error', 'Please check the required fields.');
            return;
        }

        setIsSaving(true);
        try {
            await OrganizationService.updateMyOrganization(orgForm);
            Alert.alert('Success', 'Organization details updated successfully.');
            await loadData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update organization details.');
        } finally {
            setIsSaving(false);
        }
    }, [loadData, orgForm]);

    const inviteUser = useCallback(async () => {
        if (!inviteForm.name || !inviteForm.email || !inviteForm.password || !inviteForm.role?.value || !inviteForm.branch?.value) {
            Alert.alert('Validation Error', 'Please fill in all required fields for the invitation.');
            return;
        }

        setIsSaving(true);
        try {
            await OrganizationService.inviteUser({
                name: inviteForm.name,
                email: inviteForm.email,
                password: inviteForm.password,
                role: inviteForm.role.value,
                branchId: inviteForm.branch.value,
            });
            Alert.alert('Success', 'Invitation sent successfully.');
            setShowInviteModal(false);
            setInviteForm({
                name: '',
                email: '',
                password: '',
                role: null,
                branch: null,
            });
            await loadData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to invite user.');
        } finally {
            setIsSaving(false);
        }
    }, [inviteForm, loadData]);

    const approveMember = useCallback(
        async (userId: string) => {
            const role = selectedRoles[userId];
            const branch = selectedBranches[userId];

            if (!role?.value || !branch?.value) {
                Alert.alert('Missing Info', 'Please assign a Role and Branch first.');
                return;
            }

            try {
                await OrganizationService.approveMember({
                    userId,
                    roleId: role.value,
                    branchId: branch.value,
                });
                Alert.alert('Success', 'Member approved successfully.');
                await loadData();
            } catch (error: any) {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to approve member.');
            }
        },
        [loadData, selectedBranches, selectedRoles]
    );

    const rejectMember = useCallback(
        (userId: string) => {
            Alert.alert('Confirm Rejection', 'Are you sure you want to reject this access request?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await OrganizationService.rejectMember({ userId });
                            Alert.alert('Done', 'Request rejected.');
                            await loadData();
                        } catch (error: any) {
                            Alert.alert('Error', error?.response?.data?.message || 'Failed to reject request.');
                        }
                    },
                },
            ]);
        },
        [loadData]
    );

    const transferOwnership = useCallback(async () => {
        if (!selectedNewOwnerId || transferConfirmName !== organization?.name) {
            Alert.alert('Transfer Error', 'Name confirmation does not match or no user selected.');
            return;
        }

        setIsSaving(true);
        try {
            await OrganizationService.forceTransferOwnership({ newOwnerId: selectedNewOwnerId });
            Alert.alert('Success', 'Ownership transferred successfully.');
            setShowTransferModal(false);
            await loadData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to transfer ownership.');
        } finally {
            setIsSaving(false);
        }
    }, [loadData, organization?.name, selectedNewOwnerId, transferConfirmName]);

    const cancelTransfer = useCallback(() => {
        Alert.alert('Cancel Transfer Request', 'Are you sure you want to cancel the pending ownership transfer request?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                onPress: async () => {
                    setIsSaving(true);
                    try {
                        await OrganizationService.cancelOwnershipTransfer();
                        Alert.alert('Success', 'Ownership transfer request cancelled successfully.');
                    } catch (error: any) {
                        Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel ownership transfer.');
                    } finally {
                        setIsSaving(false);
                    }
                },
            },
        ]);
    }, []);

    const deleteOrganization = useCallback(async () => {
        if (deleteConfirmName !== organization?.name) {
            Alert.alert('Validation Error', 'Organization name does not match.');
            return;
        }

        setIsSaving(true);
        try {
            await OrganizationService.deleteMyOrganization();
            Alert.alert('Deleted', 'Organization deleted successfully. Logging out...');
            await logout();
            router.replace('/' as any);
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to delete organization.');
        } finally {
            setIsSaving(false);
        }
    }, [deleteConfirmName, organization?.name]);

    const renderPickerModal = (
        visible: boolean,
        setVisible: (value: boolean) => void,
        title: string,
        dropdownHook: ReturnType<typeof useMasterDropdown>,
        onSelect: (option: DropdownOption) => void
    ) => (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalRoot}>
                <View style={styles.modalHeader}>
                    <ThemedText style={styles.modalTitle}>{title}</ThemedText>
                    <TouchableOpacity onPress={() => setVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.modalSearchWrap}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={theme.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor={theme.textTertiary}
                            value={dropdownHook.searchTerm}
                            onChangeText={dropdownHook.onSearch}
                        />
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.modalBody}>
                    {(dropdownHook.options || []).map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.optionRow}
                            onPress={() => {
                                onSelect(option);
                                setVisible(false);
                            }}
                        >
                            <ThemedText style={styles.optionTitle}>{option.label}</ThemedText>
                            <ThemedText style={styles.optionSub}>{option.value}</ThemedText>
                        </TouchableOpacity>
                    ))}
                    {dropdownHook.loading && <ActivityIndicator color={theme.accentPrimary} style={{ marginTop: Spacing.lg }} />}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    const [showInviteRoleModal, setShowInviteRoleModal] = useState(false);
    const [showInviteBranchModal, setShowInviteBranchModal] = useState(false);
    const [pendingPicker, setPendingPicker] = useState<{ type: 'role' | 'branch'; userId: string | null }>({
        type: 'role',
        userId: null,
    });
    const [showPendingPickerModal, setShowPendingPickerModal] = useState(false);

    const renderHero = () => (
        <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroContent}>
                <View style={styles.orgIdentity}>
                    <View style={styles.orgAvatar}>
                        <ThemedText style={styles.orgAvatarText}>{getInitial(organization?.name)}</ThemedText>
                    </View>

                    <View style={styles.flex1}>
                        <ThemedText style={styles.orgTitle}>
                            {organization?.name || 'Loading Workspace...'}
                        </ThemedText>
                        {!!organization && (
                            <View style={styles.metaRow}>
                                <View style={styles.idBadge}>
                                    <Ionicons name="finger-print-outline" size={12} color={theme.textSecondary} />
                                    <ThemedText style={styles.idBadgeText}>ID: {organization?.uniqueShopId}</ThemedText>
                                </View>
                                <ThemedText style={styles.metaText}>
                                    {organization?.branches?.length || 0} Branches
                                </ThemedText>
                                <View style={styles.liveRow}>
                                    <View style={styles.liveDot} />
                                    <ThemedText style={[styles.metaText, { color: theme.success }]}>Active ERP</ThemedText>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowInviteModal(true)}>
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <ThemedText style={styles.primaryBtnText}>Invite Member</ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStats = () =>
        !!organization && (
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View>
                        <ThemedText style={styles.statLabel}>Active Team</ThemedText>
                        <ThemedText style={styles.statValue}>{activeMembers.length}</ThemedText>
                    </View>
                    <View style={[styles.statIcon, { backgroundColor: `${theme.accentPrimary}12` }]}>
                        <Ionicons name="people-outline" size={18} color={theme.accentPrimary} />
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View>
                        <ThemedText style={styles.statLabel}>Pending Waitlist</ThemedText>
                        <ThemedText style={styles.statValue}>{pendingMembers.length}</ThemedText>
                    </View>
                    <View style={[styles.statIcon, { backgroundColor: `${theme.warning || '#d97706'}12` }]}>
                        <Ionicons name="time-outline" size={18} color={theme.warning || '#d97706'} />
                    </View>
                </View>

                <View style={styles.statCard}>
                    <View>
                        <ThemedText style={styles.statLabel}>Roles Configured</ThemedText>
                        <ThemedText style={styles.statValue}>{roleDropdown.options.length}</ThemedText>
                    </View>
                    <View style={[styles.statIcon, { backgroundColor: `${theme.success}12` }]}>
                        <Ionicons name="shield-outline" size={18} color={theme.success} />
                    </View>
                </View>
            </View>
        );

    const renderTabs = () => {
        const availableTabs = isOwner ? tabs : tabs.filter((tab) => tab.key !== 'danger');

        return (
            <View style={styles.workspaceCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                    {availableTabs.map((tab) => {
                        const active = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tabBtn, active && styles.tabBtnActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={15}
                                    color={active ? theme.accentPrimary : theme.textSecondary}
                                />
                                <ThemedText style={[styles.tabText, active && styles.tabTextActive]}>
                                    {tab.label}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.panelLayout}>
                    {activeTab === 'team' && (
                        <View style={styles.sectionGap}>
                            <View style={styles.teamLauncher}>
                                <View style={styles.launcherInfo}>
                                    <View style={styles.launcherIcon}>
                                        <Ionicons name="people-outline" size={22} color={theme.textPrimary} />
                                    </View>
                                    <View style={styles.flex1}>
                                        <ThemedText style={styles.sectionTitle}>Manage Active Team</ThemedText>
                                        <ThemedText style={styles.sectionSub}>
                                            View, edit, and manage all {activeMembers.length} active members across your organization.
                                        </ThemedText>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push('/users' as any)}>
                                    <ThemedText style={styles.outlineBtnText}>Open Team Directory</ThemedText>
                                    <Ionicons name="arrow-forward" size={14} color={theme.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.quickPanel}>
                                <View style={styles.sectionHeaderRow}>
                                    <ThemedText style={styles.sectionTitle}>Active Team Snapshot</ThemedText>
                                    <ThemedText style={styles.helperText}>
                                        {activeMembers.length} active member{activeMembers.length === 1 ? '' : 's'}
                                    </ThemedText>
                                </View>

                                {activeMembers.length > 0 ? (
                                    <View style={styles.memberPreviewList}>
                                        {activeMembers.slice(0, 5).map((member) => (
                                            <View key={member._id} style={styles.memberPreviewCard}>
                                                <View style={styles.memberPreviewAvatar}>
                                                    <ThemedText style={styles.memberPreviewAvatarText}>
                                                        {getInitials(member.name)}
                                                    </ThemedText>
                                                </View>
                                                <View style={styles.flex1}>
                                                    <ThemedText style={styles.memberPreviewName} numberOfLines={1}>
                                                        {member.name}
                                                    </ThemedText>
                                                    <ThemedText style={styles.memberPreviewMeta} numberOfLines={1}>
                                                        {member.email || 'No email'}
                                                    </ThemedText>
                                                </View>
                                                <View style={styles.memberStatusPill}>
                                                    <ThemedText style={styles.memberStatusText}>Active</ThemedText>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptySubtle}>
                                        <Ionicons name="people-outline" size={18} color={theme.textTertiary} />
                                        <ThemedText style={styles.emptySubtleText}>
                                            No active members found yet. Invite your first teammate to start collaboration.
                                        </ThemedText>
                                    </View>
                                )}
                            </View>

                            {pendingMembers.length > 0 ? (
                                <View style={styles.sectionGap}>
                                    <View style={styles.sectionHeaderRow}>
                                        <ThemedText style={styles.sectionTitle}>Pending Access Requests</ThemedText>
                                        <View style={styles.warnBadge}>
                                            <ThemedText style={styles.warnBadgeText}>{pendingMembers.length} New</ThemedText>
                                        </View>
                                    </View>

                                    {pendingMembers.map((member) => (
                                        <View key={member._id} style={styles.requestCard}>
                                            <View style={styles.reqHeader}>
                                                <View style={styles.reqAvatar}>
                                                    <ThemedText style={styles.reqAvatarText}>{getInitial(member.name)}</ThemedText>
                                                </View>
                                                <View style={styles.flex1}>
                                                    <ThemedText style={styles.reqName}>{member.name}</ThemedText>
                                                    <ThemedText style={styles.reqEmail}>{member.email}</ThemedText>
                                                </View>
                                            </View>

                                            <View style={styles.reqBody}>
                                                <View style={styles.fieldGroup}>
                                                    <ThemedText style={styles.fieldLabel}>Assign Role</ThemedText>
                                                    <TouchableOpacity
                                                        style={styles.inputLike}
                                                        onPress={() => {
                                                            setPendingPicker({ type: 'role', userId: member._id });
                                                            setShowPendingPickerModal(true);
                                                        }}
                                                    >
                                                        <ThemedText style={styles.inputLikeText}>
                                                            {selectedRoles[member._id]?.label || 'Select Role'}
                                                        </ThemedText>
                                                        <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.fieldGroup}>
                                                    <ThemedText style={styles.fieldLabel}>Assign Branch</ThemedText>
                                                    <TouchableOpacity
                                                        style={styles.inputLike}
                                                        onPress={() => {
                                                            setPendingPicker({ type: 'branch', userId: member._id });
                                                            setShowPendingPickerModal(true);
                                                        }}
                                                    >
                                                        <ThemedText style={styles.inputLikeText}>
                                                            {selectedBranches[member._id]?.label || 'Select Branch'}
                                                        </ThemedText>
                                                        <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <View style={styles.reqFooter}>
                                                <TouchableOpacity style={styles.ghostDangerBtn} onPress={() => rejectMember(member._id)}>
                                                    <Ionicons name="close" size={14} color={theme.error} />
                                                    <ThemedText style={[styles.ghostDangerText, { color: theme.error }]}>Reject</ThemedText>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.successBtn} onPress={() => void approveMember(member._id)}>
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                    <ThemedText style={styles.successBtnText}>Approve Access</ThemedText>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptySubtle}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.textTertiary} />
                                    <ThemedText style={styles.emptySubtleText}>
                                        No pending access requests. Your team is up to date.
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    )}

                    {activeTab === 'settings' && (
                        <View style={styles.formShell}>
                            <View style={styles.healthPanel}>
                                {organizationHealth.map((item) => (
                                    <View key={item.label} style={styles.healthItem}>
                                        <ThemedText style={styles.healthLabel}>{item.label}</ThemedText>
                                        <ThemedText style={styles.healthValue}>{item.value}</ThemedText>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.formHeader}>
                                <ThemedText style={styles.sectionTitle}>General Information</ThemedText>
                                <ThemedText style={styles.sectionSub}>
                                    Update your company&apos;s core identity and contact details.
                                </ThemedText>
                            </View>

                            <View style={styles.formGrid}>
                                <View style={[styles.fieldGroup, styles.fieldSpan2]}>
                                    <ThemedText style={styles.fieldLabel}>Business Name</ThemedText>
                                    <TextInput
                                        style={styles.textInput}
                                        value={orgForm.name}
                                        onChangeText={(value) => setOrgForm((prev) => ({ ...prev, name: value }))}
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <ThemedText style={styles.fieldLabel}>GST / Tax Number</ThemedText>
                                    <TextInput
                                        style={styles.textInput}
                                        value={orgForm.gstNumber}
                                        onChangeText={(value) => setOrgForm((prev) => ({ ...prev, gstNumber: value }))}
                                        placeholder="Optional"
                                        placeholderTextColor={theme.textTertiary}
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <ThemedText style={styles.fieldLabel}>Primary Email</ThemedText>
                                    <TextInput
                                        style={styles.textInput}
                                        value={orgForm.primaryEmail}
                                        onChangeText={(value) => setOrgForm((prev) => ({ ...prev, primaryEmail: value }))}
                                        keyboardType="email-address"
                                        placeholderTextColor={theme.textTertiary}
                                    />
                                </View>

                                <View style={styles.fieldGroup}>
                                    <ThemedText style={styles.fieldLabel}>Contact Phone</ThemedText>
                                    <TextInput
                                        style={styles.textInput}
                                        value={orgForm.primaryPhone}
                                        onChangeText={(value) => setOrgForm((prev) => ({ ...prev, primaryPhone: value }))}
                                        keyboardType="phone-pad"
                                        placeholderTextColor={theme.textTertiary}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.primaryBtn} onPress={() => void updateOrgDetails()} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={15} color="#fff" />
                                        <ThemedText style={styles.primaryBtnText}>Save Configuration</ThemedText>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'danger' && isOwner && (
                        <View style={styles.dangerWrap}>
                            <View style={styles.dangerHeader}>
                                <Ionicons name="shield-outline" size={22} color={theme.textTertiary} />
                                <View style={styles.flex1}>
                                    <ThemedText style={styles.sectionTitle}>Administrative Actions</ThemedText>
                                    <ThemedText style={styles.sectionSub}>
                                        Critical settings that affect the entire organization.
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.dangerList}>
                                <View style={styles.dangerRow}>
                                    <View style={styles.flex1}>
                                        <ThemedText style={styles.dangerTitle}>Transfer Ownership</ThemedText>
                                        <ThemedText style={styles.dangerSub}>
                                            Hand over full control. You will be downgraded to a regular Admin.
                                        </ThemedText>
                                    </View>
                                    <TouchableOpacity style={styles.outlineWarnBtn} onPress={() => setShowTransferModal(true)}>
                                        <ThemedText style={styles.outlineWarnText}>Transfer</ThemedText>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.dangerRow}>
                                    <View style={styles.flex1}>
                                        <ThemedText style={styles.dangerTitle}>Cancel Pending Transfer</ThemedText>
                                        <ThemedText style={styles.dangerSub}>
                                            Revoke an active transfer invitation immediately.
                                        </ThemedText>
                                    </View>
                                    <TouchableOpacity style={styles.outlineBtn} onPress={cancelTransfer}>
                                        <ThemedText style={styles.outlineBtnText}>Cancel Request</ThemedText>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.dangerRow, styles.dangerDestructive]}>
                                    <View style={styles.flex1}>
                                        <ThemedText style={[styles.dangerTitle, { color: theme.error }]}>Delete Organization</ThemedText>
                                        <ThemedText style={styles.dangerSub}>
                                            Permanently wipe all branches, users, and data. Irreversible.
                                        </ThemedText>
                                    </View>
                                    <TouchableOpacity style={styles.dangerBtn} onPress={() => setShowDeleteModal(true)}>
                                        <ThemedText style={styles.dangerBtnText}>Delete Forever</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (isLoading && !organization) {
        return (
            <ThemedView style={styles.loaderScreen}>
                <ActivityIndicator size="large" color={theme.accentPrimary} />
            </ThemedView>
        );
    }

    if (!isLoading && !organization) {
        return (
            <ThemedView style={styles.loaderScreen}>
                <View style={styles.emptyStateCard}>
                    <View style={styles.emptyStateIcon}>
                        <Ionicons name="business-outline" size={28} color={theme.accentPrimary} />
                    </View>
                    <ThemedText style={styles.emptyStateTitle}>Organization data unavailable</ThemedText>
                    <ThemedText style={styles.emptyStateText}>
                        We could not load the workspace right now. Pull to refresh or reopen this screen after your connection stabilizes.
                    </ThemedText>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => void loadData()}>
                        <Ionicons name="refresh-outline" size={15} color="#fff" />
                        <ThemedText style={styles.primaryBtnText}>Retry</ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView
                style={styles.safeArea}
                edges={['bottom', 'left', 'right']}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentPrimary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {renderHero()}
                    {renderStats()}
                    {renderTabs()}
                </ScrollView>
            </SafeAreaView>

            {renderPickerModal(showInviteRoleModal, setShowInviteRoleModal, 'Select Role', roleDropdown, (option) =>
                setInviteForm((prev) => ({ ...prev, role: option }))
            )}

            {renderPickerModal(showInviteBranchModal, setShowInviteBranchModal, 'Select Branch', branchDropdown, (option) =>
                setInviteForm((prev) => ({ ...prev, branch: option }))
            )}

            {renderPickerModal(
                showPendingPickerModal,
                setShowPendingPickerModal,
                pendingPicker.type === 'role' ? 'Assign Role' : 'Assign Branch',
                pendingPicker.type === 'role' ? roleDropdown : branchDropdown,
                (option) => {
                    if (!pendingPicker.userId) return;
                    if (pendingPicker.type === 'role') {
                        setSelectedRoles((prev) => ({ ...prev, [pendingPicker.userId!]: option }));
                    } else {
                        setSelectedBranches((prev) => ({ ...prev, [pendingPicker.userId!]: option }));
                    }
                }
            )}

            <Modal visible={showInviteModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalRoot}>
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle}>Invite Team Member</ThemedText>
                        <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalBody}>
                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Full Name</ThemedText>
                            <TextInput
                                style={styles.textInput}
                                value={inviteForm.name}
                                onChangeText={(value) => setInviteForm((prev) => ({ ...prev, name: value }))}
                                placeholder="e.g. John Doe"
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Email Address</ThemedText>
                            <TextInput
                                style={styles.textInput}
                                value={inviteForm.email}
                                onChangeText={(value) => setInviteForm((prev) => ({ ...prev, email: value }))}
                                keyboardType="email-address"
                                placeholder="e.g. john@company.com"
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Temporary Password</ThemedText>
                            <TextInput
                                style={styles.textInput}
                                value={inviteForm.password}
                                onChangeText={(value) => setInviteForm((prev) => ({ ...prev, password: value }))}
                                secureTextEntry
                                placeholder="Min 6 characters"
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Role</ThemedText>
                            <TouchableOpacity style={styles.inputLike} onPress={() => setShowInviteRoleModal(true)}>
                                <ThemedText style={styles.inputLikeText}>
                                    {inviteForm.role?.label || 'Select Role'}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Branch</ThemedText>
                            <TouchableOpacity style={styles.inputLike} onPress={() => setShowInviteBranchModal(true)}>
                                <ThemedText style={styles.inputLikeText}>
                                    {inviteForm.branch?.label || 'Select Branch'}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowInviteModal(false)}>
                                <ThemedText style={styles.ghostBtnText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={() => void inviteUser()} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="send-outline" size={15} color="#fff" />
                                        <ThemedText style={styles.primaryBtnText}>Send Invite</ThemedText>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={showTransferModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalRoot}>
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle}>Transfer Ownership</ThemedText>
                        <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalBody}>
                        <View style={styles.warnAlert}>
                            <Ionicons name="information-circle-outline" size={18} color={theme.warning || '#d97706'} />
                            <ThemedText style={styles.warnAlertText}>
                                Transferring ownership grants Super Admin privileges to the selected user. You will lose billing and deletion rights.
                            </ThemedText>
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Select New Owner</ThemedText>
                            <TouchableOpacity style={styles.inputLike} onPress={() => setShowOwnerListModal(true)}>
                                <ThemedText style={styles.inputLikeText}>
                                    {activeMembers.find((member) => member._id === selectedNewOwnerId)?.name || 'Search team member...'}
                                </ThemedText>
                                <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Confirm Organization Name</ThemedText>
                            <TextInput
                                style={styles.textInput}
                                value={transferConfirmName}
                                onChangeText={setTransferConfirmName}
                                placeholder={`Type ${organization?.name || ''} to confirm`}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowTransferModal(false)}>
                                <ThemedText style={styles.ghostBtnText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.warnBtn, (!selectedNewOwnerId || transferConfirmName !== organization?.name) && styles.disabledBtn]}
                                onPress={() => void transferOwnership()}
                                disabled={!selectedNewOwnerId || transferConfirmName !== organization?.name}
                            >
                                <ThemedText style={styles.warnBtnText}>Transfer Control</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={showDeleteModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalRoot}>
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle}>Delete Organization</ThemedText>
                        <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalBody}>
                        <View style={styles.criticalAlert}>
                            <Ionicons name="warning-outline" size={20} color={theme.error} />
                            <View style={styles.flex1}>
                                <ThemedText style={[styles.dangerTitle, { color: theme.error }]}>Critical Warning</ThemedText>
                                <ThemedText style={styles.dangerSub}>
                                    You are about to permanently delete {organization?.name}. All branches, users, and resources will be irrevocably wiped.
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText style={styles.fieldLabel}>Type the organization name to confirm</ThemedText>
                            <TextInput
                                style={styles.textInput}
                                value={deleteConfirmName}
                                onChangeText={setDeleteConfirmName}
                                placeholder={organization?.name || ''}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowDeleteModal(false)}>
                                <ThemedText style={styles.ghostBtnText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dangerBtn, deleteConfirmName !== organization?.name && styles.disabledBtn]}
                                onPress={() => void deleteOrganization()}
                                disabled={deleteConfirmName !== organization?.name || isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.dangerBtnText}>Delete Forever</ThemedText>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={showOwnerListModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalRoot}>
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle}>Select New Owner</ThemedText>
                        <TouchableOpacity onPress={() => setShowOwnerListModal(false)}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchWrap}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={18} color={theme.textTertiary} />
                            <TextInput
                                style={styles.searchInput}
                                value={ownerSearch}
                                onChangeText={setOwnerSearch}
                                placeholder="Search by name or email"
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalBody}>
                        {ownerCandidates.map((member) => (
                            <TouchableOpacity
                                key={member._id}
                                style={styles.optionRow}
                                onPress={() => {
                                    setSelectedNewOwnerId(member._id);
                                    setShowOwnerListModal(false);
                                }}
                            >
                                <View style={styles.flex1}>
                                    <ThemedText style={styles.optionTitle}>{member.name}</ThemedText>
                                    <ThemedText style={styles.optionSub}>{member.email}</ThemedText>
                                </View>
                                {selectedNewOwnerId === member._id && (
                                    <Ionicons name="checkmark-circle" size={18} color={theme.accentPrimary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </ThemedView>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgSecondary },
        safeArea: { flex: 1 },
        scrollContent: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 40 },
        loaderScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgSecondary },
        flex1: { flex: 1 },
        sectionGap: { gap: Spacing.xl },

        hero: {
            backgroundColor: theme.bgPrimary,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            padding: Spacing.xl,
            overflow: 'hidden',
            ...getElevation(2, theme),
        },
        heroGlow: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: theme.accentPrimary,
        },
        heroContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: Spacing.lg,
            flexWrap: 'wrap',
        },
        orgIdentity: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.lg,
            flex: 1,
        },
        orgAvatar: {
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: `${theme.accentPrimary}12`,
            borderWidth: 1,
            borderColor: `${theme.accentPrimary}30`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        orgAvatarText: {
            fontFamily: theme.fonts.heading,
            fontSize: 34,
            fontWeight: '700',
            color: theme.accentPrimary,
        },
        orgTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size['3xl'],
            fontWeight: '700',
            color: theme.textPrimary,
            marginBottom: 6,
        },
        metaRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.sm,
            alignItems: 'center',
        },
        idBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
        },
        idBadgeText: {
            fontFamily: theme.fonts.mono,
            fontSize: Typography.size.xs,
            color: theme.textSecondary,
            fontWeight: '600',
        },
        metaText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
        },
        liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        liveDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.success,
        },

        primaryBtn: {
            minHeight: 44,
            borderRadius: 12,
            paddingHorizontal: Spacing.lg,
            backgroundColor: theme.accentPrimary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        primaryBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            fontWeight: '700',
        },

        statsGrid: {
            gap: Spacing.md,
        },
        statCard: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 18,
            padding: Spacing.lg,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...getElevation(1, theme),
        },
        statLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            marginBottom: 4,
        },
        statValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size['2xl'],
            color: theme.textPrimary,
            fontWeight: '700',
        },
        statIcon: {
            width: 46,
            height: 46,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },

        workspaceCard: {
            backgroundColor: theme.bgPrimary,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            overflow: 'hidden',
            ...getElevation(1, theme),
        },
        tabsRow: {
            paddingHorizontal: Spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderPrimary,
            gap: 10,
        },
        tabBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.sm,
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        tabBtnActive: {
            borderBottomColor: theme.accentPrimary,
        },
        tabText: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            fontWeight: '600',
        },
        tabTextActive: {
            color: theme.accentPrimary,
        },
        panelLayout: {
            padding: Spacing.xl,
        },

        teamLauncher: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 18,
            padding: Spacing.xl,
            gap: Spacing.lg,
        },
        launcherInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.lg,
        },
        launcherIcon: {
            width: 54,
            height: 54,
            borderRadius: 16,
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sectionTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.lg,
            color: theme.textPrimary,
            fontWeight: '700',
            marginBottom: 4,
        },
        sectionSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            lineHeight: 20,
        },
        outlineBtn: {
            minHeight: 42,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            paddingHorizontal: Spacing.lg,
            backgroundColor: theme.bgPrimary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        outlineBtnText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        sectionHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        warnBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: `${theme.warning || '#d97706'}15`,
        },
        warnBadgeText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.warning || '#d97706',
            fontWeight: '700',
        },

        requestCard: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            borderRadius: 18,
            padding: Spacing.lg,
            gap: Spacing.lg,
        },
        reqHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        reqAvatar: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        reqAvatarText: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.md,
            color: theme.textSecondary,
            fontWeight: '700',
        },
        reqName: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        reqEmail: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        reqBody: {
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            borderRadius: 12,
            padding: Spacing.md,
            gap: Spacing.md,
        },
        reqFooter: {
            flexDirection: 'row',
            gap: Spacing.sm,
        },
        ghostDangerBtn: {
            flex: 1,
            minHeight: 42,
            borderRadius: 12,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        ghostDangerText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            fontWeight: '600',
        },
        successBtn: {
            flex: 1,
            minHeight: 42,
            borderRadius: 12,
            backgroundColor: theme.success,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        successBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            fontWeight: '700',
        },

        emptySubtle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: Spacing.xl,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderStyle: 'dashed',
            borderRadius: 14,
        },
        emptySubtleText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textTertiary,
            flex: 1,
        },
        helperText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            fontWeight: '600',
        },
        quickPanel: {
            gap: Spacing.md,
        },
        memberPreviewList: {
            gap: Spacing.sm,
        },
        memberPreviewCard: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 16,
            padding: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.md,
        },
        memberPreviewAvatar: {
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: `${theme.accentPrimary}12`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        memberPreviewAvatarText: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.sm,
            fontWeight: '700',
            color: theme.accentPrimary,
        },
        memberPreviewName: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        memberPreviewMeta: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        memberStatusPill: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: `${theme.success}12`,
        },
        memberStatusText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            fontWeight: '700',
            color: theme.success,
        },

        formShell: {
            gap: Spacing.xl,
        },
        healthPanel: {
            backgroundColor: theme.bgSecondary,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            padding: Spacing.lg,
            gap: Spacing.md,
        },
        healthItem: {
            backgroundColor: theme.bgPrimary,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            padding: Spacing.md,
            gap: 4,
        },
        healthLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            textTransform: 'uppercase',
            color: theme.textTertiary,
            fontWeight: '700',
            letterSpacing: 0.3,
        },
        healthValue: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
            fontWeight: '700',
        },
        formHeader: {
            gap: 4,
        },
        formGrid: {
            gap: Spacing.lg,
        },
        fieldSpan2: {},
        fieldGroup: {
            gap: 6,
        },
        fieldLabel: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            fontWeight: '600',
        },
        textInput: {
            minHeight: 44,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            backgroundColor: theme.bgPrimary,
            paddingHorizontal: 12,
            color: theme.textPrimary,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
        },
        inputLike: {
            minHeight: 44,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            backgroundColor: theme.bgPrimary,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        },
        inputLikeText: {
            flex: 1,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
        },

        dangerWrap: {
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: theme.bgPrimary,
        },
        dangerHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.md,
            padding: Spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSecondary,
            backgroundColor: theme.bgSecondary,
        },
        dangerList: {
            gap: 0,
        },
        dangerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.lg,
            padding: Spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSecondary,
        },
        dangerDestructive: {
            backgroundColor: `${theme.error}06`,
        },
        dangerTitle: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.md,
            color: theme.textPrimary,
            fontWeight: '600',
            marginBottom: 4,
        },
        dangerSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            lineHeight: 20,
        },
        outlineWarnBtn: {
            minHeight: 40,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.warning || '#d97706',
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        outlineWarnText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.warning || '#d97706',
            fontWeight: '600',
        },
        dangerBtn: {
            minHeight: 42,
            borderRadius: 12,
            backgroundColor: theme.error,
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dangerBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            fontWeight: '700',
        },
        warnBtn: {
            minHeight: 42,
            borderRadius: 12,
            backgroundColor: theme.warning || '#d97706',
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        warnBtnText: {
            color: '#fff',
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            fontWeight: '700',
        },
        disabledBtn: {
            opacity: 0.45,
        },

        modalRoot: {
            flex: 1,
            backgroundColor: theme.bgSecondary,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: Spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderPrimary,
            backgroundColor: theme.bgPrimary,
        },
        modalTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.xl,
            fontWeight: '700',
            color: theme.textPrimary,
        },
        modalSearchWrap: {
            padding: Spacing.lg,
            paddingBottom: 0,
        },
        searchBar: {
            minHeight: 44,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            backgroundColor: theme.bgPrimary,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        searchInput: {
            flex: 1,
            color: theme.textPrimary,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
        },
        modalBody: {
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: 40,
        },
        optionRow: {
            backgroundColor: theme.bgPrimary,
            borderWidth: 1,
            borderColor: theme.borderSecondary,
            borderRadius: 12,
            padding: Spacing.md,
            marginBottom: Spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.sm,
        },
        optionTitle: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textPrimary,
            fontWeight: '600',
        },
        optionSub: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.xs,
            color: theme.textTertiary,
            marginTop: 2,
        },
        modalFooter: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: Spacing.sm,
            marginTop: Spacing.md,
        },
        ghostBtn: {
            minHeight: 42,
            borderRadius: 12,
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
        },
        ghostBtnText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            fontWeight: '600',
        },
        warnAlert: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            padding: Spacing.md,
            borderRadius: 12,
            backgroundColor: `${theme.warning || '#d97706'}12`,
            borderWidth: 1,
            borderColor: `${theme.warning || '#d97706'}30`,
        },
        warnAlertText: {
            flex: 1,
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            lineHeight: 20,
        },
        criticalAlert: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            padding: Spacing.md,
            borderRadius: 12,
            backgroundColor: `${theme.error}10`,
            borderLeftWidth: 4,
            borderLeftColor: theme.error,
        },
        emptyStateCard: {
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
            backgroundColor: theme.bgPrimary,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.borderPrimary,
            padding: Spacing['2xl'],
            gap: Spacing.lg,
            alignItems: 'center',
            ...getElevation(2, theme),
        },
        emptyStateIcon: {
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: `${theme.accentPrimary}12`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyStateTitle: {
            fontFamily: theme.fonts.heading,
            fontSize: Typography.size.xl,
            color: theme.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
        },
        emptyStateText: {
            fontFamily: theme.fonts.body,
            fontSize: Typography.size.sm,
            color: theme.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
        },
    });