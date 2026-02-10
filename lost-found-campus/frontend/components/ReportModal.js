import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';

const REASONS = [
    { id: 'inappropriate', label: 'Inappropriate Content', icon: 'warning' },
    { id: 'spam', label: 'Spam', icon: 'trash' },
    { id: 'fake', label: 'Fake/Misleading', icon: 'alert-circle' },
    { id: 'duplicate', label: 'Duplicate Post', icon: 'copy' },
    { id: 'offensive', label: 'Offensive', icon: 'ban' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function ReportModal({ visible, onClose, itemId, itemType }) {
    const [selectedReason, setSelectedReason] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            const msg = "Please select a reason for reporting";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Required", msg);
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/reports', {
                itemId,
                itemType,
                reason: selectedReason,
                description
            });

            const successMsg = "Report submitted. Thank you for keeping our community safe!";
            Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert("Thank You", successMsg);
            onClose();
            setSelectedReason(null);
            setDescription('');
        } catch (error) {
            const errMsg = error.response?.data?.message || "Failed to submit report";
            Platform.OS === 'web' ? window.alert(errMsg) : Alert.alert("Error", errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Report Item</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Why are you reporting this?</Text>

                    <View style={styles.reasons}>
                        {REASONS.map(reason => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonBtn,
                                    selectedReason === reason.id && styles.selectedReason
                                ]}
                                onPress={() => setSelectedReason(reason.id)}
                            >
                                <Ionicons
                                    name={reason.icon}
                                    size={20}
                                    color={selectedReason === reason.id ? '#fff' : '#666'}
                                />
                                <Text style={[
                                    styles.reasonText,
                                    selectedReason === reason.id && styles.selectedReasonText
                                ]}>
                                    {reason.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Additional details (optional)"
                        placeholderTextColor="#999"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '700', color: '#333' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 15 },
    reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    reasonBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
    selectedReason: { backgroundColor: '#ff3b30', borderColor: '#ff3b30' },
    reasonText: { fontSize: 14, color: '#666' },
    selectedReasonText: { color: '#fff' },
    input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 15, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
    submitBtn: { backgroundColor: '#ff3b30', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    disabledBtn: { opacity: 0.7 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
