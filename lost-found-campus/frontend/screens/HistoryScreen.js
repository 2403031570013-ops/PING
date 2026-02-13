import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen({ navigation }) {
    const { dbUser } = useUser();
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const p1 = apiClient.get('/lost', { params: { postedBy: dbUser._id, status: 'resolved' } });
            const p2 = apiClient.get('/found', { params: { postedBy: dbUser._id, status: 'resolved' } });
            const p3 = apiClient.get('/lost', { params: { resolvedBy: dbUser._id, status: 'resolved' } });
            const p4 = apiClient.get('/found', { params: { resolvedBy: dbUser._id, status: 'resolved' } });

            const [res1, res2, res3, res4] = await Promise.all([p1, p2, p3, p4]);

            const allItems = [
                ...(res1.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res2.data || []).map(i => ({ ...i, type: 'found' })),
                ...(res3.data || []).map(i => ({ ...i, type: 'lost' })),
                ...(res4.data || []).map(i => ({ ...i, type: 'found' }))
            ];

            const uniqueItems = Array.from(new Map(allItems.map(item => [item._id, item])).values());
            setItems(uniqueItems.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)));
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('ItemDetail', { item, itemType: item.type })}
            activeOpacity={0.7}
        >
            <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.image} />
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: item.type === 'found' ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[styles.badgeText, { color: item.type === 'found' ? '#065F46' : '#991B1B' }]}>
                            {item.type === 'found' ? 'RETURNED' : 'RECOVERED'}
                        </Text>
                    </View>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="location" size={12} color={theme.textSecondary} />
                    <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                </View>
                <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.border} />
        </TouchableOpacity>
    );

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient colors={theme.primaryGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Resolutions</Text>
                    <Text style={styles.headerSub}>A history of good deeds</Text>
                </View>
            </LinearGradient>

            <FlatList
                data={items}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="time-outline" size={60} color="#CBD5E1" />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>No history yet</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Resolved items and successful claims will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2, fontWeight: '500' },
    list: { padding: 20, paddingBottom: 100 },
    itemCard: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 14,
        marginBottom: 12,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
            default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }
        })
    },
    image: { width: 64, height: 64, borderRadius: 16, marginRight: 15, backgroundColor: '#F1F5F9' },
    content: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    meta: { fontSize: 12, fontWeight: '600' },
    date: { fontSize: 11, fontWeight: '500' },
    empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
});
