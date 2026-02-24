import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    const [activeTab, setActiveTab] = useState('all');

    const fetchCalls = async () => {
        try {
            const response = await apiClient.get('/calls');
            setCalls(response.data || []);
        } catch (error) {
            console.error("Error fetching call history:", error?.response?.data || error.message);
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

    // Filter calls based on tab
    const filteredCalls = calls.filter(call => {
        if (!dbUser) return false;
        if (activeTab === 'all') return true;
        const isCaller = call.caller?._id === dbUser._id;
        if (activeTab === 'outgoing') return isCaller;
        if (activeTab === 'incoming') return !isCaller;
        if (activeTab === 'missed') return call.status === 'missed' && !isCaller;
        return true;
    });

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (days === 0) return `Today, ${time}`;
        if (days === 1) return `Yesterday, ${time}`;
        if (days < 7) return `${days}d ago, ${time}`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + `, ${time}`;
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    const getCallInfo = (call) => {
        if (!dbUser) return {};
        const isCaller = call.caller?._id === dbUser._id;
        const otherUser = isCaller ? call.receiver : call.caller;
        const direction = isCaller ? 'outgoing' : 'incoming';

        let icon, color, label;
        switch (call.status) {
            case 'missed':
                icon = 'arrow-down-circle';
                color = '#EF4444';
                label = isCaller ? 'No Answer' : 'Missed';
                break;
            case 'declined':
                icon = 'close-circle';
                color = '#EF4444';
                label = isCaller ? 'Declined' : 'Declined';
                break;
            case 'completed':
                icon = isCaller ? 'arrow-up-circle' : 'arrow-down-circle';
                color = '#10B981';
                label = isCaller ? 'Outgoing' : 'Incoming';
                break;
            case 'cancelled':
                icon = 'close-circle-outline';
                color = '#F59E0B';
                label = 'Cancelled';
                break;
            default:
                icon = isCaller ? 'arrow-up-circle' : 'arrow-down-circle';
                color = isCaller ? '#3B82F6' : '#10B981';
                label = isCaller ? 'Outgoing' : 'Incoming';
        }

        return { isCaller, otherUser, direction, icon, color, label };
    };

    const renderCall = ({ item }) => {
        const { isCaller, otherUser, direction, icon, color, label } = getCallInfo(item);

        const fullName = otherUser?.fullName || 'Unknown User';
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const photoURL = otherUser?.photoURL;
        const duration = formatDuration(item.duration);

        return (
            <TouchableOpacity
                style={[styles.callCard, { backgroundColor: theme.card }]}
                onPress={() => otherUser && navigation.navigate('Chat', {
                    user: {
                        _id: otherUser._id,
                        fullName: otherUser.fullName,
                        photoURL: otherUser.photoURL,
                        role: otherUser.role || 'student'
                    }
                })}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={styles.avatarWrapper}>
                    {photoURL ? (
                        <Image source={{ uri: photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: color + '15' }]}>
                            <Text style={[styles.avatarInitials, { color }]}>{initials}</Text>
                        </View>
                    )}
                    {/* Direction indicator */}
                    <View style={[styles.directionBadge, { backgroundColor: color }]}>
                        <Ionicons
                            name={isCaller ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color="#fff"
                        />
                    </View>
                </View>

                {/* Call Info */}
                <View style={styles.callInfo}>
                    <Text style={[styles.callName, { color: theme.text }]} numberOfLines={1}>
                        {fullName}
                    </Text>
                    <View style={styles.callMeta}>
                        <Ionicons name={icon} size={14} color={color} />
                        <Text style={[styles.callLabel, { color }]}>{label}</Text>
                        {duration && (
                            <>
                                <Text style={[styles.callDot, { color: theme.textSecondary }]}>•</Text>
                                <Text style={[styles.callDuration, { color: theme.textSecondary }]}>{duration}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Time & Action */}
                <View style={styles.callRight}>
                    <Text style={[styles.callTime, { color: theme.textSecondary }]}>
                        {formatTime(item.startTime || item.createdAt)}
                    </Text>
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#10B981' + '15' }]}
                        onPress={() => otherUser && navigation.navigate('Chat', {
                            user: { _id: otherUser._id, fullName, photoURL }
                        })}
                    >
                        <Ionicons name="call" size={16} color="#10B981" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const tabCounts = {
        all: calls.length,
        incoming: calls.filter(c => c.caller?._id !== dbUser?._id).length,
        outgoing: calls.filter(c => c.caller?._id === dbUser?._id).length,
        missed: calls.filter(c => c.status === 'missed' && c.caller?._id !== dbUser?._id).length,
    };

    const TabButton = ({ value, label, icon }) => {
        const isActive = activeTab === value;
        const count = tabCounts[value] || 0;
        return (
            <TouchableOpacity
                style={[
                    styles.tabBtn,
                    isActive && styles.tabBtnActive,
                    isActive && { backgroundColor: '#6366F1' + '12' }
                ]}
                onPress={() => setActiveTab(value)}
            >
                <Ionicons
                    name={icon}
                    size={14}
                    color={isActive ? '#6366F1' : theme.textSecondary || '#94A3B8'}
                />
                <Text style={[
                    styles.tabText,
                    isActive && styles.tabTextActive
                ]}>
                    {label}
                </Text>
                {count > 0 && (
                    <View style={[
                        styles.tabCount,
                        { backgroundColor: isActive ? '#6366F1' : '#E2E8F0' }
                    ]}>
                        <Text style={[
                            styles.tabCountText,
                            { color: isActive ? '#fff' : '#64748B' }
                        ]}>
                            {count}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading calls...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <LinearGradient
                colors={theme.primaryGradient || ['#6366F1', '#4F46E5']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View>
                    <Text style={styles.headerTitle}>Call History</Text>
                    <Text style={styles.headerSub}>
                        {calls.length} total call{calls.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="call" size={22} color="rgba(255,255,255,0.8)" />
                </View>
            </LinearGradient>

            {/* Filter Tabs */}
            <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.border || '#F1F5F9' }]}>
                <TabButton value="all" label="All" icon="list-outline" />
                <TabButton value="incoming" label="Incoming" icon="arrow-down-circle-outline" />
                <TabButton value="outgoing" label="Outgoing" icon="arrow-up-circle-outline" />
                <TabButton value="missed" label="Missed" icon="close-circle-outline" />
            </View>

            {/* Calls List */}
            <FlatList
                data={filteredCalls}
                keyExtractor={(item) => item._id}
                renderItem={renderCall}
                contentContainerStyle={[
                    styles.listContent,
                    filteredCalls.length === 0 && { flex: 1 }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366F1"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
                            <Ionicons
                                name={activeTab === 'missed' ? 'call-outline' : activeTab === 'incoming' ? 'arrow-down-circle-outline' : activeTab === 'outgoing' ? 'arrow-up-circle-outline' : 'call-outline'}
                                size={48}
                                color={theme.textSecondary || '#94A3B8'}
                            />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>
                            {activeTab === 'all' ? 'No Calls Yet' :
                                activeTab === 'incoming' ? 'No Incoming Calls' :
                                    activeTab === 'outgoing' ? 'No Outgoing Calls' :
                                        'No Missed Calls'}
                        </Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                            {activeTab === 'all'
                                ? 'When you make or receive calls, they\'ll appear here'
                                : `Your ${activeTab} calls will appear here`
                            }
                        </Text>
                    </View>
                }
                ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: theme.border || '#F1F5F9' }]} />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 13 },

    // Header
    header: {
        paddingTop: 50,
        paddingBottom: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.3,
    },
    headerSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        borderBottomWidth: 1,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 10,
        gap: 4,
    },
    tabBtnActive: {
        borderWidth: 1,
        borderColor: '#6366F1' + '30',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    tabTextActive: {
        color: '#6366F1',
        fontWeight: '700',
    },
    tabCount: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    tabCountText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // List
    listContent: {
        paddingVertical: 8,
    },
    separator: {
        height: 1,
        marginLeft: 78,
    },

    // Call Card
    callCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: '800',
    },
    directionBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },

    // Call Info
    callInfo: {
        flex: 1,
        gap: 4,
    },
    callName: {
        fontSize: 15,
        fontWeight: '700',
    },
    callMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    callLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    callDot: {
        fontSize: 10,
    },
    callDuration: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Right Section
    callRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    callTime: {
        fontSize: 11,
        fontWeight: '500',
    },
    callBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 10,
    },
    emptyIcon: {
        width: 90,
        height: 90,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
