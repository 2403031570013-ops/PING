import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';

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
        Alert.alert(
            "Delete Item",
            "Are you sure you want to delete this post? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiClient.delete(`/${item.type}/${item._id}`);
                            setItems(items.filter(i => i._id !== item._id));
                            Alert.alert("Deleted", "Your post has been removed.");
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete item.");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.typeBadge, { color: item.type === 'lost' ? '#ff3b30' : '#34c759' }]}>
                        {item.type.toUpperCase()}
                    </Text>
                    <Text style={[styles.statusBadge, { color: item.status === 'resolved' ? '#8e44ad' : '#666' }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>Posted on {new Date(item.createdAt).toLocaleDateString()}</Text>

                {item.image && (
                    <Image source={{ uri: item.image }} style={styles.thumb} />
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.btn, styles.viewBtn]}
                    onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
                >
                    <Ionicons name="eye" size={18} color="#667eea" />
                    <Text style={styles.viewText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.btn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash" size={18} color="#ff3b30" />
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color="#667eea" /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={items}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={60} color={theme.textSecondary} />
                        <Text style={[styles.empty, { color: theme.textSecondary }]}>You haven't posted any items yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingBottom: 20 },
    card: { borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    typeBadge: { fontWeight: '800', fontSize: 12 },
    statusBadge: { fontSize: 12, fontWeight: '600' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    date: { fontSize: 12, marginBottom: 10 },
    thumb: { width: '100%', height: 150, borderRadius: 8, marginTop: 10, resizeMode: 'cover' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    viewText: { color: '#667eea', fontWeight: '600' },
    deleteText: { color: '#ff3b30', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    empty: { marginTop: 10, fontSize: 16 }
});
