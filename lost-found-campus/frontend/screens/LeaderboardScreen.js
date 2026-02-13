import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function LeaderboardScreen() {
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            // Updated endpoint to match backend route
            const response = await apiClient.get('/admin-mgmt/leaderboard');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Leaderboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }) => {
        const isPodium = index < 3;
        const podiumColors = ['#F59E0B', '#94A3B8', '#B45309']; // Gold, Silver, Bronze
        const podiumIcons = ['🥇', '🥈', '🥉'];

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.rankCol}>
                    {isPodium ? (
                        <Text style={styles.podiumText}>{podiumIcons[index]}</Text>
                    ) : (
                        <Text style={[styles.rankText, { color: theme.textSecondary }]}>#{index + 1}</Text>
                    )}
                </View>

                <Image
                    source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=F1F5F9&color=64748B&bold=true` }}
                    style={[styles.avatar, isPodium && { borderColor: podiumColors[index], borderWidth: 2 }]}
                />

                <View style={styles.infoCol}>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={[styles.role, { color: theme.textSecondary }]}>{item.role || 'Student'}</Text>
                </View>

                <View style={[styles.karmaCol, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="sparkles" size={14} color={theme.primary} />
                    <Text style={[styles.karmaText, { color: theme.primary }]}>{item.karmaPoints || 0}</Text>
                </View>
            </View>
        );
    };

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.headerTitle}>Campus Heroes</Text>
                <Text style={styles.headerSub}>Top contributors making our campus safer</Text>
            </LinearGradient>

            <FlatList
                data={users}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="trophy-outline" size={60} color="#CBD5E1" />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No records yet</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Be the first to help someone and top the leadboard!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontWeight: '500' },
    list: { padding: 15, paddingBottom: 100 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    rankCol: { width: 40, alignItems: 'center' },
    podiumText: { fontSize: 20 },
    rankText: { fontSize: 13, fontWeight: '800' },
    avatar: { width: 44, height: 44, borderRadius: 18, marginHorizontal: 10, backgroundColor: '#F1F5F9' },
    infoCol: { flex: 1 },
    name: { fontSize: 15, fontWeight: '800' },
    role: { fontSize: 12, fontWeight: '500', marginTop: 2, textTransform: 'capitalize' },
    karmaCol: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    karmaText: { fontSize: 14, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});

