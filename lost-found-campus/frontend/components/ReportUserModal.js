import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../config/axios';
import { useTheme } from '../context/ThemeContext';

const REASONS = [
    { id: 'harassment', label: 'Harassment', icon: 'hand-left', color: '#EF4444' },
    { id: 'fake_account', label: 'Fake Account', icon: 'person-remove', color: '#F59E0B' },
    { id: 'scam', label: 'Scam / Fraud', icon: 'alert-circle', color: '#DC2626' },
    { id: 'inappropriate', label: 'Inappropriate Behavior', icon: 'warning', color: '#F97316' },
    { id: 'spam', label: 'Spam', icon: 'trash', color: '#8B5CF6' },
    { id: 'impersonation', label: 'Impersonation', icon: 'people', color: '#3B82F6' },
    { id: 'hate_speech', label: 'Hate Speech', icon: 'megaphone', color: '#EC4899' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

export default function ReportUserModal({ visible, onClose, reportedUserId, reportedUserName }) {
    const { theme, isDarkMode } = useTheme();
    const [selectedReason, setSelectedReason] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = reason, 2 = details, 3 = confirm

    const showMsg = (title, msg) => {
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
    };

    const handleSubmit = async () => {
        if (!selectedReason) return showMsg('Required', 'Please select a reason.');

        setLoading(true);
        try {
            await apiClient.post('/user-reports', {
                reportedUserId,
                reason: selectedReason,
                description
            });

            showMsg('✅ Report Submitted', 'Thank you for keeping our community safe. Our team will review this report.');
            resetAndClose();
        } catch (error) {
            showMsg('Error', error.response?.data?.message || 'Failed to submit report.');
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setSelectedReason(null);
        setDescription('');
        setStep(1);
        onClose();
    };

    const selectedReasonObj = REASONS.find(r => r.id === selectedReason);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            {step > 1 && (
                                <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={20} color={theme.text} />
                                </TouchableOpacity>
                            )}
                            <Text style={[styles.title, { color: theme.text }]}>
                                {step === 1 ? '🚨 Report Account' : step === 2 ? '📝 Details' : '⚠️ Confirm'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={resetAndClose} style={[styles.closeBtn, { backgroundColor: theme.background }]}>
                            <Ionicons name="close" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* User Badge */}
                    <View style={[styles.userBadge, { backgroundColor: '#EF4444' + '15' }]}>
                        <Ionicons name="person-circle" size={18} color="#EF4444" />
                        <Text style={styles.userBadgeText}>Reporting: {reportedUserName || 'Unknown User'}</Text>
                    </View>

                    {/* Step Progress */}
                    <View style={styles.progressRow}>
                        {[1, 2, 3].map(s => (
                            <View key={s} style={[
                                styles.progressDot,
                                { backgroundColor: s <= step ? '#EF4444' : theme.border }
                            ]} />
                        ))}
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* STEP 1: Select Reason */}
                        {step === 1 && (
                            <>
                                <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>
                                    Why are you reporting this account?
                                </Text>
                                <View style={styles.reasons}>
                                    {REASONS.map(reason => (
                                        <TouchableOpacity
                                            key={reason.id}
                                            style={[
                                                styles.reasonBtn,
                                                { backgroundColor: theme.background, borderColor: theme.border },
                                                selectedReason === reason.id && {
                                                    backgroundColor: reason.color + '15',
                                                    borderColor: reason.color
                                                }
                                            ]}
                                            onPress={() => setSelectedReason(reason.id)}
                                        >
                                            <View style={[
                                                styles.reasonIcon,
                                                { backgroundColor: selectedReason === reason.id ? reason.color : theme.border }
                                            ]}>
                                                <Ionicons
                                                    name={reason.icon}
                                                    size={18}
                                                    color={selectedReason === reason.id ? '#fff' : theme.textSecondary}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.reasonText,
                                                { color: selectedReason === reason.id ? reason.color : theme.text }
                                            ]}>
                                                {reason.label}
                                            </Text>
                                            {selectedReason === reason.id && (
                                                <Ionicons name="checkmark-circle" size={20} color={reason.color} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* STEP 2: Add Details */}
                        {step === 2 && (
                            <>
                                <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>
                                    Provide additional details (optional but helpful):
                                </Text>

                                {selectedReasonObj && (
                                    <View style={[styles.selectedTag, { backgroundColor: selectedReasonObj.color + '15' }]}>
                                        <Ionicons name={selectedReasonObj.icon} size={16} color={selectedReasonObj.color} />
                                        <Text style={[styles.selectedTagText, { color: selectedReasonObj.color }]}>
                                            {selectedReasonObj.label}
                                        </Text>
                                    </View>
                                )}

                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                                    placeholder="Describe what happened... (e.g., 'This user sent threatening messages after I found their item')"
                                    placeholderTextColor={theme.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={5}
                                    maxLength={500}
                                />
                                <Text style={[styles.charCount, { color: theme.textSecondary }]}>
                                    {description.length}/500
                                </Text>
                            </>
                        )}

                        {/* STEP 3: Confirm */}
                        {step === 3 && (
                            <>
                                <View style={[styles.confirmCard, { backgroundColor: '#FEF2F2' }]}>
                                    <Ionicons name="shield-checkmark" size={40} color="#EF4444" />
                                    <Text style={styles.confirmTitle}>Review Your Report</Text>
                                    <Text style={styles.confirmSubtitle}>
                                        This action is serious. False reports may result in action against your account.
                                    </Text>
                                </View>

                                <View style={[styles.summaryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>User:</Text>
                                        <Text style={[styles.summaryValue, { color: theme.text }]}>{reportedUserName}</Text>
                                    </View>
                                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Reason:</Text>
                                        <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                                            {selectedReasonObj?.label}
                                        </Text>
                                    </View>
                                    {description ? (
                                        <>
                                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Details:</Text>
                                                <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={3}>
                                                    {description}
                                                </Text>
                                            </View>
                                        </>
                                    ) : null}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {/* Action Button */}
                    <View style={styles.footer}>
                        {step < 3 ? (
                            <TouchableOpacity
                                style={[
                                    styles.nextBtn,
                                    !selectedReason && step === 1 && styles.disabledBtn
                                ]}
                                onPress={() => {
                                    if (step === 1 && !selectedReason) return showMsg('Required', 'Select a reason first.');
                                    setStep(step + 1);
                                }}
                                disabled={step === 1 && !selectedReason}
                            >
                                <LinearGradient
                                    colors={['#EF4444', '#DC2626']}
                                    style={styles.btnGradient}
                                >
                                    <Text style={styles.btnText}>
                                        {step === 1 ? 'Next: Add Details' : 'Next: Review & Submit'}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.nextBtn, loading && styles.disabledBtn]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={['#DC2626', '#991B1B']}
                                    style={styles.btnGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="flag" size={18} color="#fff" />
                                            <Text style={styles.btnText}>Submit Report</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', paddingBottom: 30 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { padding: 5 },
    title: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    userBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    userBadgeText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

    progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 15 },
    progressDot: { width: 40, height: 4, borderRadius: 2 },

    content: { paddingHorizontal: 20, maxHeight: 400 },
    stepLabel: { fontSize: 14, fontWeight: '600', marginBottom: 15, lineHeight: 20 },

    reasons: { gap: 8 },
    reasonBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        borderRadius: 14, borderWidth: 1.5
    },
    reasonIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    reasonText: { flex: 1, fontSize: 15, fontWeight: '600' },

    selectedTag: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, marginBottom: 15 },
    selectedTagText: { fontSize: 13, fontWeight: '700' },

    input: {
        borderRadius: 14, padding: 16, fontSize: 15, minHeight: 120,
        textAlignVertical: 'top', borderWidth: 1, lineHeight: 22
    },
    charCount: { textAlign: 'right', fontSize: 11, marginTop: 5, fontWeight: '600' },

    confirmCard: { alignItems: 'center', padding: 24, borderRadius: 16, marginBottom: 20 },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: '#991B1B', marginTop: 12 },
    confirmSubtitle: { fontSize: 13, color: '#7F1D1D', textAlign: 'center', marginTop: 8, lineHeight: 20 },

    summaryBox: { borderRadius: 14, padding: 16, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    summaryLabel: { fontSize: 13, fontWeight: '600' },
    summaryValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 20 },
    divider: { height: 1 },

    footer: { paddingHorizontal: 20, paddingTop: 15 },
    nextBtn: { borderRadius: 14, overflow: 'hidden' },
    btnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    disabledBtn: { opacity: 0.5 }
});
