import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient, { BACKEND_URL } from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150/667eea/ffffff?text=Item';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${BACKEND_URL}${url}`;
};

export default function HistoryScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'lost', 'found'

    const fetchHistory = async () => {
        try {
            const p1 = apiClient.get('/lost', { params: { postedBy: dbUser._id, status: 'resolved' } });
            const p2 = apiClient.get('/found', { params: { postedBy: dbUser._id, status: 'resolved' } });
            const p3 = apiClient.get('/lost', { params: { resolvedBy: dbUser._id, status: 'resolved' } });
            const p4 = apiClient.get('/found', { params: { resolvedBy: dbUser._id, status: 'resolved' } });

            const [res1, res2, res3, res4] = await Promise.all([p1, p2, p3, p4]);

            const allItems = [
                ...(res1.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res2.data || []).map(i => ({ ...i, type: 'found' })),
                ...(res3.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res4.data || []).map(i => ({ ...i, type: 'found' }))
            ];

            const uniqueItems = Array.from(new Map(allItems.map(item => [item._id, item])).values());
            setItems(uniqueItems.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)));
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredItems = items.filter(i => {
        if (filter === 'all') return true;
        return i.type === filter;
    });

    const generateReceipt = async (item) => {
        const html = `
            <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <h1 style="color: #6366f1;">Handover Proof</h1>
                        <p style="color: #666;">Lost & Found Campus - Resolution Log</p>
                    </div>
                    <div style="border: 2px solid #ddd; padding: 20px; border-radius: 10px;">
                        <p><strong>Item Title:</strong> ${item.title}</p>
                        <p><strong>Category:</strong> ${item.category || 'N/A'}</p>
                        <p><strong>Resolution Date:</strong> ${new Date(item.updatedAt).toLocaleString()}</p>
                        <p><strong>Status:</strong> COMPLETED / RESOLVED</p>
                        <p><strong>Ref ID:</strong> ${item._id}</p>
                    </div>
                    <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #999;">
                        Verified by Parul University Blockchain Audit System.
                    </div>
                </body>
            </html>
        `;
        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not generate receipt");
        }
    };

    const renderItem = ({ item }) => {
        const dateStr = new Date(item.updatedAt || item.createdAt);
        const timeAgo = getTimeAgo(dateStr);

        return (
            <TouchableOpacity
                style={[styles.itemCard, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
                activeOpacity={0.7}
            >
                <Image source={{ uri: getImageUrl(item.image) }} style={styles.image} />
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                        <View style={[styles.badge, { backgroundColor: item.type === 'found' ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Text style={[styles.badgeText, { color: item.type === 'found' ? '#065F46' : '#991B1B' }]}>
                                {item.type === 'found' ? 'RETURNED' : 'RECOVERED'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="location" size={12} color={theme.textSecondary} />
                            <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                        </View>
                        {item.category && (
                            <View style={styles.metaItem}>
                                <Ionicons name="pricetag" size={12} color={theme.textSecondary} />
                                <Text style={[styles.meta, { color: theme.textSecondary }]}>{item.category}</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <View style={styles.timeChip}>
                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            <Text style={styles.timeText}>{timeAgo}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => generateReceipt(item)} style={styles.receiptBtn}>
                                <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                                <Text style={[styles.receiptText, { color: theme.primary }]}>Receipt</Text>
                            </TouchableOpacity>

                            {/* Delete from History */}
                            <TouchableOpacity
                                onPress={() => {
                                    const confirmMsg = "Remove this record from your history?";
                                    const doDelete = async () => {
                                        try {
                                            await apiClient.delete(`/${item.type}/${item._id}`);
                                            setItems(prev => prev.filter(i => i._id !== item._id));
                                        } catch (e) { Alert.alert("Error", "Could not delete history record"); }
                                    };

                                    if (Platform.OS === 'web' ? window.confirm(confirmMsg) : true) {
                                        if (Platform.OS !== 'web') {
                                            Alert.alert("Delete Record", confirmMsg, [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Delete", style: "destructive", onPress: doDelete }
                                            ]);
                                        } else {
                                            doDelete();
                                        }
                                    }
                                }}
                                style={[styles.receiptBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / 86400000);
        if (days < 1) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const FilterChip = ({ label, value, icon }) => (
        <TouchableOpacity
            style={[
                styles.filterChip,
                { backgroundColor: filter === value ? theme.primary + '15' : theme.card, borderColor: filter === value ? theme.primary : theme.border }
            ]}
            onPress={() => setFilter(value)}
        >
            <Ionicons name={icon} size={14} color={filter === value ? theme.primary : theme.textSecondary} />
            <Text style={[styles.filterText, { color: filter === value ? theme.primary : theme.textSecondary, fontWeight: filter === value ? '800' : '600' }]}>{label}</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const lostCount = items.filter(i => i.type === 'lost').length;
    const foundCount = items.filter(i => i.type === 'found').length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Resolution History</Text>
                        <Text style={styles.headerSub}>A log of successful recoveries</Text>
                    </View>
                </View>

                {/* Summary Stats */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryStat}>
                        <Text style={styles.summaryNum}>{items.length}</Text>
                        <Text style={styles.summaryLabel}>Total</Text>
                    </View>
                    <View style={[styles.summaryDivider]} />
                    <View style={styles.summaryStat}>
                        <Text style={[styles.summaryNum, { color: '#ef4444' }]}>{lostCount}</Text>
                        <Text style={styles.summaryLabel}>Recovered</Text>
                    </View>
                    <View style={[styles.summaryDivider]} />
                    <View style={styles.summaryStat}>
                        <Text style={[styles.summaryNum, { color: '#10b981' }]}>{foundCount}</Text>
                        <Text style={styles.summaryLabel}>Returned</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
                <FilterChip label="All" value="all" icon="layers-outline" />
                <FilterChip label="Recovered" value="lost" icon="alert-circle-outline" />
                <FilterChip label="Returned" value="found" icon="checkmark-circle-outline" />
            </View>

            <FlatList
                data={filteredItems}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={[styles.emptyIconBox, { backgroundColor: theme.card }]}>
                            <Ionicons name="time-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>No history yet</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Resolved items and successful claims will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, fontWeight: '500' },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 14 },
    summaryStat: { alignItems: 'center' },
    summaryNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
    summaryLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
    filterText: { fontSize: 12 },

    list: { padding: 20, paddingBottom: 100 },

    itemCard: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 14,
        marginBottom: 12,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    image: { width: 68, height: 68, borderRadius: 16, marginRight: 15, backgroundColor: '#F1F5F9' },
    content: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: 12, fontWeight: '600' },

    timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 11, fontWeight: '600', color: '#10B981' },

    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.08)' },
    receiptText: { fontSize: 11, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});
