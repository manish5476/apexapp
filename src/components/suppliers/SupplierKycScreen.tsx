import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SupplierService } from '../../api/supplierService';

const DOC_TYPES = [
    { label: 'GST Certificate', value: 'GST_CERTIFICATE' },
    { label: 'PAN Card', value: 'PAN_CARD' },
    { label: 'Cancelled Cheque', value: 'CANCELLED_CHEQUE' },
    { label: 'MSME Certificate', value: 'MSME_CERTIFICATE' },
    { label: 'Other Document', value: 'OTHER' }
];

export default function SupplierKycScreen() {
    const { id } = useLocalSearchParams();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);

    // Upload State
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<any | null>(null);

    // --- Data Fetching ---
    const loadDocuments = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await SupplierService.getSupplierById(id as string) as any;
            const docs = res?.data?.data?.documents || res?.data?.documents || [];
            setDocuments(docs);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to load KYC documents.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [id]);

    // --- Handlers ---
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];

                // 5MB Size Validation
                if (file.size && file.size > 5 * 1024 * 1024) {
                    Alert.alert('File too large', 'Maximum file size allowed is 5MB.');
                    return;
                }

                setSelectedFile(file);
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const uploadDocument = async () => {
        if (!selectedFile || !selectedDocType) {
            Alert.alert('Incomplete', 'Please select a document type and a file.');
            return;
        }

        setIsUploading(true);
        try {
            const fileToUpload = {
                uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.mimeType || 'application/octet-stream',
            };

            const res = await SupplierService.uploadKycDocument(id as string, fileToUpload, selectedDocType) as any;

            Alert.alert('Success', 'Document uploaded successfully.');
            setSelectedFile(null);
            setSelectedDocType(null);

            const updatedDocs = res?.data?.supplier?.documents || res?.data?.documents || [];
            if (updatedDocs.length > 0) setDocuments(updatedDocs);
            else loadDocuments(); // fallback refresh

        } catch (err: any) {
            console.error('Upload error', err);
            Alert.alert('Upload Failed', err.response?.data?.message || 'Could not upload document.');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteDocument = (docIndex: number) => {
        Alert.alert('Confirm Deletion', 'Are you sure you want to delete this document?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await SupplierService.deleteKycDocument(id as string, docIndex);

                        // Remove from local array to update UI instantly without another API call
                        const updatedDocs = [...documents];
                        updatedDocs.splice(docIndex, 1);
                        setDocuments(updatedDocs);

                        Alert.alert('Success', 'Document removed successfully.');
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.message || 'Failed to delete document.');
                    }
                }
            }
        ]);
    };

    const viewDocument = async (url: string) => {
        if (!url) return;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Cannot open this file format directly.');
        }
    };

    // --- Render Helpers ---
    const selectedTypeLabel = DOC_TYPES.find(d => d.value === selectedDocType)?.label || 'Select Type';
    const getFileSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    const renderDocCard = ({ item, index }: { item: any, index: number }) => {
        const isPdf = item.url?.toLowerCase().includes('.pdf');
        const docLabel = DOC_TYPES.find(d => d.value === item.docType)?.label || item.docType;

        return (
            <View style={styles.docCard}>
                <View style={[styles.docIconBox, { backgroundColor: isPdf ? `${theme.error}15` : `${theme.accentPrimary}15` }]}>
                    <Ionicons name={isPdf ? 'document-text' : 'image'} size={24} color={isPdf ? theme.error : theme.accentPrimary} />
                </View>

                <View style={styles.docInfo}>
                    <ThemedText style={styles.docType}>{docLabel}</ThemedText>
                    <ThemedText style={styles.docDate}>
                        Uploaded: {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: item.verified ? `${theme.success}15` : `${theme.warning}15` }]}>
                        <ThemedText style={[styles.statusText, { color: item.verified ? theme.success : theme.warning }]}>
                            {item.verified ? 'VERIFIED' : 'PENDING'}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.docActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => viewDocument(item.url)}>
                        <Ionicons name="eye-outline" size={22} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => deleteDocument(index)}>
                        <Ionicons name="trash-outline" size={22} color={theme.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <ThemedText style={styles.headerTitle}>KYC Documents</ThemedText>
                    </View>
                    <View style={{ width: 24 }} /> {/* Spacer to balance header */}
                </View>

                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.accentPrimary} />
                        <ThemedText style={styles.loadingText}>Loading Documents...</ThemedText>
                    </View>
                ) : (
                    <FlatList
                        data={documents}
                        keyExtractor={(_, index) => String(index)}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={styles.uploadSection}>
                                <ThemedText style={styles.sectionTitle}>Upload New Document</ThemedText>

                                <ThemedText style={styles.inputLabel}>Document Type <ThemedText style={{ color: theme.error }}>*</ThemedText></ThemedText>
                                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowTypeSelector(true)}>
                                    <ThemedText style={{ color: selectedDocType ? theme.textPrimary : theme.textTertiary, fontFamily: theme.fonts.body }}>
                                        {selectedTypeLabel}
                                    </ThemedText>
                                    <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
                                </TouchableOpacity>

                                <ThemedText style={styles.inputLabel}>Select File (PDF, JPG, PNG) <ThemedText style={{ color: theme.error }}>*</ThemedText></ThemedText>
                                <TouchableOpacity
                                    style={[styles.fileUploadArea, selectedFile && { borderColor: theme.success, backgroundColor: `${theme.success}05` }]}
                                    onPress={pickDocument}
                                >
                                    <Ionicons
                                        name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"}
                                        size={32}
                                        color={selectedFile ? theme.success : theme.accentPrimary}
                                        style={{ marginBottom: Spacing.sm }}
                                    />
                                    <ThemedText style={styles.fileUploadText}>
                                        {selectedFile ? selectedFile.name : 'Tap to browse files'}
                                    </ThemedText>
                                    {selectedFile && (
                                        <ThemedText style={styles.fileSizeText}>
                                            ({getFileSize(selectedFile.size)})
                                        </ThemedText>
                                    )}
                                </TouchableOpacity>

                                {selectedFile && (
                                    <TouchableOpacity style={styles.clearFileBtn} onPress={() => setSelectedFile(null)}>
                                        <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
                                        <ThemedText style={styles.clearFileText}>Clear selection</ThemedText>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.uploadBtn, (!selectedFile || !selectedDocType) && styles.uploadBtnDisabled]}
                                    onPress={uploadDocument}
                                    disabled={!selectedFile || !selectedDocType || isUploading}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color={theme.bgSecondary} />
                                    ) : (
                                        <>
                                            <Ionicons name="cloud-upload" size={20} color={theme.bgSecondary} />
                                            <ThemedText style={styles.uploadBtnText}>Upload Document</ThemedText>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.divider} />
                                <ThemedText style={styles.sectionTitle}>Uploaded Documents ({documents.length})</ThemedText>
                            </View>
                        }
                        renderItem={renderDocCard}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconBox}>
                                    <Ionicons name="folder-open-outline" size={48} color={theme.textTertiary} />
                                </View>
                                <ThemedText style={styles.emptyTitle}>No Documents Yet</ThemedText>
                                <ThemedText style={styles.emptyDesc}>Upload verification files above.</ThemedText>
                            </View>
                        }
                    />
                )}

            </SafeAreaView>

            {/* --- DOC TYPE SELECTOR MODAL --- */}
            <Modal visible={showTypeSelector} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowTypeSelector(false)} />
                    <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Select Document Type</ThemedText>
                            <TouchableOpacity onPress={() => setShowTypeSelector(false)}>
                                <Ionicons name="close" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView bounces={false}>
                            {DOC_TYPES.map(doc => (
                                <TouchableOpacity
                                    key={doc.value}
                                    style={[styles.docTypeItem, selectedDocType === doc.value && { backgroundColor: `${theme.accentPrimary}05` }]}
                                    onPress={() => {
                                        setSelectedDocType(doc.value);
                                        setShowTypeSelector(false);
                                    }}
                                >
                                    <ThemedText style={[styles.docTypeItemText, selectedDocType === doc.value && { color: theme.accentPrimary, fontWeight: Typography.weight.bold }]}>
                                        {doc.label}
                                    </ThemedText>
                                    {selectedDocType === doc.value && <Ionicons name="checkmark-circle" size={24} color={theme.accentPrimary} />}
                                </TouchableOpacity>
                            ))}
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
    loadingText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.md },

    // HEADER
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    listContent: { padding: Spacing.xl, paddingBottom: 100 },

    // UPLOAD SECTION
    uploadSection: { backgroundColor: theme.bgPrimary, padding: Spacing.xl, borderRadius: UI.borderRadius.xl, marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    sectionTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: Spacing.lg },

    inputLabel: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: theme.textSecondary, marginBottom: Spacing.sm },
    dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, backgroundColor: theme.bgSecondary, borderRadius: UI.borderRadius.md, paddingHorizontal: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, marginBottom: Spacing.xl },

    fileUploadArea: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, borderStyle: 'dashed', borderWidth: 2, borderColor: theme.borderPrimary, borderRadius: UI.borderRadius.lg, backgroundColor: theme.bgSecondary, marginBottom: Spacing.md },
    fileUploadText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: theme.textPrimary, textAlign: 'center' },
    fileSizeText: { fontFamily: theme.fonts.mono, fontSize: Typography.size.xs, color: theme.textTertiary, marginTop: 4 },

    clearFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: Spacing.lg },
    clearFileText: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textTertiary },

    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 50, backgroundColor: theme.accentPrimary, borderRadius: UI.borderRadius.lg, marginTop: Spacing.sm, ...getElevation(2, theme) },
    uploadBtnDisabled: { backgroundColor: theme.borderPrimary, elevation: 0, shadowOpacity: 0 },
    uploadBtnText: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.bgSecondary },

    divider: { height: 1, backgroundColor: theme.borderPrimary, marginVertical: Spacing['2xl'] },

    // DOC CARD
    docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, padding: Spacing.md, borderRadius: UI.borderRadius.lg, marginBottom: Spacing.md, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary, ...getElevation(1, theme) },
    docIconBox: { width: 48, height: 48, borderRadius: UI.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    docInfo: { flex: 1, marginRight: Spacing.sm },
    docType: { fontFamily: theme.fonts.heading, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: theme.textPrimary, marginBottom: 2 },
    docDate: { fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textTertiary, marginBottom: Spacing.xs },

    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: UI.borderRadius.sm },
    statusText: { fontFamily: theme.fonts.body, fontSize: 9, fontWeight: Typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

    docActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgSecondary },

    // EMPTY STATE
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, borderWidth: UI.borderWidth.thin, borderColor: theme.borderPrimary },
    emptyTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: theme.textPrimary },
    emptyDesc: { fontFamily: theme.fonts.body, fontSize: Typography.size.sm, color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },

    // BOTTOM SHEET
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: UI.borderRadius.xl, borderTopRightRadius: UI.borderRadius.xl, maxHeight: '80%' },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    sheetTitle: { fontFamily: theme.fonts.heading, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: theme.textPrimary },

    docTypeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: UI.borderWidth.thin, borderBottomColor: theme.borderPrimary },
    docTypeItemText: { fontFamily: theme.fonts.body, fontSize: Typography.size.md, color: theme.textPrimary },
});