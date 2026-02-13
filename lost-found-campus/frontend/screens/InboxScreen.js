import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function InboxScreen({ navigation }) {
    const { dbUser, refreshBadges } = useUser();
    const { theme } = useTheme();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const fetchChats = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/chat');
            if (Array.isArray(response.data)) {
                console.log("📥 Inbox Data:", JSON.stringify(response.data, null, 2));
                setChats(response.data);
            }
        } catch (error) {
            console.error("Error fetching inbox:", error);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchChats();
            refreshBadges();
        });

        // Periodic refresh for live unread updates
        const interval = setInterval(() => {
            if (navigation.isFocused()) {
                fetchChats();
                refreshBadges();
            }
        }, 10000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [navigation]);

    const renderChatItem = ({ item }) => {
        const members = item.members || [];
        const otherMember = members.filter(m => m).find(m => m._id !== dbUser?._id);
        const avatarUrl = otherMember?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherMember?.fullName || 'User')}&background=F1F5F9&color=64748B&bold=true`;

        // Extract unread count for current user
        const myId = dbUser?._id?.toString();
        let unreadCount = 0;
        if (item.unreadCounts) {
            unreadCount = item.unreadCounts[myId] || 0;
            if (!unreadCount) {
                const match = Object.entries(item.unreadCounts).find(([k]) => k.toString() === myId);
                if (match) unreadCount = match[1];
            }
            console.log(`🔍 Chat ${item._id} | MyID: ${myId} | Counts:`, JSON.stringify(item.unreadCounts), `| Found: ${unreadCount}`);
        }

        const isMeLast = item.lastMessageSenderId === dbUser?._id || item.lastMessageSenderId === dbUser?._id?.toString();
        const displayMsg = (isMeLast ? 'You: ' : '') + (item.lastMessage || 'Tap to start chatting...');

        return (
            <TouchableOpacity
                style={[styles.chatCard, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate('Chat', {
                    chatId: item._id,
                    itemId: item.itemId,
                    itemType: item.itemType
                })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.participantName, { color: theme.text }]} numberOfLines={1}>
                            {otherMember?.fullName || 'Anonymous User'}
                        </Text>
                        <Text style={[styles.time, { color: unreadCount > 0 ? '#25D366' : theme.textSecondary }]}>
                            {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                    <View style={styles.messageRow}>
                        <Text style={[styles.lastMsg, { color: theme.textSecondary, fontWeight: unreadCount > 0 ? '700' : '500' }]} numberOfLines={1}>
                            {displayMsg}
                        </Text>
                        <View style={styles.badgeColumn}>
                            {unreadCount > 0 ? (
                                <View style={styles.waBadge}>
                                    <Text style={styles.waBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                </View>
                            ) : (
                                <Ionicons name="chevron-forward" size={16} color={theme.border} />
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (initialLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.headerTitle}>Messages</Text>
                <Text style={styles.headerSub}>Coordinate item handovers</Text>
            </LinearGradient>

            <FlatList
                data={chats}
                onRefresh={fetchChats}
                refreshing={loading}
                keyExtractor={item => item._id}
                renderItem={renderChatItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="chatbubbles-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.empty, { color: theme.text }]}>No messages yet</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                            Conversations appear here after you reach out to someone regarding a post.
                        </Text>
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
    chatCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 18, marginRight: 15, backgroundColor: '#F1F5F9' },
    unreadBadge: { position: 'absolute', top: -5, right: 8, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    chatInfo: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    participantName: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 10 },
    messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMsg: { fontSize: 14, flex: 1 },
    time: { fontSize: 11, fontWeight: '700' },
    badgeColumn: { alignItems: 'flex-end', minWidth: 25 },
    waBadge: { backgroundColor: '#25D366', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
    waBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    empty: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' }
});
