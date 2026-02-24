import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
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

export default function MyReportsScreen({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        try {
            const response = await apiClient.get('/user-reports/my-reports');
            setReports(response.data || []);
        } catch (error) {
            console.error("Fetch reports error:", error);
            Alert.alert('Error', 'Failed to load your reports.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'investigating': return '#3B82F6';
            case 'action_taken': return '#10B981';
            case 'dismissed': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.reportCard, { backgroundColor: theme.card, borderLeftColor: getStatusColor(item.status) }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.reason, { color: theme.text }]}>{item.reason}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.replace('_', ' ').toUpperCase()}
                    </Text>
                </View>
            </View>

            <Text style={[styles.target, { color: theme.textSecondary }]}>
                Reported: <Text style={{ color: theme.text, fontWeight: '700' }}>{item.reportedUserId?.fullName || 'Deleted User'}</Text>
            </Text>

            {item.description ? (
                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                    "{item.description}"
                </Text>
            ) : null}

            <View style={styles.cardFooter}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                {item.status === 'action_taken' && (
                    <View style={styles.actionRow}>
                        <Ionicons name="checkmark-done" size={14} color="#10B981" />
                        <Text style={styles.actionText}>Resolved</Text>
                    </View>
                )}
            </View>
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
                    <Text style={styles.headerTitle}>My Reports</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>Track the status of community reports you've submitted.</Text>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.center}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
                        <Ionicons name="flag-outline" size={60} color={theme.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Reports Found</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        You haven't reported any accounts. Thanks for keeping the campus friendly!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reports}
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
    reportCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    reason: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 10 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    target: { fontSize: 13, marginBottom: 8 },
    description: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 10 },
    date: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', fontWeight: '500', lineHeight: 20 }
});
