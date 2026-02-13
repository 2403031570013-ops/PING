import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';

export default function AdvancedAdminDashboard({ navigation }) {
    const { logout } = useUser();
    const { theme } = useTheme();
    const [currentTab, setCurrentTab] = useState('Overview');
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sRes, lRes, uRes] = await Promise.all([
                apiClient.get('/admin-mgmt/stats'),
                apiClient.get('/admin-mgmt/audit-logs'),
                apiClient.get('/admin-mgmt/users')
            ]);
            setStats(sRes.data.summary);
            setAuditLogs(lRes.data);
            setUsers(uRes.data);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to fetch dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleUserStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        try {
            await apiClient.patch(`/admin-mgmt/users/${userId}/status`, { status: newStatus });
            Alert.alert("Success", `User ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`);
            fetchData();
        } catch (err) {
            Alert.alert("Error", "Action failed.");
        }
    };

    const StatusCard = ({ label, value, icon, color }) => (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View flex={1}>
                <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );

    const renderAuditLog = ({ item }) => (
        <View style={[styles.logItem, { backgroundColor: theme.card }]}>
            <View style={styles.logLeft}>
                <View style={[styles.actionBadge, { backgroundColor: theme.primary + '10' }]}>
                    <Text style={[styles.actionBadgeText, { color: theme.primary }]}>{item.action.split('_')[0]}</Text>
                </View>
            </View>
            <View style={styles.logRight}>
                <View style={styles.logHeader}>
                    <Text style={[styles.logAction, { color: theme.text }]}>{item.performedBy?.fullName || 'System'}</Text>
                    <Text style={[styles.logTime, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.logDetails, { color: theme.textSecondary }]}>
                    Modified {item.targetType} record
                </Text>
                {item.note && <View style={styles.noteBox}><Text style={[styles.logNote, { color: theme.textSecondary }]}>{item.note}</Text></View>}
            </View>
        </View>
    );

    const renderUserItem = ({ item }) => (
        <View style={[styles.userRow, { backgroundColor: theme.card }]}>
            <View style={styles.userLeft}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>{item.fullName.charAt(0)}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.userName, { color: theme.text }]}>{item.fullName}</Text>
                    <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.role.toLowerCase()}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                    style={[styles.smallIconBtn, { backgroundColor: theme.primary + '15' }]}
                    onPress={() => navigation.navigate('Chat', { otherUserId: item._id })}
                >
                    <Ionicons name="chatbubble-ellipses" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.statusBtn, { backgroundColor: item.status === 'suspended' ? '#0F172A' : theme.success }]}
                    onPress={() => toggleUserStatus(item._id, item.status)}
                >
                    <Text style={[styles.statusBtnText, { color: '#fff' }]}>
                        {item.status === 'suspended' ? 'Suspended' : 'Active'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.topBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.consoleTitle}>Management Console</Text>
                <Text style={styles.consoleSub}>Campus Governance & Audit</Text>
            </LinearGradient>

            <View style={[styles.tabBar, { backgroundColor: theme.background }]}>
                {['Overview', 'Users', 'Audit Logs'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setCurrentTab(tab)}
                        style={[styles.tab, currentTab === tab && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, { color: currentTab === tab ? theme.primary : theme.textSecondary }]}>{tab}</Text>
                        {currentTab === tab && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
            ) : (
                <View style={styles.content}>
                    {currentTab === 'Overview' && stats && (
                        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Platform Summary</Text>
                            <View style={styles.statGrid}>
                                <StatusCard label="Total Users" value={stats.totalUsers} icon="people" color="#1E293B" />
                                <StatusCard label="Lost Reports" value={stats.totalLost} icon="search" color={theme.danger} />
                                <StatusCard label="Found Items" value={stats.totalFound} icon="gift" color={theme.success} />
                                <StatusCard label="Items Reunited" value={stats.resolvedCount} icon="checkmark-circle" color={theme.primary} />
                                <StatusCard label="Pending Claims" value={stats.pendingClaims} icon="time" color={theme.warning} />
                                <StatusCard label="Success Rate" value={`${stats.successRate}%`} icon="trending-up" color="#8B5CF6" />
                            </View>

                            <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
                                <LinearGradient colors={['#FCD34D', '#F59E0B']} style={styles.infoIconBox}>
                                    <Ionicons name="ribbon" size={20} color="#fff" />
                                </LinearGradient>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={[styles.infoTitle, { color: theme.text }]}>Institutional Impact</Text>
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${stats.successRate}%`, backgroundColor: theme.primary }]} />
                                    </View>
                                    <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>{stats.resolvedCount} users have successfully recovered their belongings.</Text>
                                </View>
                            </View>

                            {/* Category Breakdown Chart */}
                            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 25 }]}>Loss Analysis by Category</Text>
                            {stats.breakdown && stats.breakdown.map((item, index) => (
                                <View key={index} style={{ marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{item._id}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{item.count} items</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4 }}>
                                        <View style={{
                                            width: `${(item.count / stats.totalLost) * 100}%`,
                                            height: '100%',
                                            backgroundColor: item._id === 'Documents' ? '#EF4444' : theme.primary,
                                            borderRadius: 4
                                        }} />
                                    </View>
                                </View>
                            ))}

                            <View style={{ marginTop: 20, padding: 15, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                                <Text style={{ color: '#1E40AF', fontWeight: 'bold', fontSize: 14, marginBottom: 5 }}>ℹ️ President's Insight</Text>
                                <Text style={{ color: '#1E3A8A', fontSize: 12 }}>
                                    High volume of lost "Documents" (ID Cards) suggests a need for the Auto-ID Scanner feature at security desks.
                                </Text>
                            </View>
                        </ScrollView>
                    )}

                    {currentTab === 'Audit Logs' && (
                        <FlatList
                            data={auditLogs}
                            renderItem={renderAuditLog}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={<Text style={[styles.listHeader, { color: theme.text }]}>Governance Audit Trail</Text>}
                        />
                    )}

                    {currentTab === 'Users' && (
                        <FlatList
                            data={users}
                            renderItem={renderUserItem}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={<Text style={[styles.listHeader, { color: theme.text }]}>Access Management</Text>}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25 },
    consoleTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    consoleSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '500' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 25, marginTop: 10 },
    tab: { paddingVertical: 15, marginRight: 25, alignItems: 'center' },
    tabText: { fontWeight: '700', fontSize: 14 },
    tabIndicator: { height: 3, width: '100%', borderRadius: 3, marginTop: 8 },
    content: { flex: 1, paddingHorizontal: 25 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingBottom: 40, paddingTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    statCard: {
        width: '47%',
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        gap: 15,
        alignSelf: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
            }
        })
    },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    statValue: { fontSize: 22, fontWeight: '800' },
    infoBox: {
        marginTop: 25,
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
            }
        })
    },
    infoIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    infoTitle: { fontSize: 15, fontWeight: '700' },
    progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: 10, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    infoDesc: { fontSize: 12, fontWeight: '500' },
    list: { paddingBottom: 40, paddingTop: 10 },
    listHeader: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
    logItem: { padding: 16, borderRadius: 20, marginBottom: 12, flexDirection: 'row', gap: 12 },
    logLeft: { width: 60 },
    actionBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
    actionBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    logRight: { flex: 1 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    logAction: { fontWeight: '700', fontSize: 14 },
    logTime: { fontSize: 12 },
    logDetails: { fontSize: 13, marginBottom: 8 },
    noteBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 },
    logNote: { fontSize: 12, fontStyle: 'italic' },
    userRow: { padding: 16, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    userLeft: { flexDirection: 'row', alignItems: 'center' },
    userAvatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '800' },
    userName: { fontWeight: '700', fontSize: 15 },
    userEmail: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
    statusBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
    statusBtnText: { fontSize: 12, fontWeight: '700' },
    smallIconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }
});
