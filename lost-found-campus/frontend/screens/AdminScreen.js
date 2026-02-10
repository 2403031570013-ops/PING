import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';

export default function AdminScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        try {
            const res = await apiClient.get('/reports');
            setItems(res.data);
        } catch (error) {
            console.error("Error fetching reports:", error);
            Alert.alert("Error", "Failed to fetch reports.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleAction = async (report, action) => {
        // action: 'dismiss' (ignore report) or 'delete_item' (remove content)
        if (action === 'delete_item') {
            Alert.alert(
                "Delete Item",
                "This will permanently delete the reported item.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await apiClient.delete(`/${report.itemType}/${report.itemId}`);
                                await apiClient.patch(`/reports/${report._id}`, { status: 'resolved' });
                                Alert.alert("Success", "Item deleted and report resolved.");
                                fetchReports();
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete item.");
                            }
                        }
                    }
                ]
            );
        } else if (action === 'dismiss') {
            try {
                await apiClient.patch(`/reports/${report._id}`, { status: 'reviewed' });
                fetchReports(); // Refresh
            } catch (err) {
                Alert.alert("Error", "Failed to update report.");
            }
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: '#d32f2f' }]}>Report: {item.itemDetails?.title || 'Unknown Item'}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>Reason: {item.reason}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>By: {item.reportedBy?.fullName || 'Anonymous'}</Text>
                <Text style={[styles.desc, { color: theme.text }]}>"{item.description}"</Text>
                <Text style={[styles.status, { color: item.status === 'pending' ? 'orange' : 'green' }]}>
                    Status: {item.status.toUpperCase()}
                </Text>
            </View>
            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.dismissBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                        onPress={() => handleAction(item, 'dismiss')}
                    >
                        <Text style={[styles.btnText, { color: theme.text }]}>Dismiss</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.deleteBtn]}
                        onPress={() => handleAction(item, 'delete_item')}
                    >
                        <Text style={styles.btnText}>Delete Item</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.header, { color: theme.text }]}>Admin Dashboard - Reports</Text>
            <View style={[styles.stats, { backgroundColor: theme.card }]}>
                <Text style={[styles.statText, { color: theme.text }]}>Pending Reports: {items.filter(i => i.status === 'pending').length}</Text>
            </View>
            <FlatList
                data={items.filter(i => i.status === 'pending')}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No pending reports.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15 },
    header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    stats: { padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
    statText: { fontSize: 16, fontWeight: '600' },
    itemCard: {
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        elevation: 1
    },
    content: { marginBottom: 10 },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    meta: { fontSize: 13, marginTop: 2 },
    desc: { fontStyle: 'italic', marginTop: 5 },
    status: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
    dismissBtn: {},
    deleteBtn: { backgroundColor: '#ff5252', borderColor: '#ff5252' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { textAlign: 'center', marginTop: 50 }
});
