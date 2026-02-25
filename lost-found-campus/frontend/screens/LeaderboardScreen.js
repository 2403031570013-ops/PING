import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import apiClient, { BACKEND_URL } from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

export default function LeaderboardScreen({ navigation }) {
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const response = await apiClient.get('/admin-mgmt/leaderboard');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Leaderboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const PodiumUser = ({ user, rank, size, offset }) => {
        if (!user) return <View style={{ width: size + 20 }} />;
        const medals = ['👑', '🥈', '🥉'];
        const borderColors = ['#F59E0B', '#94A3B8', '#B45309'];
        const bgColors = ['rgba(245,158,11,0.15)', 'rgba(148,163,184,0.15)', 'rgba(180,83,9,0.15)'];
        const photoUrl = getImageUrl(user.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=1E293B&color=fff&bold=true`;

        return (
            <View style={[styles.podiumUser, { marginTop: offset }]}>
                <Text style={styles.podiumMedal}>{medals[rank]}</Text>
                <View style={[styles.podiumAvatarRing, { borderColor: borderColors[rank], width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
                    <Image
                        source={{ uri: photoUrl }}
                        style={[styles.podiumAvatar, { width: size, height: size, borderRadius: size / 2 }]}
                    />
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{user.fullName?.split(' ')[0]}</Text>
                <View style={[styles.podiumKarma, { backgroundColor: bgColors[rank] }]}>
                    <Text style={[styles.podiumKarmaText, { color: borderColors[rank] }]}>
                        ⚡ {user.karmaPoints || 0}
                    </Text>
                </View>
            </View>
        );
    };

    const renderItem = ({ item, index }) => {
        const actualRank = index + 3; // Already skipping top 3
        const photoUrl = getImageUrl(item.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=F1F5F9&color=64748B&bold=true`;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.rankCol}>
                    <Text style={[styles.rankText, { color: theme.textSecondary }]}>#{actualRank + 1}</Text>
                </View>

                <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatar}
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

    const top3 = users.slice(0, 3);
    const restUsers = users.slice(3);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>🏆 Campus Heroes</Text>
                        <Text style={styles.headerSub}>Top contributors who helped the most</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>

                {/* Podium Section */}
                {top3.length >= 3 && (
                    <View style={styles.podiumContainer}>
                        <PodiumUser user={top3[1]} rank={1} size={60} offset={20} />
                        <PodiumUser user={top3[0]} rank={0} size={72} offset={0} />
                        <PodiumUser user={top3[2]} rank={2} size={56} offset={28} />
                    </View>
                )}
                {top3.length > 0 && top3.length < 3 && (
                    <View style={styles.podiumContainer}>
                        {top3.map((u, i) => (
                            <PodiumUser key={u._id} user={u} rank={i} size={64} offset={i * 10} />
                        ))}
                    </View>
                )}
            </LinearGradient>

            {/* Stats Bar */}
            <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
                <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: theme.primary }]}>{users.length}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>HEROES</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: '#F59E0B' }]}>{users.reduce((s, u) => s + (u.karmaPoints || 0), 0)}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TOTAL KARMA</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: '#10B981' }]}>{top3[0]?.karmaPoints || 0}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TOP SCORE</Text>
                </View>
            </View>

            <FlatList
                data={restUsers}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    restUsers.length > 0 ? (
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>OTHER CONTRIBUTORS</Text>
                    ) : null
                }
                ListEmptyComponent={
                    users.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="trophy-outline" size={60} color="#CBD5E1" />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No records yet</Text>
                            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Be the first to help someone and top the list!</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4, fontWeight: '500' },

    // Podium
    podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, paddingVertical: 10 },
    podiumUser: { alignItems: 'center', width: 90 },
    podiumMedal: { fontSize: 24, marginBottom: 6 },
    podiumAvatarRing: { borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    podiumAvatar: { backgroundColor: '#1e293b' },
    podiumName: { color: '#fff', fontSize: 12, fontWeight: '800', marginBottom: 4 },
    podiumKarma: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    podiumKarmaText: { fontSize: 11, fontWeight: '900' },

    // Stats Bar
    statsBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: -15, borderRadius: 18, padding: 14, justifyContent: 'space-around', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
    statDivider: { width: 1, height: 28 },

    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },
    list: { padding: 20, paddingBottom: 100 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 18,
        marginBottom: 10,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    rankCol: { width: 40, alignItems: 'center' },
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
