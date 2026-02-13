import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

export default function NotificationsScreen({ navigation }) {
    const { theme } = useTheme();
    const { refreshBadges } = useUser();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleNotificationPress = async (item) => {
        if (!item.read) {
            await markAsRead(item._id);
        }
        if (['claim', 'resolved', 'info'].includes(item.type)) {
            navigation.navigate('Claims');
        }
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
            refreshBadges();
        } catch (error) {
            console.error("Mark read error:", error);
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            refreshBadges();
        } catch (error) {
            console.error("Mark all read error:", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'claim': return { name: 'hand-left', color: '#F59E0B' };
            case 'resolved': return { name: 'checkmark-circle', color: '#10B981' };
            case 'system': return { name: 'information-circle', color: theme.primary };
            default: return { name: 'notifications', color: '#64748B' };
        }
    };

    const renderItem = ({ item }) => {
        const icon = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card }, !item.read && { borderLeftColor: theme.primary, borderLeftWidth: 4 }]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, { backgroundColor: `${icon.color}15` }]}>
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                    </View>
                    <Text style={[styles.cardMessage, { color: theme.textSecondary }]} numberOfLines={2}>{item.message}</Text>
                    <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View>
                    <Text style={styles.headerTitle}>Activity Feed</Text>
                    <Text style={styles.headerSub}>{unreadCount} unread alerts</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                        <Text style={styles.markAllText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </LinearGradient>

            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={theme.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="notifications-off-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>All caught up!</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>New notifications will appear here when items are claimed or found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '500' },
    markAllBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    markAllText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    list: { padding: 20, paddingBottom: 100 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        marginBottom: 12,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    iconCircle: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    cardMessage: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
    cardTime: { fontSize: 11, fontWeight: '600' },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, color: '#64748B', fontWeight: '500' }
});
