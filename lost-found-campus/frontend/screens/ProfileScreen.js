import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    ScrollView,
    StatusBar,
    Platform,
    Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation }) {
    const { dbUser, logout, refreshUser } = useUser();
    const { isDarkMode, toggleTheme, theme } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            refreshUser();
        }, [])
    );

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to sign out?")) {
                try {
                    await logout();
                } catch (error) {
                    console.error("Logout Error:", error);
                }
            }
        } else {
            Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Sign Out",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await logout();
                            } catch (error) {
                                console.error("Logout Error:", error);
                            }
                        }
                    }
                ]
            );
        }
    };

    if (!dbUser) return null;

    const menuItems = [
        {
            icon: 'documents',
            title: 'My Posts',
            subtitle: 'Manage your active posts',
            color: '#ff2d55',
            onPress: () => navigation.navigate('MyItems')
        },
        {
            icon: 'hand-left',
            title: 'My Handover Requests',
            subtitle: 'Track your claim requests',
            color: '#ff9500',
            onPress: () => navigation.navigate('Claims')
        },
        {
            icon: 'time',
            title: 'Resolution History',
            subtitle: 'View your resolved items',
            color: '#8e44ad',
            onPress: () => navigation.navigate('History')
        },
        {
            icon: 'trophy',
            title: 'Campus Heroes',
            subtitle: 'View top contributors',
            color: '#f1c40f',
            onPress: () => navigation.navigate('Leaderboard')
        },
        {
            icon: 'notifications',
            title: 'Notifications',
            subtitle: 'View all alerts',
            color: '#ff3b30',
            onPress: () => navigation.navigate('Notifications')
        },
        {
            icon: 'moon',
            title: 'Dark Mode',
            subtitle: isDarkMode ? 'Enabled' : 'Disabled',
            color: isDarkMode ? '#667eea' : '#333',
            onPress: toggleTheme,
            isToggle: true
        },
        {
            icon: 'settings',
            title: 'Settings',
            subtitle: 'App preferences',
            color: '#667eea',
            onPress: () => {
                const msg = "Settings coming soon!";
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Coming Soon', msg);
            }
        },
        {
            icon: 'help-circle',
            title: 'Help & Support',
            subtitle: 'Get help with the app',
            color: '#34c759',
            onPress: () => {
                const msg = "Help section coming soon!";
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Coming Soon', msg);
            }
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.header}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: dbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.fullName)}&background=fff&color=667eea&size=200&bold=true` }}
                        style={styles.avatar}
                    />
                    {dbUser.role === 'admin' && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        </View>
                    )}
                </View>

                <Text style={styles.name}>{dbUser.fullName}</Text>
                <Text style={styles.email}>{dbUser.email}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{dbUser.role === 'admin' ? '👑' : '👤'}</Text>
                        <Text style={styles.statLabel}>{dbUser.role || 'Student'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>🏫</Text>
                        <Text style={styles.statLabel}>{dbUser.campusId?.name || 'No Campus'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>🌟</Text>
                        <Text style={styles.statLabel}>{dbUser.karmaPoints || 0} Karma</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Account Details</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="person" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Full Name</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser.fullName}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="mail" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoValue}>{dbUser.email}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="call" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Phone Number</Text>
                            <Text style={styles.infoValue}>{dbUser.phone || 'Not added'}</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuCard, { backgroundColor: theme.card }]}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
                            onPress={item.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                                <Ionicons name={item.icon} size={22} color={item.color} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                                <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                            </View>
                            {item.isToggle ? (
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={toggleTheme}
                                    trackColor={{ false: '#e0e0e0', true: '#667eea' }}
                                    thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Lost & Found Campus v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5'
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#34c759',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#764ba2',
    },
    name: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 5,
    },
    email: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingVertical: 15,
        paddingHorizontal: 30,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        fontSize: 24,
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'capitalize',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    content: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f0f2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 3,
    },
    infoValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    menuCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuIcon: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 3,
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#888',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 16,
        marginBottom: 15,
        gap: 10,
        borderWidth: 1,
        borderColor: '#ff3b30',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ff3b30',
    },
    version: {
        textAlign: 'center',
        color: '#bbb',
        fontSize: 12,
        marginBottom: 30,
    },
});
