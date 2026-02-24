import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar, Platform, Share, Linking, Modal } from 'react-native';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ReportModal from '../components/ReportModal';
import ReportUserModal from '../components/ReportUserModal';

import { useTheme } from '../context/ThemeContext';

export default function ItemDetailScreen({ route, navigation }) {
    const { item, itemType } = route.params;
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showReportUserModal, setShowReportUserModal] = useState(false);

    // Quick contact handlers
    // Privacy Mode: Direct contact handlers removed.
    // Users must communicate via in-app Chat/Call.

    const posterId = item.postedBy?._id || item.postedBy; // Handle populated or raw ID
    const isOwner = dbUser && (posterId === dbUser._id || posterId === dbUser._id?.toString()); // Check if I own this post
    const [myClaim, setMyClaim] = useState(null);

    useEffect(() => {
        const checkClaim = async () => {
            if (!isOwner && dbUser) {
                try {
                    const res = await apiClient.get('/claims/sent');
                    const existing = res.data.find(c => (c.itemId?._id === item._id || c.itemId === item._id) && c.status === 'pending');
                    if (existing) setMyClaim(existing);
                } catch (e) { console.log(e); }
            }
        };
        checkClaim();
    }, [item._id, isOwner, dbUser]);

    // After population, postedBy is an object.
    // If it's still an ID string (legacy), we handle that too.
    const poster = item.postedBy || {};
    const posterName = poster.fullName || 'Unknown User';
    const posterPhoto = poster.photoURL ? (poster.photoURL.startsWith('http') || poster.photoURL.startsWith('data:') ? poster.photoURL : `http://127.0.0.1:5000${poster.photoURL}`) : `https://ui-avatars.com/api/?name=${posterName}&background=random`;

    const [selectedImage, setSelectedImage] = useState(null);

    const getImageUrl = (url) => {
        if (!url) return 'https://via.placeholder.com/400';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://127.0.0.1:5000${url}`;
    };

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

    const handleDelete = async () => {
        const doDelete = async () => {
            setDeleteLoading(true);
            try {
                await apiClient.delete(`/${itemType}/${item._id}`);
                const msg = 'Post deleted successfully!';
                if (Platform.OS === 'web') window.alert(msg);
                else Alert.alert('Deleted', msg);
                navigation.goBack();
            } catch (error) {
                const errMsg = error.response?.data?.message || 'Failed to delete post.';
                if (Platform.OS === 'web') window.alert(errMsg);
                else Alert.alert('Error', errMsg);
            } finally {
                setDeleteLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                await doDelete();
            }
        } else {
            Alert.alert(
                'Delete Post',
                'Are you sure you want to delete this post? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: doDelete }
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
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedImage(getImageUrl(item.image))}>
                        <Image source={{ uri: getImageUrl(item.image) }} style={styles.image} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.card }]} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.shareBtn, { backgroundColor: theme.card }]} onPress={handleShare}>
                        <Ionicons name="share-social" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <View style={[styles.badge, itemType === 'found' ? styles.foundBadge : styles.lostBadge]}>
                        <Text style={styles.badgeText}>
                            {itemType === 'lost' ? 'MISSING' : 'FOUND'}
                        </Text>
                    </View>

                    <View style={{ position: 'absolute', bottom: 20, right: 20, alignItems: 'flex-end', gap: 8 }}>
                        {item.bounty > 0 && (
                            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFD700', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="cash" size={14} color="#000" />
                                <Text style={{ color: '#000', fontWeight: '800', fontSize: 11 }}>Reward: ₹{item.bounty}</Text>
                            </View>
                        )}
                        {item.isInsured && (
                            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>INSURED</Text>
                            </View>
                        )}
                        {item.priority === 'high' && (
                            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="alert-circle" size={14} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>URGENT</Text>
                            </View>
                        )}
                        {item.isHighValue && (
                            <View style={styles.highValueBadge}>
                                <Ionicons name="star" size={14} color="#fff" />
                                <Text style={styles.badgeText}>HIGH VALUE</Text>
                            </View>
                        )}
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
                        <View style={styles.metaItem}>
                            <Ionicons name="pricetag" size={16} color="#667eea" />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.category || 'Other'}</Text>
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

                    {/* Visual Tracking Timeline */}
                    <View style={styles.trackingContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Item Journey</Text>
                        <View style={styles.timeline}>
                            {[
                                { status: 'Reported', date: item.createdAt, icon: 'document-text', color: theme.info, completed: true },
                                ...(item.lifecycle || []).map(log => ({
                                    status: log.status,
                                    date: log.timestamp,
                                    icon: log.status === 'locked' ? 'lock-closed' : 'git-commit',
                                    color: log.status === 'resolved' ? theme.success : theme.primary,
                                    completed: true,
                                    note: log.note
                                })),
                                ...(item.status !== 'resolved' ? [{ status: 'Reunited', icon: 'heart', color: '#CBD5E1', completed: false }] : [])
                            ].map((step, index, arr) => (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[
                                            styles.timelineDot,
                                            { backgroundColor: step.completed ? step.color : '#E2E8F0' }
                                        ]}>
                                            <Ionicons name={step.icon} size={14} color={step.completed ? '#fff' : '#94A3B8'} />
                                        </View>
                                        {index < arr.length - 1 && (
                                            <View style={[
                                                styles.timelineLine,
                                                { backgroundColor: step.completed && arr[index + 1].completed ? step.color : '#E2E8F0' }
                                            ]} />
                                        )}
                                    </View>
                                    <View style={styles.timelineRight}>
                                        <Text style={[
                                            styles.timelineStatus,
                                            { color: step.completed ? theme.text : theme.textSecondary }
                                        ]}>
                                            {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                                        </Text>
                                        {step.completed && (
                                            <Text style={styles.timelineDate}>
                                                {new Date(step.date).toLocaleDateString()} at {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        )}
                                        {step.note && <Text style={styles.timelineNote}>"{step.note}"</Text>}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Action Card for Owner */}
                    {isOwner && item.status !== 'resolved' && (
                        <View style={[styles.ownerCard, { backgroundColor: theme.primary + '10' }]}>
                            <Ionicons name="information-circle" size={20} color={theme.primary} />
                            <Text style={[styles.ownerCardText, { color: theme.primary }]}>
                                You will be notified once someone claims this item. Keep your phone handy!
                            </Text>
                        </View>
                    )}

                    {/* Delete Post Button (Owner Only) */}
                    {isOwner && (
                        <TouchableOpacity
                            style={styles.deletePostBtn}
                            onPress={handleDelete}
                            disabled={deleteLoading}
                        >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            <Text style={styles.deletePostText}>
                                {deleteLoading ? 'Deleting...' : 'Delete this post'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Report Buttons */}
                    {!isOwner && (
                        <View style={{ gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                                style={styles.reportBtn}
                                onPress={() => setShowReportModal(true)}
                            >
                                <Ionicons name="flag-outline" size={16} color={theme.danger || '#EF4444'} />
                                <Text style={[styles.reportText, { color: theme.danger || '#EF4444' }]}>Report this post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reportBtn, { borderColor: '#F97316' }]}
                                onPress={() => setShowReportUserModal(true)}
                            >
                                <Ionicons name="person-remove-outline" size={16} color="#F97316" />
                                <Text style={[styles.reportText, { color: '#F97316' }]}>Report this user's account</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Report Item Modal */}
            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                itemId={item._id}
                itemType={itemType}
            />

            {/* Report User Modal */}
            <ReportUserModal
                visible={showReportUserModal}
                onClose={() => setShowReportUserModal(false)}
                reportedUserId={posterId}
                reportedUserName={posterName}
            />

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                {isOwner ? (
                    <View style={styles.ownerActionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.resolveBtn, { flex: 1 }]}
                            onPress={handleResolve}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                    <Text style={styles.actionBtnText}>Found it!</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={handleDelete}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="trash" size={22} color="#fff" />
                                    <Text style={styles.actionBtnText}>Delete</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
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
                                {itemType === 'lost' ? "I Found This" : "Ask for item"}
                            </Text>
                        </TouchableOpacity>

                        {/* Withdraw Claim Button (If already claimed) */}
                        {myClaim && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#EF4444', flex: 1 }]}
                                onPress={async () => {
                                    const confirmMsg = "Withdraw your request for this item?";
                                    const doWithdraw = async () => {
                                        try {
                                            await apiClient.patch(`/claims/${myClaim._id}/status`, { status: 'cancelled' });
                                            setMyClaim(null);
                                            Alert.alert("Success", "Request withdrawn.");
                                        } catch (e) { Alert.alert("Error", "Failed to withdraw request."); }
                                    };

                                    if (Platform.OS === 'web' ? window.confirm(confirmMsg) : true) {
                                        if (Platform.OS !== 'web') {
                                            Alert.alert("Withdraw Request", confirmMsg, [
                                                { text: "No", style: "cancel" },
                                                { text: "Yes", style: "destructive", onPress: doWithdraw }
                                            ]);
                                        } else {
                                            doWithdraw();
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="close-circle" size={24} color="#fff" />
                                <Text style={styles.actionBtnText}>Withdraw Request</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Photo Preview Modal */}
            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close" size={32} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
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
    highValueBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#007aff', flexDirection: 'row', alignItems: 'center', gap: 5 },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1 },

    trackingContainer: { marginTop: 20, padding: 20, backgroundColor: '#F8FAFC', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    timeline: { marginLeft: 5 },
    timelineItem: { flexDirection: 'row', gap: 15, minHeight: 60 },
    timelineLeft: { alignItems: 'center', width: 24 },
    timelineDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    timelineLine: { width: 2, flex: 1, marginVertical: -5 },
    timelineRight: { flex: 1, paddingBottom: 20 },
    timelineStatus: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
    timelineDate: { fontSize: 12, color: '#64748B' },
    timelineNote: { fontSize: 13, color: '#475569', marginTop: 6, fontStyle: 'italic', backgroundColor: '#fff', padding: 8, borderRadius: 8, alignSelf: 'flex-start' },

    ownerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, padding: 18, borderRadius: 20 },
    ownerCardText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

    content: { padding: 25, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 15 },
    title: { fontSize: 30, fontWeight: '800', color: '#0F172A', marginBottom: 15 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    metaText: { color: '#475569', fontSize: 13, fontWeight: '600' },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginTop: 10 },
    desc: { fontSize: 15, color: '#64748B', lineHeight: 26, marginBottom: 30 },

    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    avatar: { width: 55, height: 55, borderRadius: 20, marginRight: 15 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    profileRole: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },

    // Report
    reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 25, paddingVertical: 12 },
    reportText: { fontSize: 14, fontWeight: '600' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    actionRow: { flexDirection: 'row', gap: 12 },
    ownerActionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    flexBtn: { flex: 1 },
    resolveBtn: { backgroundColor: '#0F172A' },
    deleteBtn: { backgroundColor: '#EF4444' },
    foundBtn: { backgroundColor: '#4F46E5' },
    claimBtn: { backgroundColor: '#EA580C' },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Delete post link (inline)
    deletePostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
    deletePostText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
