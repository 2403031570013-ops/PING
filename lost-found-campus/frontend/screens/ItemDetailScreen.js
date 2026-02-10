import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar, Platform, Share, Linking } from 'react-native';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ReportModal from '../components/ReportModal';

import { useTheme } from '../context/ThemeContext';

export default function ItemDetailScreen({ route, navigation }) {
    const { item, itemType } = route.params;
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Quick contact handlers
    const handleCall = () => {
        const phone = item.postedBy?.phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            const msg = "Phone number not available";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Unavailable", msg);
        }
    };

    const handleEmail = () => {
        const email = item.postedBy?.email;
        if (email) {
            Linking.openURL(`mailto:${email}?subject=Regarding your ${itemType} item: ${item.title}`);
        } else {
            const msg = "Email not available";
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Unavailable", msg);
        }
    };

    const posterId = item.postedBy?._id || item.postedBy; // Handle populated or raw ID
    const isOwner = dbUser && posterId === dbUser._id; // Check if I own this post

    // After population, postedBy is an object.
    // If it's still an ID string (legacy), we handle that too.
    const poster = item.postedBy || {};
    // const posterId = poster._id || poster; // Handle both populated and unpopulated // This line is replaced by the new posterId logic above
    const posterName = poster.fullName || 'Unknown User';
    const posterPhoto = poster.photoURL || `https://ui-avatars.com/api/?name=${posterName}&background=random`;

    const handleShare = async () => {
        try {
            const message = `Check out this ${itemType} item: ${item.title} at ${item.location}. Found on Lost & Found Campus App!`;
            if (Platform.OS === 'web' && navigator.share) {
                await navigator.share({
                    title: item.title,
                    text: message,
                    url: window.location.href,
                });
            } else {
                await Share.share({
                    message: message,
                });
            }
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const handleResolve = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Has this item been returned? It will be removed from the feed.")) {
                setLoading(true);
                try {
                    const response = await apiClient.put(`/${itemType}/${item._id}/resolve`);
                    if (response.status === 200 || response.data) {
                        window.alert("Success: Item marked as resolved!");
                        navigation.goBack();
                    }
                } catch (error) {
                    window.alert("Error: Failed to resolve item.");
                } finally {
                    setLoading(false);
                }
            }
        } else {
            Alert.alert(
                "Mark as Resolved",
                "Has this item been returned? It will be removed from the feed.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Yes, Resolved",
                        onPress: async () => {
                            setLoading(true);
                            try {
                                const response = await apiClient.put(`/${itemType}/${item._id}/resolve`);
                                if (response.status === 200 || response.data) {
                                    Alert.alert("Success", "Item marked as resolved!");
                                    navigation.goBack();
                                }
                            } catch (error) {
                                Alert.alert("Error", "Failed to resolve item.");
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleAction = () => {
        // If Lost Item -> "I Found This"
        // If Found Item -> "This is Mine"

        const actionText = itemType === 'lost' ? "I Found This!" : "This is Mine!";
        const defaultMessage = itemType === 'lost'
            ? `Hey ${posterName}, I think I found your ${item.title}!`
            : `Hey ${posterName}, I think that ${item.title} belongs to me!`;

        if (Platform.OS === 'web') {
            if (window.confirm(`${actionText}\nStart a chat with ${posterName}?`)) {
                navigation.navigate('Chat', {
                    itemId: item._id,
                    otherUserId: posterId,
                    itemType: itemType,
                    initialMessage: defaultMessage
                });
            }
        } else {
            Alert.alert(
                actionText,
                `Start a chat with ${posterName}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Start Chat",
                        onPress: () => navigation.navigate('Chat', {
                            itemId: item._id,
                            otherUserId: posterId,
                            itemType: itemType,
                            initialMessage: defaultMessage
                        })
                    }
                ]
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Header */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image || 'https://via.placeholder.com/400' }} style={styles.image} />

                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.card }]} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.shareBtn, { backgroundColor: theme.card }]} onPress={handleShare}>
                        <Ionicons name="share-social" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <View style={[styles.badge, itemType === 'found' ? styles.foundBadge : styles.lostBadge]}>
                        <Text style={styles.badgeText}>
                            {itemType === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.content, { backgroundColor: theme.card }]}>
                    <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="location" size={16} color="#667eea" />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.location}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="time" size={16} color="#667eea" />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
                    <Text style={[styles.desc, { color: theme.textSecondary }]}>{item.description}</Text>

                    {/* Poster Profile Card */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Posted By</Text>
                    <View style={[styles.profileCard, { backgroundColor: theme.background }]}>
                        <Image source={{ uri: posterPhoto }} style={styles.avatar} />
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: theme.text }]}>{posterName}</Text>
                            <Text style={[styles.profileRole, { color: theme.textSecondary }]}>{poster.role || 'Student'}</Text>
                        </View>

                        {/* Quick Contact Buttons - HIDDEN until Request Approved */
                        /* 
                        {!isOwner && (
                            <View style={styles.quickContactRow}>
                                <TouchableOpacity style={styles.quickBtn} onPress={handleCall}>
                                    <Ionicons name="call" size={18} color="#34c759" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickBtn} onPress={handleEmail}>
                                    <Ionicons name="mail" size={18} color="#667eea" />
                                </TouchableOpacity>
                            </View>
                        )}
                        */}\n
                    </View>

                    {/* Report Button */}
                    {!isOwner && (
                        <TouchableOpacity
                            style={styles.reportBtn}
                            onPress={() => setShowReportModal(true)}
                        >
                            <Ionicons name="flag-outline" size={16} color="#ff3b30" />
                            <Text style={styles.reportText}>Report this item</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Report Modal */}
            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                itemId={item._id}
                itemType={itemType}
            />

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                {isOwner ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.resolveBtn]}
                        onPress={handleResolve}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={styles.actionBtnText}>Mark as Resolved</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.actionRow}>
                        {/* Chat Button - HIDDEN, only 'Request' is allowed first */}
                        {/* 
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.chatBtn]}
                            onPress={() => navigation.navigate('Chat', {
                                itemId: item._id,
                                otherUserId: posterId,
                                itemType: itemType,
                                initialMessage: itemType === 'lost' ? "I found your item!" : "I think this is mine!"
                            })}
                        >
                            <Ionicons name="chatbubble" size={24} color="#fff" />
                        </TouchableOpacity>
                        */}

                        {/* Official Claim/Report Button */}
                        <TouchableOpacity
                            style={[styles.actionBtn, itemType === 'lost' ? styles.foundBtn : styles.claimBtn, styles.flexBtn]}
                            onPress={async () => {
                                const confirmText = itemType === 'lost'
                                    ? "Notify owner that you found this?"
                                    : "Request handover of this item?";

                                if (Platform.OS === 'web' ? window.confirm(confirmText) : true) {
                                    if (Platform.OS !== 'web') {
                                        // Mobile confirm handled here or simpler just do it
                                        // For speed, let's just do it or show alert
                                    }
                                    setLoading(true);
                                    try {
                                        await apiClient.post('/claims', {
                                            itemId: item._id,
                                            itemType,
                                            ownerId: posterId,
                                            message: itemType === 'lost' ? "I found your item!" : "This is mine."
                                        });
                                        const successMsg = itemType === 'lost' ? "Owner notified!" : "Request sent!";
                                        if (Platform.OS === 'web') window.alert(successMsg);
                                        else Alert.alert("Success", successMsg);
                                    } catch (err) {
                                        const errMsg = err.response?.data?.message || "Failed to send request.";
                                        if (Platform.OS === 'web') window.alert(errMsg);
                                        else Alert.alert("Error", errMsg);
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                        >
                            <Ionicons name={itemType === 'lost' ? "hand-right" : "gift"} size={24} color="#fff" />
                            <Text style={styles.actionBtnText}>
                                {itemType === 'lost' ? "I Found This" : "Claim Item"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 100 },
    imageContainer: { position: 'relative', height: 350 },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    shareBtn: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    badge: { position: 'absolute', bottom: 20, left: 20, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    lostBadge: { backgroundColor: '#ff3b30' },
    foundBadge: { backgroundColor: '#34c759' },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },

    content: { padding: 25, marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 15 },

    metaRow: { flexDirection: 'row', gap: 20, marginBottom: 25 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: '#666', fontSize: 14, fontWeight: '500' },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 10, marginTop: 10 },
    desc: { fontSize: 16, color: '#555', lineHeight: 26, marginBottom: 25 },

    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    profileRole: { fontSize: 13, color: '#888' },

    // Quick Contact
    quickContactRow: { flexDirection: 'row', gap: 8 },
    quickBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },

    // Report
    reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15, paddingVertical: 10 },
    reportText: { color: '#ff3b30', fontSize: 14 },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10 },
    chatBtn: { backgroundColor: '#333', width: 60, justifyContent: 'center', alignItems: 'center' },
    flexBtn: { flex: 1 },
    resolveBtn: { backgroundColor: '#2ecc71', width: '100%' },
    foundBtn: { backgroundColor: '#667eea' }, // Blue/Purple for "I Found This"
    claimBtn: { backgroundColor: '#ff9500' }, // Orange for "Claim"
    actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
