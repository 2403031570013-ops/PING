import React, { useState, useEffect } from 'react';
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
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['All', 'Electronics', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Others'];

export default function HomeScreen({ navigation, route }) {
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const { campusId } = route.params || {};
    const [activeTab, setActiveTab] = useState('lost');
    const [activeCategory, setActiveCategory] = useState('All');
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const CID = campusId || dbUser?.campusId?._id || dbUser?.campusId || '';
            const endpoint = activeTab === 'lost' ? '/lost' : '/found';

            const response = await apiClient.get(endpoint, {
                params: { campusId: CID }
            });

            if (Array.isArray(response.data)) {
                setData(response.data);
            }
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [activeTab, campusId, dbUser?.campusId]);

    const filteredItems = data.filter(item => {
        const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.location?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

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
                style={styles.itemCard}
                activeOpacity={0.85}
            >
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/150/667eea/ffffff?text=No+Image' }}
                    style={styles.itemImage}
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.itemGradient}
                >
                    <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>
                            {activeTab === 'lost' ? '🔍 LOST' : '✅ FOUND'}
                        </Text>
                    </View>

                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>

                    <View style={styles.itemMeta}>
                        <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.itemLocation} numberOfLines={1}>{item.location || 'Unknown location'}</Text>
                    </View>

                    <View style={styles.userRow}>
                        <Image source={{ uri: posterPhoto }} style={styles.userAvatarSmall} />
                        <Text style={styles.userNameSmall} numberOfLines={1}>{posterName}</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>
                            Hello, {dbUser?.fullName?.split(' ')[0] || 'there'}! 👋
                        </Text>
                        <View style={styles.campusRow}>
                            <Ionicons name="school" size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.campusName}>{getCampusName()}</Text>
                        </View>
                    </View>

                    {dbUser?.role === 'admin' && (
                        <TouchableOpacity
                            style={styles.adminBadge}
                            onPress={() => navigation.navigate('Admin')}
                        >
                            <Ionicons name="shield-checkmark" size={16} color="#ffc107" />
                            <Text style={styles.adminText}>Admin</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.notifBtn}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#667eea" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={`Search ${activeTab} items...`}
                        placeholderTextColor="#999"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('lost')}
                    style={[styles.tab, activeTab === 'lost' && styles.activeTab]}
                >
                    <Ionicons
                        name="search-circle"
                        size={24}
                        color={activeTab === 'lost' ? '#667eea' : '#999'}
                    />
                    <Text style={[styles.tabText, activeTab === 'lost' && styles.activeTabText]}>
                        Lost Items
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('found')}
                    style={[styles.tab, activeTab === 'found' && styles.activeTab]}
                >
                    <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={activeTab === 'found' ? '#43e97b' : '#999'}
                    />
                    <Text style={[styles.tabText, activeTab === 'found' && styles.activeTabTextFound]}>
                        Found Items
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryContainer}
                contentContainerStyle={styles.categoryContent}
            >
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.categoryChip,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            activeCategory === cat && styles.activeCategoryChip
                        ]}
                        onPress={() => setActiveCategory(cat)}
                    >
                        <Text style={[
                            styles.categoryText,
                            { color: theme.textSecondary },
                            activeCategory === cat && styles.activeCategoryText
                        ]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredItems}
                numColumns={2}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={fetchItems}
                        colors={['#667eea']}
                        tintColor="#667eea"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name={activeTab === 'lost' ? 'search' : 'checkmark-done'}
                                size={60}
                                color="#ddd"
                            />
                        </View>
                        <Text style={styles.emptyTitle}>No {activeTab} items yet</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'lost'
                                ? 'Report your lost item to get help finding it!'
                                : 'Found something? Help someone find their item!'}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('PostItem', { campusId: campusId || dbUser?.campusId?._id })}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={activeTab === 'lost' ? ['#667eea', '#764ba2'] : ['#43e97b', '#38f9d7']}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    greeting: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 5 },
    campusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    campusName: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
    adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 5 },
    adminText: { fontSize: 12, fontWeight: '600', color: '#ffc107' },
    notifBtn: { marginLeft: 10, padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, borderRadius: 15, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: -25, backgroundColor: '#fff', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
    activeTab: { backgroundColor: '#f8f9ff' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
    activeTabText: { color: '#667eea' },
    activeTabTextFound: { color: '#43e97b' },

    // Category Chips
    categoryContainer: { marginTop: 10, marginBottom: 5 },
    categoryContent: { paddingHorizontal: 15 },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e0e0e0' },
    activeCategoryChip: { backgroundColor: '#667eea', borderColor: '#667eea' },
    categoryText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeCategoryText: { color: '#fff' },

    listContent: { padding: 15, paddingTop: 10, paddingBottom: 100 },
    columnWrapper: { justifyContent: 'space-between' },

    // Updated Card Styles
    itemCard: { width: '48%', height: 220, borderRadius: 20, marginBottom: 15, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    itemGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 40 },
    itemBadge: { position: 'absolute', top: -25, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    itemBadgeText: { fontSize: 10, fontWeight: '700', color: '#333' },
    itemTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 5 },
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    itemLocation: { fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1 },

    // New User Row in Card
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userAvatarSmall: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#fff' },
    userNameSmall: { fontSize: 10, color: 'rgba(255,255,255,0.9)', flex: 1 },

    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 10 },
    emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
    fab: { position: 'absolute', bottom: 25, right: 25, shadowColor: '#667eea', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
    fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
});
