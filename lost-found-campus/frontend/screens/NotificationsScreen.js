import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform, Animated, Alert } from 'react-native';
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
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/notifications');
            setNotifications(response.data || []);
        } catch (error) {
            console.error("Notifications error:", error?.response?.data || error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Auto-mark as read when tapped
    const handleNotificationPress = async (item) => {
        if (!item.read) {
            await markAsRead(item._id);
        }

        // Toggle expanded actions
        setExpandedId(prev => prev === item._id ? null : item._id);

        // Navigation based on type
        if (['claim', 'resolved'].includes(item.type)) {
            navigation.navigate('Claims');
        }
    };

    const markAsRead = async (id) => {
        try {
            await apiClient.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            refreshBadges();
        } catch (error) {
            console.error("Mark read error:", error?.response?.data || error.message);
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            refreshBadges();
        } catch (error) {
            console.error("Mark all read error:", error?.response?.data || error.message);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await apiClient.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            refreshBadges();
        } catch (error) {
            console.error("Delete error:", error?.response?.data || error.message);
            const msg = error?.response?.data?.message || "Failed to delete notification";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
        }
    };

    const deleteAllNotifications = async () => {
        const doDelete = async () => {
            try {
                await apiClient.delete('/notifications');
                setNotifications([]);
                refreshBadges();
            } catch (error) {
                console.error("Delete all error:", error?.response?.data || error.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete all notifications? This cannot be undone.')) {
                await doDelete();
            }
        } else {
            Alert.alert('Delete All', 'Delete all notifications? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: doDelete }
            ]);
        }
    };

    const confirmDelete = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this notification?')) {
                deleteNotification(id);
            }
        } else {
            Alert.alert('Delete', 'Delete this notification?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(id) }
            ]);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'claim': return { name: 'hand-left', color: '#F59E0B', emoji: '🤝' };
            case 'match': return { name: 'git-compare', color: '#6366F1', emoji: '🔍' };
            case 'resolved': return { name: 'checkmark-circle', color: '#10B981', emoji: '✅' };
            case 'security': return { name: 'shield', color: '#EF4444', emoji: '🛡️' };
            case 'karma': return { name: 'star', color: '#F59E0B', emoji: '⭐' };
            case 'system': return { name: 'information-circle', color: '#3B82F6', emoji: 'ℹ️' };
            default: return { name: 'notifications', color: '#64748B', emoji: '🔔' };
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
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

    const renderItem = ({ item }) => {
        const icon = getIcon(item.type);
        const isExpanded = expandedId === item._id;
        const isUnread = !item.read;

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { backgroundColor: theme.card },
                    isUnread && styles.unreadCard,
                    isUnread && { backgroundColor: theme.primary + '08' },
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                {/* Unread indicator bar */}
                {isUnread && (
                    <View style={[styles.unreadBar, { backgroundColor: theme.primary || '#6366F1' }]} />
                )}

                <View style={styles.cardRow}>
                    {/* Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: `${icon.color}12` }]}>
                        <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Text style={[
                                styles.cardTitle,
                                { color: theme.text },
                                isUnread && styles.unreadTitle
                            ]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>

                        <Text style={[
                            styles.cardMessage,
                            { color: theme.textSecondary },
                            isUnread && { color: theme.text, opacity: 0.8 }
                        ]} numberOfLines={2}>
                            {item.message}
                        </Text>

                        {/* Type Badge + Unread Dot */}
                        <View style={styles.metaRow}>
                            <View style={[styles.typeBadge, { backgroundColor: `${icon.color}15` }]}>
                                <Text style={[styles.typeBadgeText, { color: icon.color }]}>
                                    {(item.type || 'info').toUpperCase()}
                                </Text>
                            </View>
                            {isUnread && (
                                <View style={styles.unreadLabel}>
                                    <View style={[styles.unreadDot, { backgroundColor: theme.primary || '#6366F1' }]} />
                                    <Text style={[styles.unreadText, { color: theme.primary || '#6366F1' }]}>New</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Action Buttons (expanded) */}
                {isExpanded && (
                    <View style={[styles.actionRow, { borderTopColor: theme.border || '#F1F5F9' }]}>
                        {isUnread ? (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.readBtn]}
                                onPress={() => markAsRead(item._id)}
                            >
                                <Ionicons name="checkmark-done" size={14} color="#10B981" />
                                <Text style={[styles.actionText, { color: '#10B981' }]}>Mark Read</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.actionBtn, styles.readDoneBtn]}>
                                <Ionicons name="checkmark-circle" size={14} color="#94A3B8" />
                                <Text style={[styles.actionText, { color: '#94A3B8' }]}>Already Read</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => confirmDelete(item._id)}
                        >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary || '#6366F1'} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
            </View>
        );
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.topBar, { borderBottomColor: theme.border || '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.topTitle, { color: theme.text }]}>Notifications</Text>
                <View style={{ width: 36 }} />
            </View>

            <LinearGradient
                colors={theme.primaryGradient || ['#6366F1', '#4F46E5']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View>
                    <Text style={styles.headerTitle}>Activity Feed</Text>
                    <Text style={styles.headerSub}>
                        {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
                            <Ionicons name="checkmark-done" size={14} color="#fff" />
                            <Text style={styles.headerBtnText}>Read All</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity style={[styles.headerBtn, styles.deleteAllBtn]} onPress={deleteAllNotifications}>
                            <Ionicons name="trash-outline" size={14} color="#fff" />
                            <Text style={styles.headerBtnText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Tip bar */}
            {notifications.length > 0 && (
                <View style={[styles.tipBar, { backgroundColor: theme.card }]}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary || '#94A3B8'} />
                    <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                        Tap a notification to mark as read • Tap again for options
                    </Text>
                </View>
            )}

            {/* Notifications List */}
            <FlatList
                data={notifications}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.list,
                    notifications.length === 0 && { flex: 1 }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
                        tintColor={theme.primary || '#6366F1'}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconBox, { backgroundColor: theme.card }]}>
                            <Ionicons name="notifications-off-outline" size={56} color={theme.textSecondary || '#CBD5E1'} />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>All caught up!</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                            No notifications yet. You'll receive alerts when items are matched, claimed, or resolved.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 13, marginTop: 4 },

    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topTitle: {
        fontSize: 17,
        fontWeight: '700',
    },

    // Gradient header
    header: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    headerSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    deleteAllBtn: {
        backgroundColor: 'rgba(239,68,68,0.3)',
        borderColor: 'rgba(239,68,68,0.3)',
    },
    headerBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // Tip bar
    tipBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    tipText: {
        fontSize: 11,
        fontWeight: '500',
    },

    // List
    list: { padding: 16, paddingBottom: 100 },

    // Card
    card: {
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
            default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }
        })
    },
    unreadCard: {
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.15)',
    },
    unreadBar: {
        height: 3,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconEmoji: {
        fontSize: 20,
    },
    cardContent: { flex: 1 },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '800',
    },
    cardMessage: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    cardTime: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Meta row
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    unreadLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    unreadText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Action Row (expanded)
    actionRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingVertical: 2,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
    },
    readBtn: {},
    readDoneBtn: { opacity: 0.5 },
    deleteBtn: {},
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 10,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptySub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});
