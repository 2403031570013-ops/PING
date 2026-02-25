import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient, { BACKEND_URL } from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150/667eea/ffffff?text=Item';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${BACKEND_URL}${url}`;
};

export default function MyItemsScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchMyItems = async () => {
        setLoading(true);
        try {
            const userId = dbUser._id;
            const [lostRes, foundRes] = await Promise.all([
                apiClient.get('/lost', { params: { postedBy: userId, status: 'all' } }),
                apiClient.get('/found', { params: { postedBy: userId, status: 'all' } })
            ]);

            const lostItems = (lostRes.data || []).map(i => ({ ...i, type: 'lost' }));
            const foundItems = (foundRes.data || []).map(i => ({ ...i, type: 'found' }));

            setItems([...lostItems, ...foundItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (error) {
            console.error("Error fetching my items:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchMyItems();
        }, [])
    );

    const handleDelete = (item) => {
        const confirmMsg = "Are you sure you want to delete this post? This cannot be undone.";
        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                doDelete(item);
            }
        } else {
            Alert.alert("Delete Item", confirmMsg, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => doDelete(item) }
            ]);
        }
    };

    const doDelete = async (item) => {
        try {
            await apiClient.delete(`/${item.type}/${item._id}`);
            setItems(prev => prev.filter(i => i._id !== item._id));
            const msg = "Post removed successfully.";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Success", msg);
        } catch (err) {
            const msg = "Failed to delete item.";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    const filteredItems = items.filter(i => {
        if (filter === 'all') return true;
        return i.type === filter;
    });

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
            activeOpacity={0.7}
        >
            <View style={styles.cardTop}>
                <Image source={{ uri: getImageUrl(item.image) }} style={styles.thumb} />
                {/* Type Badge */}
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'lost' ? '#FEE2E2' : '#D1FAE5' }]}>
                    <Text style={[styles.badgeText, { color: item.type === 'lost' ? '#991B1B' : '#065F46' }]}>
                        {item.type.toUpperCase()}
                    </Text>
                </View>
                {/* Status Indicator */}
                <View style={[styles.statusChip, { backgroundColor: item.status === 'resolved' ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.9)' }]}>
                    <Ionicons name={item.status === 'resolved' ? 'checkmark-circle' : 'radio-button-on'} size={10} color="#fff" />
                    <Text style={styles.statusText}>{item.status === 'resolved' ? 'Resolved' : 'Active'}</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.meta, { color: theme.textSecondary }]}>{getTimeAgo(item.createdAt)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}
                        onPress={() => navigation.navigate('PostItem', { editItem: item })}
                    >
                        <Ionicons name="create-outline" size={16} color={theme.primary} />
                        <Text style={[styles.actionLabel, { color: theme.primary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                        onPress={() => handleDelete(item)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        <Text style={[styles.actionLabel, { color: '#DC2626' }]}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const lostCount = items.filter(i => i.type === 'lost').length;
    const foundCount = items.filter(i => i.type === 'found').length;
    const activeCount = items.filter(i => i.status === 'active').length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>My Submissions</Text>
                        <Text style={styles.headerSub}>{items.length} reports • {activeCount} active</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('PostItem')}
                    >
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Mini Stats */}
                <View style={styles.miniStats}>
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniNum, { color: '#ef4444' }]}>{lostCount}</Text>
                        <Text style={styles.miniLabel}>Lost</Text>
                    </View>
                    <View style={styles.miniDivider} />
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniNum, { color: '#10b981' }]}>{foundCount}</Text>
                        <Text style={styles.miniLabel}>Found</Text>
                    </View>
                    <View style={styles.miniDivider} />
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniNum, { color: '#6366f1' }]}>{activeCount}</Text>
                        <Text style={styles.miniLabel}>Active</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Filter Row */}
            <View style={styles.filterRow}>
                {[
                    { label: 'All', value: 'all', icon: 'layers-outline' },
                    { label: 'Lost', value: 'lost', icon: 'alert-circle-outline' },
                    { label: 'Found', value: 'found', icon: 'checkmark-circle-outline' }
                ].map(f => (
                    <TouchableOpacity
                        key={f.value}
                        style={[
                            styles.filterChip,
                            { backgroundColor: filter === f.value ? theme.primary + '15' : theme.card, borderColor: filter === f.value ? theme.primary : theme.border }
                        ]}
                        onPress={() => setFilter(f.value)}
                    >
                        <Ionicons name={f.icon} size={14} color={filter === f.value ? theme.primary : theme.textSecondary} />
                        <Text style={[styles.filterText, { color: filter === f.value ? theme.primary : theme.textSecondary, fontWeight: filter === f.value ? '800' : '600' }]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredItems}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconBox, { backgroundColor: theme.card }]}>
                            <Ionicons name="document-text-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No posts found</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>You haven't reported any lost or found items yet.</Text>
                        <TouchableOpacity
                            style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                            onPress={() => navigation.navigate('PostItem')}
                        >
                            <Ionicons name="add-circle" size={18} color="#fff" />
                            <Text style={styles.emptyBtnText}>Report an Item</Text>
                        </TouchableOpacity>
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
    headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, fontWeight: '500' },

    miniStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 14 },
    miniStat: { alignItems: 'center' },
    miniNum: { fontSize: 20, fontWeight: '900' },
    miniLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    miniDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
    filterText: { fontSize: 12 },

    list: { padding: 20, paddingBottom: 100 },

    card: {
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.04)' },
            default: { elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }
        })
    },
    cardTop: { height: 160, position: 'relative' },
    thumb: { width: '100%', height: '100%', resizeMode: 'cover' },
    typeBadge: { position: 'absolute', top: 15, right: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusChip: { position: 'absolute', bottom: 12, left: 15, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    cardContent: { padding: 18 },
    title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },

    metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: 12, fontWeight: '600' },

    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
    actionLabel: { fontWeight: '700', fontSize: 13 },

    emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500', marginBottom: 20 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
    emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
