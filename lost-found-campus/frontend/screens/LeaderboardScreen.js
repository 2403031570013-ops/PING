import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LeaderboardScreen() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const response = await apiClient.get('/auth/leaderboard');
            setUsers(response.data);
        } catch (error) {
            console.error("Leaderboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }) => {
        let podColor = '#fff';
        let rankBadge = null;

        if (index === 0) {
            podColor = '#fffbe6'; // Gold-ish
            rankBadge = '🥇';
        } else if (index === 1) {
            podColor = '#f5f5f5'; // Silver-ish
            rankBadge = '🥈';
        } else if (index === 2) {
            podColor = '#fff5e6'; // Bronze-ish
            rankBadge = '🥉';
        }

        return (
            <View style={[styles.card, { backgroundColor: podColor }]}>
                <View style={styles.rankCol}>
                    <Text style={styles.rankText}>{rankBadge || `#${index + 1}`}</Text>
                </View>
                <Image
                    source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=random` }}
                    style={styles.avatar}
                />
                <View style={styles.infoCol}>
                    <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={styles.role}>{item.role || 'Student'}</Text>
                </View>
                <View style={styles.karmaCol}>
                    <Ionicons name="star" size={16} color="#f1c40f" />
                    <Text style={styles.karmaText}>{item.karmaPoints || 0}</Text>
                </View>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
                <Text style={styles.title}>🏆 Campus Heroes</Text>
                <Text style={styles.subtitle}>Top contributors making our campus safer!</Text>
            </LinearGradient>

            <FlatList
                data={users}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    list: { padding: 15 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    rankCol: { width: 40, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    avatar: { width: 50, height: 50, borderRadius: 25, marginHorizontal: 10 },
    infoCol: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    role: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
    karmaCol: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    karmaText: { fontSize: 14, fontWeight: 'bold', marginLeft: 5, color: '#333' }
});
