import { BranchService } from '@/src/api/BranchService'; // Assuming this exists based on previous files
import { SupplierService } from '@/src/api/supplierService';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as z from 'zod';

// --- VALIDATION SCHEMA ---
const contactSchema = z.object({
    name: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    isPrimary: z.boolean().optional(),
});

const supplierSchema = z.object({
    companyName: z.string().min(1, 'Company Name is required'),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    contacts: z.array(contactSchema).optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().default('India'),
    }).optional(),
    bankDetails: z.object({
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        bankName: z.string().optional(),
        ifscCode: z.string().optional(),
        branch: z.string().optional(),
    }).optional(),
    openingBalance: z.number().optional(),
    paymentTerms: z.string().optional(),
    creditLimit: z.number().optional(),
    branchesSupplied: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function SupplierFormScreen() {
    const { id } = useLocalSearchParams();
    const isEditMode = !!id;
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom Inputs State
    const [tagInput, setTagInput] = useState('');
    const [branches, setBranches] = useState<any[]>([]);
    const [showBranchModal, setShowBranchModal] = useState(false);

    const { control, handleSubmit, setValue, getValues, reset, watch, formState: { errors } } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema) as any,
        defaultValues: {
            companyName: '',
            tags: [],
            contacts: [],
            address: { country: 'India' },
            bankDetails: {},
            openingBalance: 0,
            creditLimit: 0,
            branchesSupplied: [],
            isActive: true,
        }
    });

    const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
        control,
        name: 'contacts',
    });

    // --- Data Fetching ---
    useEffect(() => {
        const initData = async () => {
            try {
                // Fetch Branches for dropdown
                const bRes = await BranchService.getAllBranches() as any;
                setBranches(bRes?.data?.data || bRes?.data || []);

                if (isEditMode) {
                    const res = await SupplierService.getSupplierById(id as string) as any;
                    const s = res?.data?.data || res?.data;

                    if (s) {
                        // Map branch objects to IDs if necessary
                        const mappedBranches = Array.isArray(s.branchesSupplied)
                            ? s.branchesSupplied.map((b: any) => typeof b === 'object' ? b._id : b)
                            : [];

                        reset({
                            ...s,
                            branchesSupplied: mappedBranches,
                        });
                    }
                }
            } catch (err: any) {
                Alert.alert('Error', err.response?.data?.message || 'Failed to load data.');
            } finally {
                setIsLoading(false);
            }
        };
        initData();
    }, [id, isEditMode, reset]);

    // --- Handlers ---
    const handleAddTag = () => {
        if (tagInput.trim()) {
            const currentTags = getValues('tags') || [];
            if (!currentTags.includes(tagInput.trim())) {
                setValue('tags', [...currentTags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = getValues('tags') || [];
        setValue('tags', currentTags.filter(t => t !== tagToRemove));
    };

    const toggleBranchSelection = (branchId: string) => {
        const currentSelected = getValues('branchesSupplied') || [];
        if (currentSelected.includes(branchId)) {
            setValue('branchesSupplied', currentSelected.filter(id => id !== branchId));
        } else {
            setValue('branchesSupplied', [...currentSelected, branchId]);
        }
    };

    const onSubmit = async (data: SupplierFormData) => {
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await SupplierService.updateSupplier(id as string, data);
                Alert.alert('Success', 'Supplier updated successfully.');
            } else {
                await SupplierService.createSupplier(data);
                Alert.alert('Success', 'Supplier created successfully.');
            }
            router.back();
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to save supplier.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color={theme.accentPrimary} />
            </ThemedView>
        );
    }

    const selectedBranches = watch('branchesSupplied') || [];
    const currentTags = watch('tags') || [];
    const isActive = watch('isActive');

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <ThemedText style={styles.headerTitle}>{isEditMode ? 'Edit Supplier' : 'New Supplier'}</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>Enter supplier details below</ThemedText>
                    </View>
                    <View style={{ width: 24 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* SECTION 1: BUSINESS */}
                        <View style={styles.sectionCard}>
                            <ThemedText style={styles.sectionTitle}>Business & Classification</ThemedText>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Company Name <ThemedText style={{ color: theme.error }}>*</ThemedText></ThemedText>
                                <Controller
                                    control={control}
                                    name="companyName"
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput style={[styles.input, errors.companyName && styles.inputError]} placeholder="e.g., Global Tech Suppliers" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )}
                                />
                                {errors.companyName && <ThemedText style={styles.errorText}>{errors.companyName.message}</ThemedText>}
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>Category</ThemedText>
                                    <Controller control={control} name="category" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="e.g., Hardware" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>Primary Phone</ThemedText>
                                    <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Primary Email</ThemedText>
                                <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                                    <TextInput style={styles.input} placeholder="jane@supplier.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                )} />
                                {errors.email && <ThemedText style={styles.errorText}>{errors.email.message}</ThemedText>}
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>GST Number</ThemedText>
                                    <Controller control={control} name="gstNumber" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="GSTIN" autoCapitalize="characters" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>PAN Number</ThemedText>
                                    <Controller control={control} name="panNumber" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="PAN" autoCapitalize="characters" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Tags</ThemedText>
                                <View style={styles.tagInputWrapper}>
                                    <TextInput
                                        style={styles.tagInput}
                                        placeholder="Type and press add..."
                                        placeholderTextColor={theme.textTertiary}
                                        value={tagInput}
                                        onChangeText={setTagInput}
                                        onSubmitEditing={handleAddTag}
                                    />
                                    <TouchableOpacity style={styles.tagAddBtn} onPress={handleAddTag}>
                                        <Ionicons name="add" size={20} color={theme.bgSecondary} />
                                    </TouchableOpacity>
                                </View>
                                {currentTags.length > 0 && (
                                    <View style={styles.tagsContainer}>
                                        {currentTags.map(tag => (
                                            <View key={tag} style={styles.tagChip}>
                                                <ThemedText style={styles.tagChipText}>{tag}</ThemedText>
                                                <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                                                    <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* SECTION 2: CONTACTS */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText style={styles.sectionTitle}>Organization Contacts</ThemedText>
                                <TouchableOpacity style={styles.addSmallBtn} onPress={() => appendContact({ name: '', department: 'Other', phone: '', email: '', isPrimary: false })}>
                                    <Ionicons name="add" size={16} color={theme.accentPrimary} />
                                    <ThemedText style={styles.addSmallBtnText}>Add</ThemedText>
                                </TouchableOpacity>
                            </View>

                            {contactFields.length === 0 ? (
                                <ThemedText style={styles.emptyStateText}>No additional contacts added yet.</ThemedText>
                            ) : (
                                contactFields.map((field, index) => (
                                    <View key={field.id} style={styles.contactCard}>
                                        <View style={styles.contactHeader}>
                                            <ThemedText style={styles.contactHeaderTitle}>Contact {index + 1}</ThemedText>
                                            <TouchableOpacity onPress={() => removeContact(index)}>
                                                <Ionicons name="trash" size={20} color={theme.error} />
                                            </TouchableOpacity>
                                        </View>

                                        <Controller control={control} name={`contacts.${index}.name`} render={({ field: { onChange, value } }) => (
                                            <TextInput style={styles.contactInput} placeholder="Contact Name" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                        )} />

                                        <View style={styles.row}>
                                            <Controller control={control} name={`contacts.${index}.phone`} render={({ field: { onChange, value } }) => (
                                                <TextInput style={[styles.contactInput, { flex: 1, marginRight: Spacing.sm }]} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                            )} />
                                            <Controller control={control} name={`contacts.${index}.department`} render={({ field: { onChange, value } }) => (
                                                <TextInput style={[styles.contactInput, { flex: 1 }]} placeholder="Dept (e.g. Sales)" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                            )} />
                                        </View>

                                        <Controller control={control} name={`contacts.${index}.email`} render={({ field: { onChange, value } }) => (
                                            <TextInput style={styles.contactInput} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                        )} />

                                        <Controller control={control} name={`contacts.${index}.isPrimary`} render={({ field: { onChange, value } }) => (
                                            <TouchableOpacity style={styles.checkboxRow} onPress={() => onChange(!value)} activeOpacity={0.8}>
                                                <Ionicons name={value ? "checkbox" : "square-outline"} size={24} color={value ? theme.accentPrimary : theme.textTertiary} />
                                                <ThemedText style={styles.checkboxLabel}>Mark as Primary Contact</ThemedText>
                                            </TouchableOpacity>
                                        )} />
                                    </View>
                                ))
                            )}
                        </View>

                        {/* SECTION 3: ADDRESS */}
                        <View style={styles.sectionCard}>
                            <ThemedText style={styles.sectionTitle}>Primary Address</ThemedText>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Street / Building</ThemedText>
                                <Controller control={control} name="address.street" render={({ field: { onChange, value } }) => (
                                    <TextInput style={styles.input} placeholder="123 Industrial Area" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                )} />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>City</ThemedText>
                                    <Controller control={control} name="address.city" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="City" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>State</ThemedText>
                                    <Controller control={control} name="address.state" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="State" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>Zip Code</ThemedText>
                                    <Controller control={control} name="address.zipCode" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="Zip" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>Country</ThemedText>
                                    <Controller control={control} name="address.country" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="Country" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                            </View>
                        </View>

                        {/* SECTION 4: BANK DETAILS */}
                        <View style={styles.sectionCard}>
                            <ThemedText style={styles.sectionTitle}>Bank Details</ThemedText>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Account Name</ThemedText>
                                <Controller control={control} name="bankDetails.accountName" render={({ field: { onChange, value } }) => (
                                    <TextInput style={styles.input} placeholder="Beneficiary Name" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                )} />
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Account Number</ThemedText>
                                <Controller control={control} name="bankDetails.accountNumber" render={({ field: { onChange, value } }) => (
                                    <TextInput style={styles.input} placeholder="A/C Number" keyboardType="number-pad" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                )} />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>Bank Name</ThemedText>
                                    <Controller control={control} name="bankDetails.bankName" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="e.g., HDFC" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>IFSC Code</ThemedText>
                                    <Controller control={control} name="bankDetails.ifscCode" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="IFSC" autoCapitalize="characters" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                    )} />
                                </View>
                            </View>
                        </View>

                        {/* SECTION 5: FINANCIALS */}
                        <View style={styles.sectionCard}>
                            <ThemedText style={styles.sectionTitle}>Financials & Operations</ThemedText>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
                                    <ThemedText style={styles.label}>Opening Balance</ThemedText>
                                    <Controller control={control} name="openingBalance" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={theme.textTertiary} value={String(value || '')} onChangeText={v => onChange(Number(v) || 0)} />
                                    )} />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <ThemedText style={styles.label}>Credit Limit</ThemedText>
                                    <Controller control={control} name="creditLimit" render={({ field: { onChange, value } }) => (
                                        <TextInput style={styles.input} placeholder="0 (Unltd)" keyboardType="numeric" placeholderTextColor={theme.textTertiary} value={String(value || '')} onChangeText={v => onChange(Number(v) || 0)} />
                                    )} />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Payment Terms</ThemedText>
                                <Controller control={control} name="paymentTerms" render={({ field: { onChange, value } }) => (
                                    <TextInput style={styles.input} placeholder="e.g., Net 30" placeholderTextColor={theme.textTertiary} value={value} onChangeText={onChange} />
                                )} />
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Branches Supplied</ThemedText>
                                <TouchableOpacity style={styles.dropdownSim} onPress={() => setShowBranchModal(true)}>
                                    <ThemedText style={{ color: selectedBranches.length > 0 ? theme.textPrimary : theme.textTertiary }}>
                                        {selectedBranches.length > 0 ? `${selectedBranches.length} Branches Selected` : 'Select branches'}
                                    </ThemedText>
                                    <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.row}>
                                <ThemedText style={[styles.label, { flex: 1, marginBottom: 0 }]}>Supplier is Active</ThemedText>
                                <Controller control={control} name="isActive" render={({ field: { onChange, value } }) => (
                                    <Switch
                                        value={value}
                                        onValueChange={onChange}
                                        trackColor={{ false: theme.borderPrimary, true: theme.success }}
                                        thumbColor={Platform.OS === 'ios' ? undefined : theme.bgSecondary}
                                    />
                                )} />
                            </View>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>

                {/* FOOTER ACTIONS */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={isSubmitting}>
                        <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator color={theme.bgSecondary} />
                        ) : (
                            <>
                                <ThemedText style={styles.submitBtnText}>{isEditMode ? 'Save Changes' : 'Create Supplier'}</ThemedText>
                                <Ionicons name="checkmark-circle" size={20} color={theme.bgSecondary} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* BRANCHES MULTI-SELECT MODAL */}
            <Modal visible={showBranchModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowBranchModal(false)} />
                    <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Select Branches</ThemedText>
                            <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                                <Ionicons name="close" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                            {branches.map(branch => {
                                const isSelected = selectedBranches.includes(branch._id);
                                return (
                                    <TouchableOpacity
                                        key={branch._id}
                                        style={[styles.branchItem, isSelected && { backgroundColor: `${theme.accentPrimary}05` }]}
                                        onPress={() => toggleBranchSelection(branch._id)}
                                    >
                                        <ThemedText style={[styles.branchItemText, isSelected && { color: theme.accentPrimary, fontWeight: 'bold' }]}>
                                            {branch.name}
                                        </ThemedText>
                                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? theme.accentPrimary : theme.textTertiary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </ThemedView>
    );
}

// --- STYLES ---
const createStyles = (theme: ThemeColors, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    headerSubtitle: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textSecondary, marginTop: 2 },

    scrollContent: { padding: Spacing.lg, paddingBottom: 40 },

    sectionCard: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.lg },

    addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: UI.borderRadius.sm, borderWidth: 1, borderColor: theme.accentPrimary, backgroundColor: `${theme.accentPrimary}10` },
    addSmallBtnText: { fontFamily: theme.fonts.body, fontSize: 12, fontWeight: Typography.weight.bold, color: theme.accentPrimary },

    row: { flexDirection: 'row', alignItems: 'center' },
    formGroup: { marginBottom: Spacing.lg },
    label: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.xs },

    input: { height: 48, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    inputError: { borderColor: theme.error },
    errorText: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.error, marginTop: 4 },

    dropdownSim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },

    // TAGS
    tagInputWrapper: { flexDirection: 'row', gap: Spacing.sm },
    tagInput: { flex: 1, height: 48, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, fontSize: Typography.size.md, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    tagAddBtn: { width: 48, height: 48, backgroundColor: theme.accentPrimary, borderRadius: UI.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${theme.accentPrimary}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.borderRadius.pill, borderWidth: 1, borderColor: `${theme.accentPrimary}30` },
    tagChipText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textPrimary },

    // CONTACTS
    emptyStateText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.md },
    contactCard: { backgroundColor: theme.bgSecondary, padding: Spacing.md, borderRadius: UI.borderRadius.md, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    contactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    contactHeaderTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textSecondary },
    contactInput: { height: 42, backgroundColor: theme.bgPrimary, borderRadius: UI.borderRadius.sm, paddingHorizontal: Spacing.md, fontSize: Typography.size.sm, fontFamily: theme.fonts.body, color: theme.textPrimary, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.sm },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
    checkboxLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textPrimary },

    // FOOTER
    footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.xl, backgroundColor: theme.bgPrimary, borderTopWidth: UI.borderWidth.thin, borderTopColor: theme.borderPrimary, paddingBottom: Math.max(insets.bottom, Spacing.xl) },
    cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: UI.borderRadius.lg, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary },
    cancelBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    submitBtn: { flex: 2, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: UI.borderRadius.lg, backgroundColor: theme.accentPrimary, ...getElevation(2, theme) },
    submitBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

    // BRANCH MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    branchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    branchItemText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary },
});