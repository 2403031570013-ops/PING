import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ClaimsScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [receivedClaims, setReceivedClaims] = useState([]);
    const [sentClaims, setSentClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const [recRes, sentRes] = await Promise.all([
                apiClient.get('/claims/received'),
                apiClient.get('/claims/sent')
            ]);
            setReceivedClaims(recRes.data);
            setSentClaims(sentRes.data);
        } catch (error) {
            console.error("Error fetching claims:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    const updateClaimStatus = async (id, status) => {
        try {
            await apiClient.patch(`/claims/${id}`, { status });
            Alert.alert("Updated", `Claim ${status} successfully.`);
            fetchClaims();
        } catch (error) {
            Alert.alert("Error", "Failed to update claim.");
        }
    };

    const renderClaim = ({ item }) => {
        const isReceived = activeTab === 'received';
        const otherUser = isReceived ? item.claimantId : item.ownerId;

        const handleChat = () => {
            if (!otherUser?._id) {
                const msg = "Cannot start chat - user info unavailable";
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
                return;
            }
            navigation.navigate('Chat', {
                otherUserId: otherUser._id,
                itemId: item.itemId?._id,
                itemType: item.itemType,
                initialMessage: null // Don't auto-send, let them type
            });
        };

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.claimHeader}>
                    <View>
                        <Text style={[styles.claimantName, { color: theme.text }]}>
                            {isReceived ? `From: ${otherUser?.fullName || 'User'}` : `To: ${otherUser?.fullName || 'Owner'}`}
                        </Text>
                        <Text style={[styles.date, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#ff9800' : item.status === 'approved' ? '#4caf50' : '#f44336' }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                <Text style={[styles.itemTitle, { color: theme.text }]}>Item: {item.itemId?.title || 'Unknown Item'}</Text>
                <Text style={[styles.msg, { color: theme.textSecondary }]}>"{item.message}"</Text>

                {/* Chat Button - Only Visible IF APPROVED */}
                {item.status === 'approved' && (
                    <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
                        <Ionicons name="chatbubbles" size={18} color="#fff" />
                        <Text style={styles.chatBtnText}>Chat now</Text>
                    </TouchableOpacity>
                )}

                {isReceived && item.status === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.rejectBtn]}
                            onPress={() => updateClaimStatus(item._id, 'rejected')}
                        >
                            <Text style={[styles.btnText, { color: '#d32f2f' }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.approveBtn]}
                            onPress={() => updateClaimStatus(item._id, 'approved')}
                        >
                            <Text style={[styles.btnText, { color: '#388e3c' }]}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading && !receivedClaims.length && !sentClaims.length) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color="#667eea" /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'received' && styles.activeTab]}
                    onPress={() => setActiveTab('received')}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'received' && styles.activeTabText]}>Received ({receivedClaims.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
                    onPress={() => setActiveTab('sent')}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'sent' && styles.activeTabText]}>Sent ({sentClaims.length})</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeTab === 'received' ? receivedClaims : sentClaims}
                keyExtractor={item => item._id}
                renderItem={renderClaim}
                onRefresh={fetchClaims}
                refreshing={loading}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name={activeTab === 'received' ? "mail-unread-outline" : "paper-plane-outline"} size={50} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            {activeTab === 'received' ? "No requests received." : "No claims sent yet."}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, elevation: 2 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#667eea' },
    tabText: { fontSize: 16, color: '#888', fontWeight: '600' },
    activeTabText: { color: '#667eea' },
    list: { padding: 15 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1 },
    claimHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    claimantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 12, color: '#999' },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden', color: '#fff', fontSize: 10, fontWeight: 'bold', height: 22 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 },
    msg: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 10 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
    btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 10 },
    rejectBtn: { backgroundColor: '#ffebee' },
    approveBtn: { backgroundColor: '#e8f5e9' },
    btnText: { fontWeight: '700', fontSize: 14 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 10, color: '#888', fontSize: 16 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#667eea', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginTop: 10, marginBottom: 5 },
    chatBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
