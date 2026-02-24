import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../config/axios';
import { useTheme } from '../context/ThemeContext';

export default function BlockedUsersScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState(null);

    const fetchBlockedUsers = async () => {
        try {
            const response = await apiClient.get('/user-reports/blocked');
            setBlockedUsers(response.data || []);
        } catch (error) {
            console.error("Fetch blocked error:", error);
            Alert.alert('Error', 'Failed to load blocked users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const handleUnblock = (user) => {
        Alert.alert(
            "Unblock User",
            `Are you sure you want to unblock ${user.fullName}? 他们将能够重新看到你的贴文。`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unblock",
                    style: "destructive",
                    onPress: async () => {
                        setUnblockingId(user._id);
                        try {
                            await apiClient.post(`/user-reports/unblock/${user._id}`);
                            setBlockedUsers(prev => prev.filter(u => u._id !== user._id));
                        } catch (err) {
                            Alert.alert('Error', 'Failed to unblock user.');
                        } finally {
                            setUnblockingId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={[styles.userCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Image
                source={{ uri: item.photoURL ? (item.photoURL.startsWith('http') ? item.photoURL : `http://127.0.0.1:5000${item.photoURL}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=random` }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.fullName}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleUnblock(item)}
                style={styles.unblockBtn}
                disabled={unblockingId === item._id}
            >
                {unblockingId === item._id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                    <Text style={[styles.unblockText, { color: theme.primary }]}>Unblock</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <LinearGradient colors={theme.primaryGradient} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Blocked Users</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>Manage people you've blocked from seeing your content.</Text>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : blockedUsers.length === 0 ? (
                <View style={styles.center}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
                        <Ionicons name="shield-checkmark-outline" size={60} color={theme.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Blocked Users</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        You haven't blocked anyone yet. Your community experience is safe!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 25, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    list: { padding: 16 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderBottomWidth: 0.5 },
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    userEmail: { fontSize: 12, fontWeight: '500' },
    unblockBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    unblockText: { fontSize: 13, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', fontWeight: '500', lineHeight: 20 }
});
