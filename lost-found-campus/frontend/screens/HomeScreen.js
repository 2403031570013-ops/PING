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
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
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

    const [claims, setClaims] = useState([]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const CID = campusId || dbUser?.campusId?._id || dbUser?.campusId || '';
            const [itemRes, statsRes, claimsRes] = await Promise.all([
                apiClient.get(activeTab === 'lost' ? '/lost' : '/found', { params: { campusId: CID } }),
                apiClient.get('/admin-mgmt/stats'),
                apiClient.get('/claims/sent')
            ]);

            if (Array.isArray(itemRes.data)) setData(itemRes.data);
            if (statsRes.data?.summary) {
                const s = statsRes.data.summary;
                setStats({
                    lost: s.totalLost,
                    found: s.totalFound,
                    reunited: s.resolvedCount
                });
            }
            if (Array.isArray(claimsRes.data)) setClaims(claimsRes.data.slice(0, 2));
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
            if (dbUser) refreshBadges();
        }, [activeTab, campusId, dbUser?.campusId])
    );

    const filteredItems = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
                (item.location || '').toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [data, search, activeCategory]);

    const getCampusName = () => {
        if (dbUser?.campusId?.name) return dbUser.campusId.name;
        if (campusId) return 'Selected Campus';
        return 'Campus Center';
    };

    const getKarmaStatus = (pts) => {
        if (pts >= 1500) return 'Campus Legend';
        if (pts >= 1000) return 'Star Helper';
        if (pts >= 500) return 'Verified Helper';
        return 'Newbie Helper';
    };

    const renderItem = ({ item }) => {
        const poster = item.postedBy || {};
        const posterName = poster.fullName || 'Unknown';
        const posterPhoto = poster.photoURL
            ? (poster.photoURL.startsWith('http') || poster.photoURL.startsWith('data:') ? poster.photoURL : `http://127.0.0.1:5000${poster.photoURL}`)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(posterName)}&background=random`;

        const itemImage = item.image
            ? (item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : `http://127.0.0.1:5000${item.image}`)
            : 'https://via.placeholder.com/150/667eea/ffffff?text=No+Image';

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('ItemDetail', { item, itemType: activeTab })}
                style={[styles.itemCard, { backgroundColor: theme.card }]}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: itemImage }}
                    style={styles.itemImage}
                />

                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.itemGradient}>
                    <View style={[styles.itemBadge, { backgroundColor: theme.glassCard }]}>
                        <View style={[styles.statusDot, { backgroundColor: activeTab === 'lost' ? theme.danger : theme.success }]} />
                        <Text style={[styles.itemBadgeText, { color: theme.text }]}>
                            {activeTab === 'lost' ? 'LOST' : 'FOUND'}
                        </Text>
                    </View>

                    <View style={{ position: 'absolute', top: 12, right: 12, alignItems: 'flex-end', gap: 4 }}>
                        {item.bounty > 0 && (
                            <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 8, fontWeight: '900', color: '#000' }}>₹{item.bounty}</Text>
                            </View>
                        )}
                        {item.priority === 'high' && (
                            <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>URGENT</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.itemMeta}>
                        <Ionicons name="location-sharp" size={12} color={theme.accent} />
                        <Text style={styles.itemLocation} numberOfLines={1}>{item.location || 'Unknown location'}</Text>
                    </View>
                    <View style={styles.userRow}>
                        <Image source={{ uri: posterPhoto }} style={styles.userAvatarSmall} />
                        <Text style={styles.userNameSmall} numberOfLines={1}>{posterName}</Text>
                        <Text style={styles.timeLabel}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const HeaderSection = () => (
        <View style={[styles.dashboardRoot, { backgroundColor: theme.background }]}>
            <View style={styles.topBranding}>
                <View style={styles.universityLogoContainer}>
                    <Ionicons name="apps" size={24} color={theme.primary} />
                    <Text style={[styles.logoText, { color: theme.text }]}>Campus Home</Text>
                    <Text style={styles.logoSubText}>{getCampusName()}</Text>
                </View>
                <View style={styles.headerRightActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[styles.actionIcon, { backgroundColor: theme.card }]}>
                        <Ionicons name="notifications" size={20} color={theme.text} />
                        {unreadNotifs > 0 && <View style={styles.redDot} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Image
                            source={{
                                uri: dbUser?.photoURL ?
                                    (dbUser.photoURL.startsWith('http') || dbUser.photoURL.startsWith('data:') ?
                                        dbUser.photoURL : `http://127.0.0.1:5000${dbUser.photoURL}`) :
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser?.fullName || 'User')}&background=${isDarkMode ? '2D5BFF' : 'fff'}&color=${isDarkMode ? 'fff' : '2D5BFF'}`
                            }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.karmaCard, { backgroundColor: theme.card }]}>
                <View style={styles.karmaHeader}>
                    <View style={[styles.karmaIconBox, { backgroundColor: theme.primary + '15' }]}>
                        <Ionicons name="trophy" size={20} color={theme.primary} />
                    </View>
                    <View>
                        <Text style={[styles.karmaTitle, { color: theme.text }]}>Your Helpful Points</Text>
                        <Text style={[styles.karmaStatus, { color: theme.textSecondary }]}>Status: <Text style={{ color: theme.primary }}>{getKarmaStatus(dbUser?.karmaPoints || 0)}</Text></Text>
                    </View>
                </View>
                <View style={styles.karmaXPRow}>
                    <View>
                        <Text style={[styles.xpVal, { color: theme.text }]}>{dbUser?.karmaPoints || 0} Points</Text>
                        <Text style={[styles.xpNext, { color: theme.textSecondary }]}>Help others to earn more badges!</Text>
                    </View>
                    <View style={[styles.xpProgressTrack, { backgroundColor: theme.border }]}>
                        <View style={[styles.xpProgressBar, { width: `${Math.min(100, (dbUser?.karmaPoints || 0) / 15)}%`, backgroundColor: theme.primary }]} />
                    </View>
                </View>
            </View>

            <View style={styles.dualCardRow}>
                <TouchableOpacity style={[styles.miniStatCard, { backgroundColor: theme.card }]} onPress={() => setActiveTab('lost')}>
                    <Ionicons name="file-tray-full" size={24} color="#EF4444" />
                    <Text style={[styles.miniStatLab, { color: theme.text }]}>Lost Items</Text>
                    <Text style={[styles.miniStatVal, { color: theme.text }]}>{stats.lost}</Text>
                    <Text style={[styles.miniStatSub, { color: theme.textSecondary }]}>Waiting to be found</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.miniStatCard, { backgroundColor: theme.card }]} onPress={() => setActiveTab('found')}>
                    <Ionicons name="archive" size={24} color={theme.success} />
                    <Text style={[styles.miniStatLab, { color: theme.text }]}>Found Items</Text>
                    <Text style={[styles.miniStatVal, { color: theme.text }]}>{stats.found}</Text>
                    <Text style={[styles.miniStatSub, { color: theme.textSecondary }]}>Reported recently</Text>
                </TouchableOpacity>
            </View>

            {claims.length > 0 && (
                <View style={[styles.claimsCard, { backgroundColor: theme.card }]}>
                    <View style={styles.sectionHeaderDashboard}>
                        <Text style={[styles.dashSectionTitle, { color: theme.text }]}>My Requests</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Claims')}>
                            <Text style={[styles.manageAllText, { color: theme.textSecondary }]}>SEE ALL</Text>
                        </TouchableOpacity>
                    </View>
                    {claims.map((claim) => (
                        <TouchableOpacity key={claim._id} style={styles.claimItem} onPress={() => navigation.navigate('Claims')}>
                            <View style={[styles.claimIconBox, { backgroundColor: theme.background }]}>
                                <Ionicons name="cube" size={18} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.claimName, { color: theme.text }]}>{claim.itemId?.title || 'Unknown Item'}</Text>
                                <Text style={[styles.claimStatus, { color: claim.status === 'approved' ? theme.success : theme.textSecondary }]}>
                                    <Ionicons name={claim.status === 'approved' ? "checkmark-circle" : "time"} size={10} />
                                    {claim.status === 'approved' ? ' Ready for Pickup' : ` ${claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}`}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={[styles.reunitedCard, { backgroundColor: theme.card }]}>
                <View style={styles.reunitedInner}>
                    <View>
                        <Text style={[styles.reunitedVal, { color: theme.text }]}>{stats.reunited}</Text>
                        <Text style={[styles.reunitedLab, { color: theme.textSecondary }]}>TOTAL REUNITED</Text>
                    </View>
                    <Ionicons name="heart" size={40} color={theme.danger} />
                </View>
            </View>
        </View>
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
                                <Text style={[styles.tabLabel, { color: activeTab === 'lost' ? theme.primary : theme.textSecondary }]}>Missing Items</Text>
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
                                onPress={() => navigation.navigate('Map')}
                                style={[styles.tabItem]}
                            >
                                <Ionicons name="map" size={18} color={theme.textSecondary} />
                                <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>Place Map</Text>
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
                    <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} tintColor={theme.primary} />
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
    dashboardRoot: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    topBranding: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginBottom: 25,
    },
    universityLogoContainer: { flex: 1 },
    logoText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    logoSubText: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    headerAvatar: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: '#2D5BFF' },
    redDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#0A0D14' },

    // 1. Karma Card
    karmaCard: { marginHorizontal: 25, borderRadius: 24, padding: 20, marginBottom: 20 },
    karmaHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
    karmaIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    karmaTitle: { fontSize: 16, fontWeight: '800' },
    karmaStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    karmaXPRow: { marginBottom: 20 },
    xpVal: { fontSize: 24, fontWeight: '900' },
    xpNext: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    xpProgressTrack: { height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
    xpProgressBar: { height: '100%', borderRadius: 3 },
    karmaStatsRow: { flexDirection: 'row', gap: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    karmaStatItem: { flex: 1 },
    kStatLab: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    kStatVal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
    kStatDiv: { width: 1, height: '100%' },

    // 2. Dual Mini Cards
    dualCardRow: { flexDirection: 'row', paddingHorizontal: 25, gap: 15, marginBottom: 20 },
    miniStatCard: { flex: 1, borderRadius: 24, padding: 20 },
    miniStatLab: { fontSize: 14, fontWeight: '800', marginTop: 12 },
    miniStatVal: { fontSize: 32, fontWeight: '900', marginTop: 8 },
    miniStatSub: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    miniActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 20 },
    miniActionText: { fontSize: 12, fontWeight: '800' },
    foundAvatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    foundAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
    foundMore: { justifyContent: 'center', alignItems: 'center' },
    foundMoreText: { fontSize: 9, fontWeight: '800' },

    // 3. Claims Card
    claimsCard: { marginHorizontal: 25, borderRadius: 24, padding: 20, marginBottom: 20 },
    sectionHeaderDashboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    dashSectionTitle: { fontSize: 16, fontWeight: '800' },
    dashSectionSub: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 20 },
    manageAllText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    claimItem: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
    claimIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    claimName: { fontSize: 14, fontWeight: '700' },
    claimStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    // 6. Reunited Card (Logic Driven)
    reunitedCard: { marginHorizontal: 25, borderRadius: 24, padding: 25, marginBottom: 40 },
    reunitedInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reunitedVal: { fontSize: 36, fontWeight: '900' },
    reunitedLab: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

    tabContainer: { flexDirection: 'row', marginHorizontal: 25, marginTop: 15, borderRadius: 22, padding: 8 },
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
    },
    fabGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 18, borderRadius: 30, gap: 10 },
    fabLabel: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
