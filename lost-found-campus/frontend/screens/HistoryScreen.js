import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen({ navigation }) {
    const { dbUser } = useUser();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            // 1. Items I POSTED and Resolved
            const p1 = apiClient.get('/lost', { params: { postedBy: dbUser._id, status: 'resolved' } });
            const p2 = apiClient.get('/found', { params: { postedBy: dbUser._id, status: 'resolved' } });

            // 2. Items I RESOLVED (Found/Claimed)
            const p3 = apiClient.get('/lost', { params: { resolvedBy: dbUser._id, status: 'resolved' } });
            const p4 = apiClient.get('/found', { params: { resolvedBy: dbUser._id, status: 'resolved' } });

            const [res1, res2, res3, res4] = await Promise.all([p1, p2, p3, p4]);

            const allItems = [
                ...(res1.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res2.data || []).map(i => ({ ...i, type: 'found' })),
                ...(res3.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res4.data || []).map(i => ({ ...i, type: 'found' }))
            ];

            // Deduplicate by ID
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

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
        >
            <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.image} />
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.badge, item.type === 'found' ? styles.foundBadge : styles.lostBadge]}>
                        <Text style={styles.badgeText}>{item.type === 'found' ? 'RETURNED' : 'FOUND'}</Text>
                    </View>
                </View>
                <Text style={styles.meta}>
                    <Ionicons name="location-outline" size={14} /> {item.location}
                </Text>
                <Text style={styles.date}>Resolved on: {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.header}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Resolutions History</Text>
            </LinearGradient>

            <FlatList
                data={items}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="time-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No history yet.</Text>
                        <Text style={styles.emptySub}>Items you mark as resolved will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    list: { padding: 15 },
    itemCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 12, alignItems: 'center', elevation: 2 },
    image: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
    content: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    foundBadge: { backgroundColor: '#e8f5e9' },
    lostBadge: { backgroundColor: '#ffebee' },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
    meta: { fontSize: 13, color: '#666', marginBottom: 2 },
    date: { fontSize: 11, color: '#999' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, color: '#666', marginTop: 15, fontWeight: '600' },
    emptySub: { fontSize: 14, color: '#999', marginTop: 5 },
});
