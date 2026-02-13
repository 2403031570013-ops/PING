import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MyItemsScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchMyItems();
    }, []);

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
            setItems(items.filter(i => i._id !== item._id));
            const msg = "Post removed successfully.";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Success", msg);
        } catch (err) {
            const msg = "Failed to delete item.";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
            activeOpacity={0.7}
        >
            <View style={styles.cardTop}>
                <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.thumb} />
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'lost' ? '#FEE2E2' : '#D1FAE5' }]}>
                    <Text style={[styles.badgeText, { color: item.type === 'lost' ? '#991B1B' : '#065F46' }]}>
                        {item.type.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'resolved' ? theme.success : theme.primary }]} />
                </View>

                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    <Ionicons name="location-outline" size={12} color={theme.textSecondary} style={{ marginLeft: 10 }} />
                    <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: theme.border }]}
                        onPress={() => navigation.navigate('PostItem', { editItem: item })}
                    >
                        <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                        <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#0F172A' }]}
                        onPress={() => handleDelete(item)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={[styles.actionLabel, { color: '#fff' }]}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>My Submissions</Text>
                    <Text style={styles.headerSub}>{items.length} total reports posted</Text>
                </View>
            </LinearGradient>

            <FlatList
                data={items}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="document-text-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No posts found</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>You haven't reported any lost or found items yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2, fontWeight: '500' },
    list: { padding: 20, paddingBottom: 100 },

    card: {
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    cardTop: { height: 160, position: 'relative' },
    thumb: { width: '100%', height: '100%', resizeMode: 'cover' },
    typeBadge: { position: 'absolute', top: 15, right: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    cardContent: { padding: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '800', flex: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    meta: { fontSize: 13, fontWeight: '600', marginLeft: 4 },

    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
    actionLabel: { fontWeight: '700', fontSize: 13 },

    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});

