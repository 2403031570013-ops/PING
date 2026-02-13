import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    StatusBar,
    RefreshControl,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CATEGORIES = ['All', 'Electronics', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Others'];

export default function HomeScreen({ navigation, route }) {
    const { dbUser, unreadNotifs, refreshBadges } = useUser();
    const { theme, isDarkMode, role } = useTheme();
    const { campusId } = route.params || {};

    const [activeTab, setActiveTab] = useState('lost');
    const [activeCategory, setActiveCategory] = useState('All');
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ lost: 0, found: 0, reunited: 0 });

    const fetchItems = async () => {
        setLoading(true);
        try {
            const CID = campusId || dbUser?.campusId?._id || dbUser?.campusId || '';

            // Parallel fetch for items and global stats
            const [itemRes, statsRes] = await Promise.all([
                apiClient.get(activeTab === 'lost' ? '/lost' : '/found', { params: { campusId: CID } }),
                apiClient.get('/admin-mgmt/stats') // This might need permissions check or a public stats endpoint
            ]);

            if (Array.isArray(itemRes.data)) {
                setData(itemRes.data);
            }

            if (statsRes.data?.summary) {
                const s = statsRes.data.summary;
                setStats({
                    lost: s.totalLost,
                    found: s.totalFound,
                    reunited: s.resolvedCount
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        if (dbUser) refreshBadges();
    }, [activeTab, campusId, dbUser?.campusId]);

    const filteredItems = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase()) ||
                item.location?.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [data, search, activeCategory]);

    const getCampusName = () => {
        if (dbUser?.campusId?.name) return dbUser.campusId.name;
        return 'Your Campus';
    };

    const renderItem = ({ item }) => {
        const posterName = item.postedBy?.fullName || 'Unknown';
        const posterPhoto = item.postedBy?.photoURL || `https://ui-avatars.com/api/?name=${posterName}&background=random`;

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('ItemDetail', { item, itemType: activeTab })}
                style={[styles.itemCard, { backgroundColor: theme.card }]}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/150/667eea/ffffff?text=No+Image' }}
                    style={styles.itemImage}
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.itemGradient}
                >
                    <View style={[styles.itemBadge, { backgroundColor: theme.glassCard }]}>
                        <View style={[styles.statusDot, { backgroundColor: activeTab === 'lost' ? theme.danger : theme.success }]} />
                        <Text style={[styles.itemBadgeText, { color: theme.text }]}>
                            {activeTab === 'lost' ? 'LOST' : 'FOUND'}
                        </Text>
                    </View>

                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>

                    <View style={styles.itemMeta}>
                        <Ionicons name="location-sharp" size={12} color={theme.accent} />
                        <Text style={styles.itemLocation} numberOfLines={1}>{item.location || 'Unknown location'}</Text>
                    </View>

                    <View style={styles.userRow}>
                        <Image source={{ uri: posterPhoto }} style={styles.userAvatarSmall} />
                        <Text style={styles.userNameSmall} numberOfLines={1}>{posterName}</Text>
                        <Text style={styles.timeLabel}>2h ago</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const HeaderSection = () => (
        <LinearGradient
            colors={theme.primaryGradient}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.greetingHeader}>
                        {new Date().getHours() < 12 ? 'MORNING' : new Date().getHours() < 18 ? 'AFTERNOON' : 'EVENING'},
                    </Text>
                    <Text style={styles.userNameHeader}>{dbUser?.fullName?.split(' ')[0] || 'User'}</Text>
                    <View style={styles.locationChip}>
                        <Ionicons name="location" size={12} color="#fff" />
                        <Text style={styles.locationText}>{getCampusName()}</Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    {role === 'admin' && (
                        <TouchableOpacity
                            style={styles.actionCircle}
                            onPress={() => navigation.navigate('AdvancedAdmin')}
                        >
                            <Ionicons name="shield-checkmark" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionCircle}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <Ionicons name="notifications" size={20} color="#fff" />
                        {unreadNotifs > 0 && (
                            <View style={[styles.notifBadge, { backgroundColor: theme.danger }]} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.lost}</Text>
                    <Text style={styles.statLab}>LOST</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.found}</Text>
                    <Text style={styles.statLab}>FOUND</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.reunited}</Text>
                    <Text style={styles.statLab}>REUNITED</Text>
                </View>
            </View>

            {/* Premium Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search for a ${activeTab} item...`}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                )}
            </View>
        </LinearGradient>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            <FlatList
                data={filteredItems}
                numColumns={2}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                ListHeaderComponent={
                    <>
                        <HeaderSection />

                        {/* Tab Switcher (Floating style) */}
                        <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('lost')}
                                style={[styles.tabItem, activeTab === 'lost' && { backgroundColor: theme.primary + '15' }]}
                            >
                                <Ionicons name="flashlight" size={18} color={activeTab === 'lost' ? theme.primary : theme.textSecondary} />
                                <Text style={[styles.tabLabel, { color: activeTab === 'lost' ? theme.primary : theme.textSecondary }]}>Lost Items</Text>
                                {activeTab === 'lost' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveTab('found')}
                                style={[styles.tabItem, activeTab === 'found' && { backgroundColor: theme.success + '10' }]}
                            >
                                <Ionicons name="shield-checkmark" size={18} color={activeTab === 'found' ? theme.success : theme.textSecondary} />
                                <Text style={[styles.tabLabel, { color: activeTab === 'found' ? theme.success : theme.textSecondary }]}>Found Items</Text>
                                {activeTab === 'found' && <View style={[styles.activeIndicator, { backgroundColor: theme.success }]} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveTab('map')}
                                style={[styles.tabItem, activeTab === 'map' && { backgroundColor: '#6366f1' + '10' }]}
                            >
                                <Ionicons name="map" size={18} color={activeTab === 'map' ? '#6366f1' : theme.textSecondary} />
                                <Text style={[styles.tabLabel, { color: activeTab === 'map' ? '#6366f1' : theme.textSecondary }]}>Campus Map</Text>
                                {activeTab === 'map' && <View style={[styles.activeIndicator, { backgroundColor: '#6366f1' }]} />}
                            </TouchableOpacity>
                        </View>

                        {/* Category Row (Hide on Map) */}
                        {activeTab !== 'map' && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.categoryScroll}
                                contentContainerStyle={styles.categoryContent}
                            >
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryPill,
                                            { backgroundColor: theme.card, borderColor: theme.border },
                                            activeCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                                        ]}
                                        onPress={() => setActiveCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.categoryPillText,
                                            { color: theme.textSecondary },
                                            activeCategory === cat && { color: '#fff' }
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {activeTab === 'map' ? (
                            <View style={{ paddingHorizontal: 25, marginTop: 25 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>Parul University Map</Text>
                                    <View style={{ backgroundColor: theme.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary }}>Vadodara Campus</Text>
                                    </View>
                                </View>

                                <View style={{ borderRadius: 24, overflow: 'hidden', height: 450, backgroundColor: '#e2e8f0', position: 'relative', borderColor: theme.border, borderWidth: 1 }}>
                                    {/* Map Background - Using a generic campus style map */}
                                    <Image
                                        source={{ uri: 'https://img.freepik.com/free-vector/isometric-university-campus-map-navigator_1284-23131.jpg' }}
                                        style={{ width: '100%', height: '100%', opacity: 0.8 }}
                                        resizeMode="cover"
                                    />

                                    {/* Parul University Authentic Landmarks */}
                                    {[
                                        // SOUTH CAMPUS (Hostels & Mess)
                                        { name: 'Teresa Hostel', x: '10%', y: '75%', type: 'hostel', count: data.filter(i => i.location?.match(/teresa|girls/i)).length },
                                        { name: 'Atal Hostel', x: '25%', y: '80%', type: 'hostel', count: data.filter(i => i.location?.match(/atal|boys/i)).length },
                                        { name: 'Tagore Bhawan', x: '40%', y: '85%', type: 'hostel', count: data.filter(i => i.location?.match(/tagore/i)).length },
                                        { name: 'Indira Hostel', x: '15%', y: '65%', type: 'hostel', count: data.filter(i => i.location?.match(/indira/i)).length },

                                        // CENTRAL (Academic & Admin)
                                        { name: 'Admin Block', x: '45%', y: '50%', type: 'admin', count: data.filter(i => i.location?.match(/admin/i)).length },
                                        { name: 'Central Library', x: '55%', y: '55%', type: 'library', count: data.filter(i => i.location?.match(/library/i)).length },
                                        { name: 'PIT (Engg)', x: '35%', y: '40%', type: 'study', count: data.filter(i => i.location?.match(/pit|eng|tech/i)).length },
                                        { name: 'Homoeopathy', x: '60%', y: '35%', type: 'study', count: data.filter(i => i.location?.match(/homoeopathy|medical/i)).length },

                                        // NORTH / EAST (Food & Recreation)
                                        { name: 'Putulik Food Court', x: '70%', y: '60%', type: 'food', count: data.filter(i => i.location?.match(/putulik|canteen/i)).length },
                                        { name: 'Nescafe Point', x: '50%', y: '45%', type: 'food', count: data.filter(i => i.location?.match(/nescafe|coffee/i)).length },
                                        { name: 'Cricket Ground', x: '80%', y: '20%', type: 'sports', count: data.filter(i => i.location?.match(/ground|cricket/i)).length },

                                        // WEST (Hospital)
                                        { name: 'Parul Sevashram Hospital', x: '10%', y: '20%', type: 'hospital', count: data.filter(i => i.location?.match(/hospital|sevashram/i)).length },

                                    ].map((zone, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={{ position: 'absolute', left: zone.x, top: zone.y, alignItems: 'center' }}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                setSearch(zone.name.split(' ')[0]); // Filter list
                                                setActiveTab(activeTab === 'lost' ? 'lost' : 'found');
                                            }}
                                        >
                                            <View style={{
                                                backgroundColor: zone.count > 0 ? (zone.type === 'hostel' ? '#F59E0B' : zone.type === 'food' ? '#EF4444' : '#3B82F6') : '#94A3B8',
                                                width: 32, height: 32, borderRadius: 16,
                                                justifyContent: 'center', alignItems: 'center',
                                                borderWidth: 2, borderColor: '#fff',
                                                shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 6
                                            }}>
                                                <Ionicons
                                                    name={zone.type === 'hostel' ? 'bed' : zone.type === 'food' ? 'fast-food' : zone.type === 'sports' ? 'football' : zone.type === 'hospital' ? 'medkit' : 'school'}
                                                    size={14} color="#fff"
                                                />
                                            </View>
                                            {zone.count > 0 && (
                                                <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: theme.danger, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#fff' }}>
                                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{zone.count}</Text>
                                                </View>
                                            )}

                                            <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                                                <Text style={{ fontWeight: '800', color: '#1E293B', fontSize: 9 }}>{zone.name}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={{ textAlign: 'center', marginTop: 15, color: theme.textSecondary, fontSize: 12 }}>
                                    Tap a zone to see items reported there.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Contextual Tip */}
                                {filteredItems.length > 0 && (
                                    <View style={[styles.tipCard, { backgroundColor: theme.primary + '05', borderColor: theme.primary + '20' }]}>
                                        <Ionicons name="bulb" size={20} color={theme.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.tipTitle, { color: theme.text }]}>Quick Tip</Text>
                                            <Text style={[styles.tipSub, { color: theme.textSecondary }]}>
                                                {activeTab === 'lost'
                                                    ? "Provide specific identifiers (serial numbers, stickers) to find your item faster."
                                                    : "Always store found items at the Security Office after reporting here."}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                        {activeCategory === 'All' ? `Recent ${activeTab === 'lost' ? 'Lost' : 'Found'} Items` : activeCategory}
                                    </Text>
                                    <Text style={[styles.resultCount, { color: theme.textSecondary }]}>{filteredItems.length} results</Text>
                                </View>
                            </>
                        )}
                    </>
                }
                contentContainerStyle={styles.listContainer}
                columnWrapperStyle={styles.columnWrap}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchItems} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={[styles.emptyCircle, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name={activeTab === 'lost' ? 'search' : 'gift'} size={50} color={theme.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
                        <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                            {activeTab === 'lost'
                                ? "Nobody has reported any lost items matching your criteria."
                                : "No found items have been posted today. Check back later!"}
                        </Text>
                    </View>
                }
            />

            {/* Labeled FAB */}
            <TouchableOpacity
                style={[styles.fabExtended, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                onPress={() => navigation.navigate('PostItem', { campusId: campusId || dbUser?.campusId?._id })}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={theme.primaryGradient}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.fabLabel}>REPORT ITEM</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 35,
        paddingHorizontal: 25,
        borderBottomLeftRadius: 45,
        borderBottomRightRadius: 45
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    greetingHeader: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1.5 },
    userNameHeader: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
    locationChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
    locationText: { fontSize: 11, color: '#fff', marginLeft: 5, fontWeight: '700' },
    headerActions: { flexDirection: 'row', gap: 12 },
    actionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', position: 'relative' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#667eea' },

    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 25, paddingVertical: 15, paddingHorizontal: 20, marginBottom: 25 },
    statBox: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
    statLab: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '800', marginTop: 2 },
    statDiv: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.1)' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, height: 52, paddingHorizontal: 18 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#fff', fontWeight: '600' },

    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 25,
        marginTop: -28,
        borderRadius: 22,
        padding: 8,
        backgroundColor: '#fff',
        ...Platform.select({
            web: { boxShadow: '0 12px 25px rgba(0,0,0,0.1)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.1,
                shadowRadius: 25,
                elevation: 15
            }
        })
    },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 8, position: 'relative' },
    tabLabel: { fontSize: 13, fontWeight: '800' },
    activeIndicator: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2 },

    categoryScroll: { marginTop: 25, marginBottom: 5 },
    categoryContent: { paddingHorizontal: 25, gap: 10 },
    categoryPill: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 16, borderWidth: 1 },
    categoryPillText: { fontSize: 12, fontWeight: '700' },

    tipCard: { flexDirection: 'row', marginHorizontal: 25, marginTop: 20, padding: 18, borderRadius: 24, borderWidth: 1, gap: 15, alignItems: 'center' },
    tipTitle: { fontSize: 14, fontWeight: '800' },
    tipSub: { fontSize: 12, marginTop: 2, lineHeight: 18 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginTop: 30, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900' },
    resultCount: { fontSize: 12, fontWeight: '600' },

    listContainer: { paddingBottom: 120 },
    columnWrap: { justifyContent: 'space-between', paddingHorizontal: 25 },

    itemCard: {
        width: '48%',
        height: 260,
        borderRadius: 32,
        marginBottom: 18,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10
            }
        })
    },
    itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    itemGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingTop: 70 },
    itemBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    itemBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    itemTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 15 },
    itemLocation: { fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1, fontWeight: '600' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 12 },
    userAvatarSmall: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#fff' },
    userNameSmall: { fontSize: 10, color: '#fff', fontWeight: '700', flex: 1 },
    timeLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

    emptyWrap: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
    emptyCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
    emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
    emptyBtn: { marginTop: 30, paddingHorizontal: 25, paddingVertical: 14, borderRadius: 18, backgroundColor: '#0F172A' },
    emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    fabExtended: {
        position: 'absolute',
        bottom: 35,
        alignSelf: 'center',
        borderRadius: 30,
        backgroundColor: '#0F172A',
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(15, 23, 42, 0.3)' },
            default: {
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 15
            }
        })
    },
    fabGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 18, borderRadius: 30, gap: 10 },
    fabLabel: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
