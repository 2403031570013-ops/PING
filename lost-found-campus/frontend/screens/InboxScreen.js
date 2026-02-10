import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';

import { useTheme } from '../context/ThemeContext';

export default function InboxScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const fetchChats = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/chat');
            if (Array.isArray(response.data)) {
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
        });
        return unsubscribe;
    }, [navigation]);

    const renderChatItem = ({ item }) => {
        // Find the user who IS NOT the current user
        // Robust check for null members (deleted users)
        const members = item.members || [];
        const otherMember = members.filter(m => m).find(m => m._id !== dbUser?._id);

        return (
            <TouchableOpacity
                style={[styles.chatCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
                onPress={() => navigation.navigate('Chat', {
                    chatId: item._id,
                    itemId: item.itemId,
                    itemType: item.itemType
                })}
            >
                <Image
                    source={{ uri: otherMember?.photoURL || 'https://via.placeholder.com/60' }}
                    style={styles.avatar}
                />
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.participantName, { color: theme.text }]}>{otherMember?.fullName || 'Unknown User'}</Text>
                        <Text style={[styles.time, { color: theme.textSecondary }]}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.lastMsg, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.lastMessage || 'Start the conversation'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (initialLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#667eea" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={chats}
                onRefresh={fetchChats}
                refreshing={loading}
                keyExtractor={item => item._id}
                renderItem={renderChatItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.empty, { color: theme.text }]}>No messages yet.</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Chats appear here once you contact a finder or owner.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    chatCard: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
        alignItems: 'center'
    },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#eee' },
    chatInfo: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    participantName: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
    lastMsg: { color: '#666', fontSize: 14 },
    time: { fontSize: 12, color: '#999' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    empty: { fontSize: 18, color: '#333', fontWeight: 'bold' },
    emptySub: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }
});
