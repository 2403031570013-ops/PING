import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleNotificationPress = async (item) => {
        // Mark as read first
        if (!item.read) {
            await markAsRead(item._id);
        }

        // Navigate based on type
        if (['claim', 'resolved', 'info'].includes(item.type)) {
            navigation.navigate('Claims');
        }
        // If 'message', allow navigation to Chat? (Not implemented in backend notification yet)
    };

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error("Notifications error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await apiClient.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error("Mark read error:", error);
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error("Mark all read error:", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'claim': return { name: 'hand-left', color: '#ff9500' };
            case 'resolved': return { name: 'checkmark-circle', color: '#34c759' };
            case 'system': return { name: 'information-circle', color: '#667eea' };
            default: return { name: 'notifications', color: '#888' };
        }
    };

    const renderItem = ({ item }) => {
        const icon = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.read && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
                <Text style={styles.headerTitle}>🔔 Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </LinearGradient>

            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    markAllBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    markAllText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    list: { padding: 15 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
    unreadCard: { backgroundColor: '#f0f4ff', borderLeftWidth: 3, borderLeftColor: '#667eea' },
    iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
    cardMessage: { fontSize: 14, color: '#666', marginBottom: 4 },
    cardTime: { fontSize: 12, color: '#999' },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#667eea' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, color: '#888', fontSize: 16 }
});
