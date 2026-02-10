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
    Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import apiClient from '../config/axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

export default function ChatScreen({ route, navigation }) {
    const { itemId, otherUserId, itemType, chatId, initialMessage } = route.params || {};
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatData, setChatData] = useState(null);
    const [showContact, setShowContact] = useState(false);
    const flatListRef = useRef();
    const hasAutoSent = useRef(false);

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
                        headerTitleStyle: { fontWeight: 'bold' }
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

        // Poll for new messages every 5 seconds (Simple polling)
        const interval = setInterval(initChat, 5000);
        return () => clearInterval(interval);
    }, [chatId, itemId, otherUserId]);

    const handleSend = async () => {
        if (!text.trim()) return;

        if (!chatData) {
            Alert.alert("Error", "Chat not initialized. Please wait or reload.");
            return;
        }

        const msgToSend = text.trim();
        setText(''); // Clear input immediately

        // Optimistic update
        const tempMsg = {
            _id: Date.now().toString(),
            senderId: dbUser._id,
            text: msgToSend,
            createdAt: new Date().toISOString(),
            pending: true
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const response = await apiClient.post(`/chat/${chatData._id}/message`, { text: msgToSend });
            // Update with real data from server
            setMessages(response.data.messages);
        } catch (error) {
            console.error("Error sending message:", error);
            // Remove optimistic msg or show error
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
        const avatarUrl = otherUser?.photoURL || 'https://via.placeholder.com/40';

        return (
            <View style={[styles.msgContainer, isMe ? styles.myMsgContainer : styles.theirMsgContainer]}>
                {!isMe && (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                )}

                <LinearGradient
                    colors={isMe ? ['#667eea', '#764ba2'] : [theme.card, theme.card]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
                >
                    <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: theme.text }]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </LinearGradient>
            </View>
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
                                            <Ionicons name="call" size={18} color="#34c759" />
                                            <Text style={[styles.contactText, { color: theme.text }]}>{otherUser.phone || 'Not available'}</Text>
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
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#f5f6f7', color: theme.text }]}
                            value={text}
                            onChangeText={setText}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!text.trim()}
                        >
                            <Ionicons name="send" size={24} color={text.trim() ? "#667eea" : "#ccc"} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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

    myMsgText: { color: '#fff', fontSize: 16 },
    theirMsgText: { color: '#1a1a1a', fontSize: 16 },

    timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    myTimeText: { color: 'rgba(255,255,255,0.7)' },
    theirTimeText: { color: '#999' },

    inputWrapper: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: Platform.OS === 'ios' ? 0 : 0 },
    inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#f5f6f7', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, maxHeight: 100, fontSize: 16, color: '#333' },
    sendBtn: { marginLeft: 10, padding: 10, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.7 },
    contactHeader: { backgroundColor: '#fff', margin: 10, padding: 10, borderRadius: 12, elevation: 1 },
    contactToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5 },
    contactToggleText: { fontWeight: '600', color: '#667eea', fontSize: 14 },
    contactDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    contactText: { fontSize: 14, color: '#333' }
});
