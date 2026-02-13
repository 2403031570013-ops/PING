import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { useFocusEffect } from '@react-navigation/native';

export default function CallHistoryScreen({ navigation }) {
    const { theme } = useTheme();
    const { dbUser } = useUser();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCalls = async () => {
        try {
            const response = await apiClient.get('/calls');
            setCalls(response.data);
        } catch (error) {
            console.error("Error fetching call history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (dbUser) fetchCalls();
        }, [dbUser])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCalls();
    }, []);

    const formatCallTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item }) => {
        const isCaller = item.caller._id === dbUser._id;
        const otherUser = isCaller ? item.receiver : item.caller;

        // Handle case where user might be deleted (though populate should handle it, might return null for field)
        const fullName = otherUser ? otherUser.fullName : 'Unknown User';
        const photoURL = otherUser?.photoURL || 'https://via.placeholder.com/50';

        let iconName = 'call';
        let iconColor = theme.text;

        // Status Handling
        if (item.status === 'missed') {
            iconName = isCaller ? 'call-outline' : 'call';
            iconColor = '#ef4444';
        } else if (item.status === 'declined') {
            iconName = 'close-circle';
            iconColor = '#ef4444';
        } else if (item.status === 'completed') {
            iconName = isCaller ? 'arrow-up-circle' : 'arrow-down-circle';
            iconColor = '#22c55e'; // Green
        } else if (item.status === 'cancelled') {
            iconName = 'close';
            iconColor = 'orange';
        }

        return (
            <TouchableOpacity
                style={[styles.itemContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => otherUser && navigation.navigate('Chat', {
                    user: {
                        _id: otherUser._id,
                        fullName: otherUser.fullName,
                        photoURL: otherUser.photoURL,
                        role: otherUser.role || 'student'
                    }
                })}
            >
                <Image source={{ uri: photoURL }} style={styles.avatar} />
                <View style={styles.textContainer}>
                    <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
                    <View style={styles.row}>
                        <Ionicons name={iconName} size={14} color={iconColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.date, { color: theme.subText }]}>
                            {formatCallTime(item.startTime)}
                        </Text>
                    </View>
                </View>
                {otherUser && (
                    <TouchableOpacity onPress={() => navigation.navigate('Chat', {
                        user: { _id: otherUser._id, fullName, photoURL }
                    })}>
                        <Ionicons name="call" size={24} color={theme.primary} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={calls}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: theme.subText }}>No call history yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
    },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    textContainer: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    date: { fontSize: 12 },
});
