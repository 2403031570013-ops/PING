import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
    const [activeTab, setActiveTab] = useState('received');
    const [verificationCode, setVerificationCode] = useState('');

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
            console.error("Fetch claims error:", error?.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateClaimStatus = async (id, status) => {
        try {
            await apiClient.patch(`/claims/${id}/status`, { status });
            const msg = `Claim ${status === 'approved' ? 'authorized' : 'declined'}`;
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Success", msg);
            fetchClaims();
        } catch (error) {
            const msg = error.response?.data?.message || "Action Failed";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchClaims();
        }, [])
    );

    const verifyHandover = async (claimId, codeOverride = null) => {
        const codeToVerify = codeOverride || verificationCode;
        if (!codeToVerify || codeToVerify.length !== 6) {
            const msg = "Please enter valid 6-digit code";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
            return;
        }

        try {
            await apiClient.post(`/claims/${claimId}/verify-handover`, { code: codeToVerify });
            Platform.OS === 'web' ? window.alert("Handover Successful!") : Alert.alert("Success", "Item hand-delivered!");
            setVerificationCode('');
            fetchClaims();
        } catch (error) {
            const msg = error.response?.data?.message || "Verification Failed";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return { bg: '#D1FAE5', text: '#065F46' };
            case 'approved': return { bg: '#DBEAFE', text: '#1E40AF' };
            case 'rejected': return { bg: '#FEE2E2', text: '#991B1B' };
            case 'cancelled': return { bg: '#F1F5F9', text: '#64748B' };
            default: return { bg: '#FEF3C7', text: '#92400E' };
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return 'checkmark-circle';
            case 'approved': return 'thumbs-up';
            case 'rejected': return 'close-circle';
            default: return 'time';
        }
    };

    const currentData = activeTab === 'received' ? receivedClaims : sentClaims;

    const renderClaim = ({ item }) => {
        const isReceived = activeTab === 'received';
        const otherUser = isReceived ? item.claimantId : item.ownerId;
        const statusColors = getStatusColor(item.status);

        return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border || '#E2E8F0' }]}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View style={styles.userInfo}>
                        <View style={[styles.avatar, { backgroundColor: isReceived ? '#EEF2FF' : '#F0FDF4' }]}>
                            <Ionicons
                                name={isReceived ? "arrow-down-circle" : "arrow-up-circle"}
                                size={20}
                                color={isReceived ? '#6366F1' : '#10B981'}
                            />
                        </View>
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>
                                {otherUser?.fullName || 'Unknown User'}
                            </Text>
                            <Text style={[styles.userRole, { color: theme.textSecondary }]}>
                                {isReceived ? 'Requested your item' : 'Item owner'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                        <Ionicons name={getStatusIcon(item.status)} size={12} color={statusColors.text} />
                        <Text style={[styles.badgeText, { color: statusColors.text }]}>
                            {(item.status || 'pending').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Item Info */}
                <View style={[styles.itemInfo, { borderColor: theme.border || '#F1F5F9' }]}>
                    <Ionicons name="cube-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.itemId?.title || 'Item details not available'}
                    </Text>
                    <Text style={[styles.itemType, {
                        color: item.itemType === 'LostItem' ? '#EF4444' : '#10B981',
                        backgroundColor: item.itemType === 'LostItem' ? '#FEF2F2' : '#F0FDF4'
                    }]}>
                        {item.itemType === 'LostItem' ? 'LOST' : 'FOUND'}
                    </Text>
                </View>

                {/* Handover Section - Only for approved claims */}
                {item.status === 'approved' && (
                    <View style={styles.handoverSection}>
                        <View style={styles.handoverHeader}>
                            <Ionicons name="swap-horizontal" size={16} color="#6366F1" />
                            <Text style={styles.handoverTitle}>Giving Item</Text>
                        </View>

                        {isReceived ? (
                            <View style={styles.verifySection}>
                                <TextInput
                                    style={[styles.input, { color: theme.text, borderColor: theme.border || '#E2E8F0' }]}
                                    placeholder="Enter 6-digit code"
                                    placeholderTextColor={theme.textSecondary || '#94A3B8'}
                                    onChangeText={setVerificationCode}
                                    value={verificationCode}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <TouchableOpacity
                                    style={styles.verifyBtn}
                                    onPress={() => verifyHandover(item._id)}
                                >
                                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                                    <Text style={styles.verifyBtnText}>FINISH RETURN</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.codeDisplay}>
                                <Text style={styles.codeLabel}>Share this code:</Text>
                                <Text style={styles.codeText}>{item.handoverCode || '------'}</Text>
                                <Text style={styles.codeNote}>Give this code to the person to finish the return</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Action Row - Pending claims (Received) */}
                {isReceived && item.status === 'pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => updateClaimStatus(item._id, 'rejected')}
                        >
                            <Ionicons name="close" size={16} color="#fff" />
                            <Text style={styles.btnText}>DECLINE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => updateClaimStatus(item._id, 'approved')}
                        >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.btnText}>APPROVE</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Action Row - Pending claims (Sent/Requested) */}
                {!isReceived && item.status === 'pending' && (
                    <TouchableOpacity
                        style={[styles.chatBtn, { borderColor: '#EF4444' }]}
                        onPress={() => {
                            const confirmMsg = "Are you sure you want to withdraw this request?";
                            if (Platform.OS === 'web' ? window.confirm(confirmMsg) : true) {
                                if (Platform.OS !== 'web') {
                                    Alert.alert("Cancel Request", confirmMsg, [
                                        { text: "No", style: "cancel" },
                                        { text: "Yes, Cancel", style: "destructive", onPress: () => updateClaimStatus(item._id, 'cancelled') }
                                    ]);
                                } else {
                                    updateClaimStatus(item._id, 'cancelled');
                                }
                            }
                        }}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.chatBtnText, { color: '#EF4444' }]}>WITHDRAW REQUEST</Text>
                    </TouchableOpacity>
                )}

                {/* Chat Button - approved/completed */}
                {(item.status === 'approved' || item.status === 'completed') && (
                    <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => navigation.navigate('Chat', { otherUserId: otherUser?._id, itemId: item.itemId?._id })}
                    >
                        <Ionicons name="chatbubbles-outline" size={16} color="#6366F1" />
                        <Text style={styles.chatBtnText}>Message {otherUser?.fullName?.split(' ')[0] || 'User'}</Text>
                    </TouchableOpacity>
                )}

                {/* Timestamp */}
                <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : ''}
                </Text>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
                <Ionicons
                    name={activeTab === 'received' ? "download-outline" : "paper-plane-outline"}
                    size={48}
                    color={theme.textSecondary || '#94A3B8'}
                />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>
                {activeTab === 'received' ? 'No Incoming Requests' : 'No Sent Requests'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {activeTab === 'received'
                    ? 'When someone claims your item, it will appear here'
                    : 'When you claim an item, your request will appear here'
                }
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <LinearGradient colors={theme.primaryGradient || ['#6366F1', '#4F46E5']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Giving & Taking</Text>
                    <Text style={styles.headerSubtitle}>
                        {receivedClaims.length + sentClaims.length} total requests
                    </Text>
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: theme.card, borderBottomColor: theme.border || '#E2E8F0' }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('received')}
                    style={[styles.tab, activeTab === 'received' && styles.activeTab]}
                >
                    <Ionicons
                        name="arrow-down-circle-outline"
                        size={16}
                        color={activeTab === 'received' ? '#6366F1' : '#94A3B8'}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === 'received' && styles.activeTabText
                    ]}>
                        Requests for Me ({receivedClaims.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('sent')}
                    style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
                >
                    <Ionicons
                        name="arrow-up-circle-outline"
                        size={16}
                        color={activeTab === 'sent' ? '#6366F1' : '#94A3B8'}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === 'sent' && styles.activeTabText
                    ]}>
                        Items I want ({sentClaims.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Claims List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading requests...</Text>
                </View>
            ) : (
                <FlatList
                    data={currentData}
                    keyExtractor={item => item._id}
                    renderItem={renderClaim}
                    onRefresh={fetchClaims}
                    refreshing={loading}
                    contentContainerStyle={[
                        styles.listContent,
                        currentData.length === 0 && { flex: 1 }
                    ]}
                    ListEmptyComponent={renderEmpty}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#6366F1'
    },
    tabText: {
        fontWeight: '700',
        fontSize: 12,
        color: '#94A3B8',
        letterSpacing: 0.3,
    },
    activeTabText: {
        color: '#6366F1',
    },
    listContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
    },

    // Card
    card: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontWeight: '700',
        fontSize: 14
    },
    userRole: {
        fontSize: 11,
        marginTop: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // Item Info
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        marginBottom: 12,
    },
    itemTitle: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    itemType: {
        fontSize: 9,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        letterSpacing: 0.5,
    },

    // Handover
    handoverSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    handoverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    handoverTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },
    verifySection: {
        gap: 10,
    },
    input: {
        height: 48,
        borderWidth: 1.5,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 8,
        backgroundColor: '#fff',
    },
    verifyBtn: {
        backgroundColor: '#6366F1',
        paddingVertical: 13,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    verifyBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
    codeDisplay: {
        alignItems: 'center',
        gap: 6,
    },
    codeLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    codeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 8,
    },
    codeNote: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
    },

    // Actions
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    approveBtn: {
        flex: 1,
        backgroundColor: '#6366F1',
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#6366F1',
        marginBottom: 8,
    },
    chatBtnText: {
        color: '#6366F1',
        fontWeight: '700',
        fontSize: 13,
    },
    btnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 12
    },
    timestamp: {
        fontSize: 10,
        textAlign: 'right',
        marginTop: 4,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyIcon: {
        width: 90,
        height: 90,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
