import React, { useState } from 'react';
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
    Switch,
    TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../config/axios';

export default function ProfileScreen({ navigation }) {
    const { dbUser, logout, refreshUser, unreadNotifs, refreshBadges } = useUser();
    const { isDarkMode, toggleTheme, theme } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            refreshUser();
            refreshBadges();
        }, [])
    );

    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            handleImageUpload(result.assets[0]);
        }
    };

    const handleImageUpload = async (imageAsset) => {
        setUploading(true);
        try {
            let photoURL;
            // Handle Web (already data URI) vs Mobile (raw base64)
            if (imageAsset.uri && imageAsset.uri.startsWith('data:')) {
                photoURL = imageAsset.uri;
            } else if (imageAsset.base64) {
                photoURL = `data:image/jpeg;base64,${imageAsset.base64}`;
            } else {
                // Fallback for valid URIs (e.g. if we add real upload later)
                photoURL = imageAsset.uri;
            }

            // Ensure we are sending a string
            if (typeof photoURL !== 'string' || photoURL.length < 50) {
                console.error("Invalid PhotoURL generated:", photoURL);
                throw new Error("Failed to process image data");
            }

            console.log("Sending photoURL with length:", photoURL.length);

            const response = await apiClient.put('/auth/profile', { photoURL });
            console.log("Server Debug Info:", response.data.debug); // CRITICAL: Check this!

            const updatedUser = response.data.user || response.data;

            if (updatedUser.photoURL && updatedUser.photoURL.length > 0) {
                console.log("Server confirms update with length:", updatedUser.photoURL.length);
            } else {
                console.error("Server returned user WITHOUT photoURL! Debug Info:", response.data.debug);
            }

            await refreshUser();

            const msg = "Profile picture updated!";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Success", msg);

        } catch (error) {
            console.error("Profile update failed:", error);
            const status = error.response ? error.response.status : 'Unknown';
            const message = error.response?.data?.message || error.message || "Failed to update profile picture.";

            const fullMsg = `Error ${status}: ${message}`;

            if (Platform.OS === 'web') window.alert(fullMsg);
            else Alert.alert("Error", fullMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfilePicture = () => {
        if (Platform.OS === 'web') {
            // Web input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const base64 = event.target.result;
                        handleImageUpload({ base64: base64.split(',')[1], uri: base64 });
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        } else {
            pickImage();
        }
    };

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

    const handleDeleteAccount = () => {
        if (Platform.OS === 'web') {
            const input = window.prompt('⚠️ DANGER ZONE\n\nThis action is permanent. All your data will be anonymized.\n\nType DELETE to confirm:');
            if (input === 'DELETE') {
                apiClient.delete('/user-reports/delete-account', { data: { confirmation: 'DELETE' } })
                    .then(() => {
                        window.alert('Account deleted. You will be logged out.');
                        logout();
                    })
                    .catch(err => window.alert(err.response?.data?.message || 'Failed to delete account'));
            } else if (input !== null) {
                window.alert('Confirmation text did not match. Account NOT deleted.');
            }
        } else {
            Alert.alert(
                '⚠️ Delete Account?',
                'This action is permanent. All your data will be anonymized and cannot be recovered.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete Forever',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await apiClient.delete('/user-reports/delete-account', { data: { confirmation: 'DELETE' } });
                                Alert.alert('Done', 'Account deleted. You will be logged out.');
                                await logout();
                            } catch (err) {
                                Alert.alert('Error', err.response?.data?.message || 'Failed to delete account');
                            }
                        }
                    }
                ]
            );
        }
    };

    if (!dbUser) return null;

    const menuItems = [
        ...(dbUser.role === 'admin' || dbUser.role === 'staff' ? [
            {
                icon: 'shield-checkmark',
                title: 'Security Desk Mode',
                subtitle: 'Rapid log & auto-ID scanner',
                color: '#10B981',
                onPress: () => navigation.navigate('SecurityDeskStack')
            }
        ] : []),
        ...(dbUser.role === 'admin' ? [
            {
                icon: 'bar-chart',
                title: 'University Console',
                subtitle: 'Management dashboard & analytics',
                color: '#3B82F6',
                onPress: () => navigation.navigate('AdvancedAdminStack')
            }
        ] : []),
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
            icon: 'map',
            title: 'Interactive Heatmap',
            subtitle: 'View high-loss campus zones',
            color: '#6366f1',
            onPress: () => navigation.navigate('Map')
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
                const info = `⚙️ App Settings\n\n📱 Version: 2.0.0\n🎨 Theme: ${isDarkMode ? 'Dark' : 'Light'} Mode\n👤 Role: ${dbUser.role}\n🏫 Campus: ${dbUser.campusId?.name || 'Not Set'}\n📧 Email: ${dbUser.email}\n\n✅ Push Notifications: On\n🔐 2FA: Enabled via OTP`;
                Platform.OS === 'web' ? window.alert(info) : Alert.alert('App Settings', info);
            }
        },
        {
            icon: 'help-circle',
            title: 'Help & Support',
            subtitle: 'FAQ & contact support',
            color: '#34c759',
            onPress: () => {
                const help = `❓ Frequently Asked Questions\n\n1. How to report a lost item?\n→ Tap "Report Item" on home screen\n\n2. How to claim an item?\n→ Open item → Tap "This is Mine"\n\n3. How do karma points work?\n→ Earn points by helping others find their items\n\n4. How to contact support?\n→ Email: support@parullostfound.com\n\n5. Why was my account suspended?\n→ Multiple community reports. Contact admin for appeal.`;
                Platform.OS === 'web' ? window.alert(help) : Alert.alert('Help & Support', help);
            }
        },
        {
            icon: 'chatbubble-ellipses',
            title: 'Send Feedback',
            subtitle: 'Rate & improve the app',
            color: '#06B6D4',
            onPress: () => {
                const msg = `💬 We'd love your feedback!\n\nHow would you rate your experience?\n⭐⭐⭐⭐⭐\n\nSend us an email at:\nfeedback@parullostfound.com\n\nOr mention @lost_found_campus on social media!`;
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Send Feedback', msg);
            }
        },
        {
            icon: 'flag-outline',
            title: 'My Reports',
            subtitle: 'Track status of your reports',
            color: '#F59E0B',
            onPress: () => navigation.navigate('MyReports')
        },
        {
            icon: 'shield-outline',
            title: 'Blocked Users',
            subtitle: 'Manage members you blocked',
            color: '#6366f1',
            onPress: () => navigation.navigate('BlockedUsers')
        },
        {
            icon: 'trash',
            title: 'Delete Account',
            subtitle: 'Permanently delete your account',
            color: '#EF4444',
            onPress: handleDeleteAccount,
            isDanger: true
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={theme.primaryGradient}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    style={styles.editProfileBtn}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <Ionicons name="create-outline" size={22} color="#fff" />
                    <Text style={styles.editProfileText}>Edit</Text>
                </TouchableOpacity>

                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
                        <Image
                            key={dbUser.photoURL} // Force re-render
                            source={{
                                uri: dbUser.photoURL ?
                                    (dbUser.photoURL.startsWith('http') || dbUser.photoURL.startsWith('data:') ?
                                        dbUser.photoURL : `http://127.0.0.1:5000${dbUser.photoURL}`) :
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.fullName)}&background=${isDarkMode ? '2D5BFF' : 'fff'}&color=${isDarkMode ? 'fff' : '2D5BFF'}&size=200&bold=true`
                            }}
                            style={styles.avatar}
                        />
                        <View style={styles.editIconContainer}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>


                    {dbUser.role === 'admin' && (
                        <View style={[styles.verifiedBadge, { backgroundColor: theme.success }]}>
                            <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        </View>
                    )}
                </View>

                <Text style={styles.name}>{dbUser.fullName}</Text>
                <Text style={styles.email}>{dbUser.email}</Text>

                <View style={[styles.statsRow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
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
            </LinearGradient >

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Account Details</Text>

                    <View style={styles.infoRow}>
                        <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name="person" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Full Name</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser.fullName}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name="mail" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser.email}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name="call" size={20} color={theme.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Phone Number</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser.phone || 'Not added'}</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuCard, { backgroundColor: theme.card }]}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.title} // Use title as key
                            style={[
                                styles.menuItem,
                                index < menuItems.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                            ]}
                            onPress={item.onPress || (item.isToggle ? null : () => { })}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon} size={22} color={item.color} />
                            </View>
                            <View style={styles.menuContent}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                                    {item.title === 'Notifications' && unreadNotifs > 0 && (
                                        <View style={[styles.badge, { backgroundColor: '#ff3b30' }]}>
                                            <Text style={styles.badgeText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                            </View>
                            {item.isToggle ? (
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={toggleTheme}
                                    trackColor={{ false: theme.border, true: theme.primary }}
                                    thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
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
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 40, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
    editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    verifiedBadge: { position: 'absolute', top: 5, right: 5, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', backgroundColor: '#10B981' },
    name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20, fontWeight: '500' },
    editProfileBtn: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4 },
    editProfileText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20, marginTop: 15 },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 18, marginBottom: 2 },
    statLabel: { fontSize: 9, color: '#fff', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase' },
    statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 },

    content: { flex: 1, marginTop: -20, paddingHorizontal: 20 },
    infoCard: { borderRadius: 24, padding: 20, marginBottom: 15 },
    cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 15 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '600' },

    menuCard: { borderRadius: 24, marginBottom: 15, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuContent: { flex: 1 },
    menuTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    menuSubtitle: { fontSize: 11, fontWeight: '500' },

    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#991B1B', borderRadius: 16, padding: 15, marginBottom: 20, gap: 8 },
    logoutText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    version: { textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 40 },
    badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' }
});
