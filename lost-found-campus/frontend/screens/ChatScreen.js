import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Alert,
    Keyboard,
    Modal,
    DeviceEventEmitter
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { getSocket } from '../utils/socket';

export default function ChatScreen({ route, navigation }) {
    const { itemId, otherUserId, itemType, chatId, initialMessage } = route.params || {};
    const { dbUser, refreshBadges } = useUser();
    const { theme, isDarkMode } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatData, setChatData] = useState(null);
    const [showContact, setShowContact] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const flatListRef = useRef();
    const hasAutoSent = useRef(false);

    const initiateCall = (targetUser, isVideo = false) => {
        // Use socket from context (exposed via useUser, but we need to destructure it first)
        const contextSocket = getSocket(); // Fallback to direct import if context one is tricky here without destructuring above

        if (!contextSocket) {
            Alert.alert("Error", "Real-time connection not established.");
            return;
        }

        console.log("Initiating call via socket:", contextSocket.id);

        // Emit call event
        contextSocket.emit('call-user', {
            to: targetUser._id,
            from: dbUser._id,
            name: dbUser.fullName,
            isVideo
        });

        // Show Premium Call Screen
        const callDetails = { detail: { to: targetUser._id, name: targetUser.fullName, isVideo } };

        if (Platform.OS === 'web') {
            window.dispatchEvent(new CustomEvent('start-outgoing-call', callDetails));
        } else {
            DeviceEventEmitter.emit('start-outgoing-call', callDetails);
        }
    };

    useEffect(() => {
        const initChat = async () => {
            try {
                let response;
                // If we have a chatId, fetch it. Otherwise create/find by item/user
                if (chatId) {
                    response = await apiClient.get(`/chat/${chatId}`);
                } else if (otherUserId) {
                    console.log("Initializing chat with user:", otherUserId);
                    response = await apiClient.post('/chat', { itemId, otherUserId, itemType });
                } else {
                    return;
                }

                const data = response.data;
                setChatData(data);

                if (data?._id) {
                    apiClient.patch(`/chat/${data._id}/read`)
                        .then(() => refreshBadges())
                        .catch(e => console.error("Error marking read:", e));
                }

                // Auto-send initial message if exists and not sent yet
                if (initialMessage && !hasAutoSent.current) {
                    hasAutoSent.current = true;
                    // Send message
                    await apiClient.post(`/chat/${data._id}/message`, { text: initialMessage });
                    // Fetch updated chat
                    const updatedRes = await apiClient.get(`/chat/${data._id}`);
                    setMessages(updatedRes.data.messages || []);
                    setChatData(updatedRes.data);
                } else {
                    setMessages(data.messages || []);
                }

                // Set Header Title to Other User's Name
                // Robust check for other user
                const members = data.members || [];
                const otherUser = members.find(m => {
                    const id = m._id || m;
                    return id.toString() !== dbUser._id.toString();
                });

                if (otherUser) {
                    navigation.setOptions({
                        title: otherUser.fullName || 'Chat',
                        headerStyle: { backgroundColor: theme.card },
                        headerTintColor: theme.text,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerRight: () => (
                            <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
                                <TouchableOpacity onPress={() => initiateCall(otherUser)}>
                                    <Ionicons name="call-outline" size={22} color={theme.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => initiateCall(otherUser, true)}>
                                    <Ionicons name="videocam-outline" size={24} color={theme.primary} />
                                </TouchableOpacity>
                            </View>
                        )
                    });
                }

            } catch (error) {
                console.error("Error initializing chat:", error);
                Alert.alert("Error", "Could not start chat. Please go back and try again.");
            } finally {
                setLoading(false);
            }
        };
        initChat();

        // Poll for new messages every 5 seconds (Fallback)
        const interval = setInterval(initChat, 5000);

        // Real-time Socket Listener
        const socket = getSocket();
        if (socket) {
            socket.on('new-message', ({ chatId: incomingChatId, message }) => {
                if (incomingChatId === (chatId || chatData?._id)) {
                    setMessages(prev => {
                        // Avoid duplicates if polling already got it
                        if (prev.find(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                    // Mark as read
                    apiClient.patch(`/chat/${incomingChatId}/read`).then(() => refreshBadges());
                }
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) socket.off('new-message');
        };
    }, [chatId, itemId, otherUserId, chatData?._id]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            handleSend(null, result.assets[0].uri);
        }
    };

    const handleSend = async (manualText = null, imageUri = null) => {
        const messageText = manualText !== null ? manualText : text;
        if (!messageText?.trim() && !imageUri) return;

        if (!chatData) {
            Alert.alert("Error", "Chat not initialized.");
            return;
        }

        if (!imageUri) setText(''); // Clear text if no image

        // Optimistic update
        const tempMsg = {
            _id: Date.now().toString(),
            senderId: dbUser._id,
            text: messageText,
            imageURL: imageUri, // Local URI for preview
            createdAt: new Date().toISOString(),
            pending: true
        };
        setMessages(prev => [...prev, tempMsg]);

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('text', messageText || "");

            if (imageUri) {
                console.log("📸 [DEBUG] Preparing image for upload:", imageUri);
                const filename = imageUri.split('/').pop() || 'upload.jpg';
                if (Platform.OS === 'web') {
                    try {
                        const res = await fetch(imageUri);
                        const blob = await res.blob();
                        formData.append('image', blob, filename);
                        console.log("🌐 [WEB] Created blob for upload");
                    } catch (fetchErr) {
                        console.error("❌ [WEB] Fetch error for imageUri:", fetchErr);
                        throw new Error("Could not process image for upload");
                    }
                } else {
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;
                    formData.append('image', { uri: imageUri, name: filename, type });
                }
            }

            console.log("📤 [DEBUG] Sending FormData to server...");
            const response = await apiClient.post(`/chat/${chatData._id}/message`, formData);
            console.log("✅ [DEBUG] Server response received");
            setMessages(response.data.messages);
        } catch (error) {
            console.error("🔥 [CHAT ERROR] Send fail:", error);
            const errorMsg = error.response?.data?.error || error.message || "Failed to send";
            Alert.alert("Error", errorMsg);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === dbUser?._id;

        // Safe access to other user
        const members = chatData?.members || [];
        const otherUser = members.find(m => {
            const id = m._id || m;
            return id.toString() !== dbUser._id.toString();
        });
        const avatarUrl = otherUser?.fullName
            ? `https://ui-avatars.com/api/?name=${otherUser.fullName}&background=random&color=fff`
            : 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff';

        return (
            <View style={[styles.msgContainer, isMe ? styles.myMsgContainer : styles.theirMsgContainer]}>
                {!isMe && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}<LinearGradient
                    colors={isMe ? ['#667eea', '#764ba2'] : [theme.card, theme.card]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, item.imageURL && { padding: 4 }]}
                >{item.imageURL && (<TouchableOpacity onPress={() => setSelectedImage((item.imageURL.includes('blob:') || item.imageURL.includes('file:') || item.imageURL.includes('data:') || item.imageURL.startsWith('http'))
                    ? item.imageURL
                    : `http://127.0.0.1:5000${item.imageURL}`)}><Image
                        source={{
                            uri: (item.imageURL.includes('blob:') || item.imageURL.includes('file:') || item.imageURL.includes('data:') || item.imageURL.startsWith('http'))
                                ? item.imageURL
                                : `http://127.0.0.1:5000${item.imageURL}`
                        }}
                        style={styles.msgImage}
                        resizeMode="cover"
                    /></TouchableOpacity>)}
                    {item.text ? (<Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: theme.text }]}>
                        {item.text}
                    </Text>) : null}<Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText, item.imageURL && { paddingRight: 8, paddingBottom: 4 }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text></LinearGradient></View>
        );
    };

    if (loading && !chatData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#667eea" />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={[theme.background, theme.background]}
                style={styles.container}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={() => {
                        const members = chatData?.members || [];
                        const otherUser = members.find(m => {
                            const id = m._id || m;
                            return id.toString() !== dbUser._id.toString();
                        });

                        if (!otherUser) return null;

                        return (
                            <View style={[styles.contactHeader, { backgroundColor: theme.card }]}>
                                <TouchableOpacity
                                    style={styles.contactToggle}
                                    onPress={() => setShowContact(!showContact)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <Ionicons name="information-circle" size={20} color="#667eea" />
                                        <Text style={styles.contactToggleText}>{showContact ? "Hide Contact Details" : "Show Contact Details"}</Text>
                                    </View>
                                    <Ionicons name={showContact ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
                                </TouchableOpacity>

                                {showContact && (
                                    <View style={[styles.contactDetails, { borderTopColor: theme.border }]}>
                                        <View style={styles.contactRow}>
                                            <Ionicons name="call" size={18} color={theme.textSecondary} />
                                            <Text style={[styles.contactText, { color: theme.textSecondary, fontStyle: 'italic' }]}>
                                                Phone number hidden for privacy. Use in-app call.
                                            </Text>
                                        </View>
                                        <View style={styles.contactRow}>
                                            <Ionicons name="mail" size={18} color="#ff9500" />
                                            <Text style={[styles.contactText, { color: theme.text }]}>{otherUser.email || 'Not available'}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                    style={[styles.inputWrapper, { backgroundColor: theme.card, borderTopColor: theme.border }]}
                >
                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                            <Ionicons name="image-outline" size={24} color={theme.primary} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#f5f6f7', color: theme.text }]}
                            value={text}
                            onChangeText={setText}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!text.trim() && !sending) && styles.sendBtnDisabled]}
                            onPress={() => handleSend()}
                            disabled={!text.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#667eea" />
                            ) : (
                                <Ionicons name="send" size={24} color={text.trim() ? "#667eea" : "#ccc"} />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {/* Full Screen Image Modal */}
                <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                    <View style={styles.modalBg}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingVertical: 20, paddingHorizontal: 15 },

    msgContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    myMsgContainer: { justifyContent: 'flex-end' },
    theirMsgContainer: { justifyContent: 'flex-start' },

    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 2 },

    bubble: { padding: 12, paddingHorizontal: 16, borderRadius: 20, maxWidth: '75%', elevation: 1 },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { borderBottomLeftRadius: 4 },

    msgImage: { width: 220, height: 180, borderRadius: 16, marginBottom: 5 },
    myMsgText: { color: '#fff', fontSize: 16 },
    theirMsgText: { color: '#1a1a1a', fontSize: 16 },

    timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    myTimeText: { color: 'rgba(255,255,255,0.7)' },
    theirTimeText: { color: '#999' },

    inputWrapper: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: Platform.OS === 'ios' ? 0 : 0 },
    inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'center' },
    attachBtn: { marginRight: 10, padding: 5 },
    input: { flex: 1, backgroundColor: '#f5f6f7', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, maxHeight: 100, fontSize: 16, color: '#333' },
    sendBtn: { marginLeft: 10, padding: 10, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.7 },
    contactHeader: { backgroundColor: '#fff', margin: 10, padding: 10, borderRadius: 12, elevation: 1 },
    contactToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5 },
    contactToggleText: { fontWeight: '600', color: '#667eea', fontSize: 14 },
    contactDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    contactText: { fontSize: 14, color: '#333' },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
    fullImage: { width: '100%', height: '80%' }
});
