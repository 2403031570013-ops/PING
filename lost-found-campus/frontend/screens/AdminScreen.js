import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        try {
            const res = await apiClient.get('/reports');
            setItems(res.data);
        } catch (error) {
            console.error("Error fetching reports:", error);
            Alert.alert("Error", "Failed to fetch reports.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleAction = async (report, action) => {
        if (action === 'delete_item') {
            const confirmMsg = "This will permanently delete the reported item. Proceed?";
            if (Platform.OS === 'web') {
                if (!window.confirm(confirmMsg)) return;
                try {
                    await apiClient.delete(`/${report.itemType}/${report.itemId}`);
                    await apiClient.patch(`/reports/${report._id}`, { status: 'resolved' });
                    fetchReports();
                } catch (err) { alert("Failed to delete item."); }
            } else {
                Alert.alert("Delete Item", confirmMsg, [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete", style: "destructive", onPress: async () => {
                            try {
                                await apiClient.delete(`/${report.itemType}/${report.itemId}`);
                                await apiClient.patch(`/reports/${report._id}`, { status: 'resolved' });
                                fetchReports();
                            } catch (err) { Alert.alert("Error", "Failed to delete item."); }
                        }
                    }
                ]);
            }
        } else if (action === 'dismiss') {
            try {
                await apiClient.patch(`/reports/${report._id}`, { status: 'reviewed' });
                fetchReports();
            } catch (err) { Alert.alert("Error", "Failed to update report."); }
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
            <View style={styles.content}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.title, { color: theme.danger }]} numberOfLines={1}>Report: {item.itemDetails?.title || 'Unknown'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FEF3C7' : '#D1FAE5' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'pending' ? '#92400E' : '#065F46' }]}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="alert-circle" size={14} color={theme.textSecondary} />
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>Reason: {item.reason}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="person" size={14} color={theme.textSecondary} />
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>By: {item.reportedBy?.fullName || 'Anonymous'}</Text>
                </View>
                <View style={[styles.metaRow, { marginTop: 4 }]}>
                    <Ionicons name="person-circle" size={14} color={theme.danger} />
                    <Text style={[styles.meta, { color: theme.danger }]}>Offender: {item.itemDetails?.postedBy?.fullName || 'Unknown'}</Text>
                </View>
                <View style={[styles.descBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.desc, { color: theme.text }]}>"{item.description}"</Text>
                </View>
            </View>
            {item.status === 'pending' && (
                <View style={styles.actionsColumn}>
                    <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Actions on Offender:</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.btn, { borderColor: theme.primary, borderWidth: 1 }]}
                            onPress={() => item.itemDetails?.postedBy && navigation.navigate('Chat', { otherUserId: item.itemDetails.postedBy._id })}
                        >
                            <Ionicons name="chatbubble-ellipses" size={16} color={theme.primary} />
                            <Text style={[styles.btnText, { color: theme.primary, marginLeft: 5 }]}>Msg Offender</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: '#7F1D1D' }]}
                            onPress={() => {
                                const offenderId = item.itemDetails?.postedBy?._id;
                                if (!offenderId) return alert("User not found");
                                Alert.alert("Suspend User", "Are you sure? This will ban the user from the platform.", [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Suspend", style: "destructive", onPress: async () => {
                                            try {
                                                await apiClient.patch(`/admin-mgmt/users/${offenderId}/status`, { status: 'suspended' });
                                                Alert.alert("Success", "User suspended.");
                                                fetchReports(); // Refresh
                                            } catch (e) { Alert.alert("Error", "Failed to suspend user"); }
                                        }
                                    }
                                ]);
                            }}
                        >
                            <Ionicons name="ban" size={16} color="#fff" />
                            <Text style={[styles.btnText, { color: '#fff', marginLeft: 5 }]}>Ban User</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.actionLabel, { color: theme.textSecondary, marginTop: 10 }]}>Actions on Report:</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.btn, { borderColor: theme.border, borderWidth: 1 }]}
                            onPress={() => handleAction(item, 'dismiss')}
                        >
                            <Text style={[styles.btnText, { color: theme.text }]}>Dismiss</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: '#0F172A' }]}
                            onPress={() => handleAction(item, 'delete_item')}
                        >
                            <Text style={[styles.btnText, { color: '#fff' }]}>Delete Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const pendingCount = items.filter(i => i.status === 'pending').length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.headerTitle}>Moderation</Text>
                <Text style={styles.headerSub}>{pendingCount} reports requiring review</Text>
            </LinearGradient>

            <FlatList
                data={items.filter(i => i.status === 'pending')}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="shield-checkmark-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.empty, { color: theme.text }]}>All Clear</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>No pending community reports at the moment.</Text>
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
    list: { padding: 20, paddingBottom: 100 },
    itemCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '800', flex: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    meta: { fontSize: 13, fontWeight: '600' },
    descBox: { padding: 12, borderRadius: 14, marginTop: 12 },
    desc: { fontSize: 13, fontWeight: '500', lineHeight: 18, fontStyle: 'italic' },
    actionsColumn: { marginTop: 20, gap: 12 },
    actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    actionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
    btn: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    dismissBtn: { backgroundColor: 'transparent' },
    deleteBtn: { borderWidth: 0 },
    btnText: { fontWeight: '700', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    empty: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' }
});
