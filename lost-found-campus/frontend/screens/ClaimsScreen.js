import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
            setReceivedClaims(recRes.data || []);
            setSentClaims(sentRes.data || []);
        } catch (error) {
            console.error("Error fetching claims:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    const [verificationCode, setVerificationCode] = useState('');

    const verifyHandover = async (id) => {
        try {
            if (verificationCode.length !== 6) {
                Platform.OS === 'web' ? window.alert("Enter 6-digit code") : Alert.alert("Error", "Enter 6-digit code");
                return;
            }
            await apiClient.post(`/claims/${id}/verify-handover`, { code: verificationCode });
            const msg = "Handover Verified! Item marked as Resolved.";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Success", msg);
            setVerificationCode('');
            fetchClaims();
        } catch (error) {
            const msg = error.response?.data?.message || "Verification Failed";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    const renderClaim = ({ item }) => {
        const isReceived = activeTab === 'received';
        const otherUser = isReceived ? item.claimantId : item.ownerId;
        const statusColors = {
            pending: { bg: '#FEF3C7', text: '#92400E' },
            approved: { bg: '#D1FAE5', text: '#065F46' },
            rejected: { bg: '#FEE2E2', text: '#991B1B' },
            completed: { bg: '#dcfce7', text: '#166534' }
        };
        const colors = statusColors[item.status] || statusColors.pending;

        const handleChat = () => {
            if (!otherUser?._id) return;
            navigation.navigate('Chat', {
                otherUserId: otherUser._id,
                itemId: item.itemId?._id,
                itemType: item.itemType,
            });
        };

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                {/* Header Section */}
                <View style={styles.claimHeader}>
                    <View style={styles.userInfo}>
                        <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[styles.avatarText, { color: theme.primary }]}>
                                {(otherUser?.fullName || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={[styles.claimantName, { color: theme.text }]} numberOfLines={1}>
                                {isReceived ? otherUser?.fullName || 'Unknown' : `Owner: ${otherUser?.fullName || 'Unknown'}`}
                            </Text>
                            <Text style={[styles.date, { color: theme.textSecondary }]}>
                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Item Ref */}
                <View style={[styles.itemRef, { backgroundColor: theme.background }]}>
                    <Ionicons name="cube-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.itemId?.title || 'System Item'}
                    </Text>
                </View>

                {/* Message */}
                <View style={[styles.msgBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.msg, { color: theme.textSecondary }]}>"{item.message}"</Text>
                </View>

                {/* --- HANDOVER SECTION --- */}

                {/* 1. Claimant View: Show Code if Approved */}
                {!isReceived && item.status === 'approved' && item.handoverCode && (
                    <View style={styles.handoverBox}>
                        <Text style={styles.handoverTitle}>Handover Code</Text>
                        <Text style={styles.codeDisplay}>{item.handoverCode}</Text>
                        <Text style={styles.handoverNote}>Show this code to the owner upon meeting.</Text>
                    </View>
                )}

                {/* 2. Owner View: Input Code if Approved */}
                {isReceived && item.status === 'approved' && (
                    <View style={styles.handoverBox}>
                        <Text style={styles.handoverTitle}>Verify Handover</Text>
                        <Text style={styles.handoverNote}>Ask the claimant for their code and enter it here.</Text>
                        <View style={styles.verifyRow}>
                            <TextInput
                                style={[styles.codeInput, { color: theme.text, borderColor: theme.border }]}
                                placeholder="6-Digit Code"
                                placeholderTextColor={theme.textSecondary}
                                maxLength={6}
                                keyboardType="numeric"
                                onChangeText={setVerificationCode}
                            />
                            <TouchableOpacity
                                style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
                                onPress={() => verifyHandover(item._id)}
                            >
                                <Text style={styles.verifyBtnText}>Verify</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Chat Button */}
                {item.status === 'approved' && (
                    <TouchableOpacity style={[styles.chatBtn, { backgroundColor: '#0F172A', marginTop: 15 }]} onPress={handleChat}>
                        <Ionicons name="chatbubbles" size={18} color="#fff" />
                        <Text style={styles.chatBtnText}>Open Secure Chat</Text>
                    </TouchableOpacity>
                )}

                {/* Owner Actions (Pending) */}
                {isReceived && item.status === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.rejectBtn, { borderColor: theme.border }]}
                            onPress={() => updateClaimStatus(item._id, 'rejected')}
                        >
                            <Text style={[styles.btnText, { color: theme.textSecondary }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.approveBtn, { backgroundColor: '#0F172A' }]}
                            onPress={() => updateClaimStatus(item._id, 'approved')}
                        >
                            <Text style={[styles.btnText, { color: '#fff' }]}>Authorize Handover</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading && !receivedClaims.length && !sentClaims.length) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.headerTitle}>Handovers</Text>
                <Text style={styles.headerSub}>Verify and authorize item transfers</Text>
            </LinearGradient>

            <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'received' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
                    onPress={() => setActiveTab('received')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'received' ? theme.primary : theme.textSecondary }]}>RECEIVED</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sent' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
                    onPress={() => setActiveTab('sent')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'sent' ? theme.primary : theme.textSecondary }]}>SENT</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeTab === 'received' ? receivedClaims : sentClaims}
                keyExtractor={item => item._id}
                renderItem={renderClaim}
                onRefresh={fetchClaims}
                refreshing={loading}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name={activeTab === 'received' ? "mail-unread-outline" : "paper-plane-outline"} size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            {activeTab === 'received' ? "Incoming handover requests appear here." : "Your outgoing requests have a safe spot here."}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '500' },

    tabContainer: { flexDirection: 'row', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tab: { flex: 1, paddingVertical: 18, alignItems: 'center' },
    tabText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

    list: { padding: 20, paddingBottom: 100 },
    card: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    claimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 },
    avatarCircle: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontWeight: '800', fontSize: 18 },
    claimantName: { fontSize: 16, fontWeight: '800' },
    date: { fontSize: 12, marginTop: 2, fontWeight: '600' },
    statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: '900' },

    itemRef: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 12 },
    itemTitle: { fontSize: 14, fontWeight: '700' },
    msgBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
    msg: { fontSize: 14, lineHeight: 22, fontStyle: 'italic', fontWeight: '500' },

    actions: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { borderWidth: 1, backgroundColor: 'transparent' },
    approveBtn: {},
    btnText: { fontWeight: '800', fontSize: 13 },

    chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 18 },
    chatBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

    handoverBox: { marginTop: 15, padding: 15, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
    handoverTitle: { fontSize: 14, fontWeight: '800', color: '#1E40AF', marginBottom: 5 },
    codeDisplay: { fontSize: 32, fontWeight: '900', letterSpacing: 4, color: '#1E3A8A', textAlign: 'center', marginVertical: 10 },
    handoverNote: { fontSize: 12, color: '#60A5FA', textAlign: 'center', marginBottom: 10 },
    verifyRow: { flexDirection: 'row', gap: 10 },
    codeInput: { flex: 1, height: 45, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, fontWeight: '700', textAlign: 'center', backgroundColor: '#fff' },
    verifyBtn: { width: 80, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    verifyBtnText: { color: '#fff', fontWeight: '700' }
});

