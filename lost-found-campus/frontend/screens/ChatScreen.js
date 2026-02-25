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
import apiClient, { BACKEND_URL } from '../config/axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

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

    // --- FEATURE: VOICE NOTES ---
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sound, setSound] = useState(null);

    const flatListRef = useRef();
    const hasAutoSent = useRef(false);

    useEffect(() => {
        return sound
            ? () => {
                console.log('Unloading Sound');
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    async function startRecording() {
        try {
            console.log('Requesting permissions..');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setIsRecording(false);
        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        // Playback locally for confirmation or send immediately
        handleSend(null, null, uri);
    }

    async function playSound(uri) {
        console.log('Loading Sound');
        const { sound } = await Audio.Sound.createAsync({ uri });
        setSound(sound);

        console.log('Playing Sound');
        await sound.playAsync();
    }

    const initiateCall = (targetUser, isVideo = false) => {
        const contextSocket = getSocket();
        if (!contextSocket) {
            Alert.alert("Error", "Real-time connection not established.");
            return;
        }

        contextSocket.emit('call-user', {
            to: targetUser._id,
            from: dbUser._id,
            name: dbUser.fullName,
            isVideo
        });

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
                if (chatId) {
                    response = await apiClient.get(`/chat/${chatId}`);
                } else if (otherUserId) {
                    response = await apiClient.post('/chat', { itemId, otherUserId, itemType });
                } else {
                    return;
                }

                const data = response.data;
                setChatData(data);

                if (data?._id) {
                    apiClient.patch(`/chat/${data._id}/read`).then(() => refreshBadges());
                }

                if (initialMessage && !hasAutoSent.current) {
                    hasAutoSent.current = true;
                    await apiClient.post(`/chat/${data._id}/message`, { text: initialMessage });
                    const updatedRes = await apiClient.get(`/chat/${data._id}`);
                    setMessages(updatedRes.data.messages || []);
                    setChatData(updatedRes.data);
                } else {
                    setMessages(data.messages || []);
                }

                const members = data.members || [];
                const otherUser = members.find(m => (m._id || m).toString() !== dbUser._id.toString());

                if (otherUser) {
                    navigation.setOptions({
                        title: otherUser.fullName || 'Chat',
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
            } finally {
                setLoading(false);
            }
        };
        initChat();

        const socket = getSocket();
        if (socket && typeof socket.on === 'function') {
            socket.on('new-message', ({ chatId: incomingChatId, message }) => {
                if (incomingChatId === (chatId || chatData?._id)) {
                    setMessages(prev => {
                        if (prev.find(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                    apiClient.patch(`/chat/${incomingChatId}/read`).then(() => refreshBadges()).catch(() => { });
                }
            });
        }

        return () => {
            if (socket && typeof socket.off === 'function') socket.off('new-message');
        };
    }, [chatId, itemId, otherUserId, chatData?._id]);

    const handleSend = async (manualText = null, imageUri = null, audioUri = null) => {
        const messageText = manualText !== null ? manualText : text;
        if (!messageText?.trim() && !imageUri && !audioUri) return;

        if (!chatData) return;
        if (!imageUri && !audioUri) setText('');

        setSending(true);
        try {
            const formData = new FormData();
            if (messageText) formData.append('text', messageText);

            if (imageUri) {
                const filename = imageUri.split('/').pop() || 'upload.jpg';
                if (Platform.OS === 'web') {
                    const res = await fetch(imageUri);
                    const blob = await res.blob();
                    formData.append('image', blob, filename);
                } else {
                    formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
                }
            }

            if (audioUri) {
                const filename = audioUri.split('/').pop() || 'voice.m4a';
                if (Platform.OS === 'web') {
                    const res = await fetch(audioUri);
                    const blob = await res.blob();
                    formData.append('audio', blob, filename);
                } else {
                    formData.append('audio', { uri: audioUri, name: filename, type: 'audio/m4a' });
                }
            }

            const response = await apiClient.post(`/chat/${chatData._id}/message`, formData);
            setMessages(response.data.messages);
        } catch (error) {
            console.error("Send fail:", error);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === dbUser?._id;
        const members = chatData?.members || [];
        const otherUser = members.find(m => (m._id || m).toString() !== dbUser._id.toString());
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.fullName || 'U')}&background=random&color=fff`;

        const isSystem = item.text?.includes('Voice Call') || item.text?.includes('📞');
        const isAudio = !!item.audioURL;

        if (isSystem) {
            return (
                <View style={styles.systemMsgContainer}>
                    <View style={[styles.systemBubble, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons
                            name={item.text.includes('Cancelled') ? "call-outline" : "call"}
                            size={14}
                            color={item.text.includes('Cancelled') ? theme.danger : theme.success}
                        />
                        <Text style={[styles.systemMsgText, { color: theme.textSecondary }]}>{item.text.replace('📞', '').trim()}</Text>
                        <Text style={[styles.systemTimeText, { color: theme.textSecondary }]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.msgContainer, isMe ? styles.myMsgContainer : styles.theirMsgContainer]}>
                {!isMe && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}
                <LinearGradient
                    colors={isMe ? theme.primaryGradient : [theme.card, theme.card]}
                    style={[
                        styles.bubble,
                        isMe ? styles.myBubble : styles.theirBubble,
                        !isMe && { borderWidth: 1, borderColor: theme.border }
                    ]}
                >
                    {item.imageURL && (
                        <TouchableOpacity onPress={() => setSelectedImage(item.imageURL)}>
                            <Image source={{ uri: item.imageURL.startsWith('http') ? item.imageURL : `${BACKEND_URL}${item.imageURL}` }} style={styles.msgImage} />
                        </TouchableOpacity>
                    )}

                    {isAudio ? (
                        <TouchableOpacity
                            style={styles.audioBubble}
                            onPress={() => playSound(item.audioURL.startsWith('http') ? item.audioURL : `${BACKEND_URL}${item.audioURL}`)}
                        >
                            <Ionicons name="play-circle" size={32} color={isMe ? "#fff" : theme.primary} />
                            <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: theme.text }]}>Voice Note</Text>
                        </TouchableOpacity>
                    ) : (
                        item.text ? <Text style={isMe ? styles.myMsgText : [styles.theirMsgText, { color: theme.text }]}>{item.text}</Text> : null
                    )}

                    <Text style={[styles.timeText, isMe ? styles.myTimeText : [styles.theirTimeText, { color: theme.textSecondary }]]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </LinearGradient>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => item._id || index.toString()}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                style={[styles.inputWrapper, { backgroundColor: theme.card, borderTopColor: theme.border }]}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => ImagePicker.launchImageLibraryAsync({ quality: 0.7 }).then(r => !r.canceled && handleSend(null, r.assets[0].uri))}>
                        <Ionicons name="image-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>

                    <TextInput
                        style={[styles.input, { backgroundColor: isDarkMode ? theme.background : '#F1F5F9', color: theme.text, borderColor: theme.border, borderWidth: 1 }]}
                        value={text}
                        onChangeText={setText}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                    />

                    {text.trim() || sending ? (
                        <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()} disabled={sending}>
                            <Ionicons name="send" size={24} color={theme.primary} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.micBtn, isRecording && { backgroundColor: '#EF4444' }]}
                            onLongPress={startRecording}
                            onPressOut={stopRecording}
                        >
                            <Ionicons name={isRecording ? "stop" : "mic-outline"} size={26} color={isRecording ? "#fff" : theme.primary} />
                        </TouchableOpacity>
                    )}
                </View>
                {isRecording && <Text style={styles.recordingText}>Recording... Release to send</Text>}
            </KeyboardAvoidingView>

            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close" size={32} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage.startsWith('http') ? selectedImage : `${BACKEND_URL}${selectedImage}` }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 15 },
    msgContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    myMsgContainer: { justifyContent: 'flex-end' },
    theirMsgContainer: { justifyContent: 'flex-start' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
    bubble: { padding: 12, borderRadius: 20, maxWidth: '75%' },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { borderBottomLeftRadius: 4 },
    msgImage: { width: 220, height: 180, borderRadius: 16, marginBottom: 5 },
    myMsgText: { color: '#fff', fontSize: 16, fontWeight: '500' },
    theirMsgText: { fontSize: 16, fontWeight: '500' },
    audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
    timeText: { fontSize: 9, marginTop: 4, textAlign: 'right', opacity: 0.6 },
    myTimeText: { color: 'rgba(255,255,255,0.7)' },
    theirTimeText: { color: 'rgba(0,0,0,0.4)' },
    systemMsgContainer: { alignItems: 'center', marginVertical: 15 },
    systemBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    systemMsgText: { fontSize: 12, fontWeight: '700' },
    systemTimeText: { fontSize: 10, opacity: 0.5, marginLeft: 5 },
    inputWrapper: { padding: 10, borderTopWidth: 1 },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    attachBtn: { padding: 5 },
    input: { flex: 1, marginHorizontal: 10, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
    sendBtn: { padding: 5 },
    micBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    recordingText: { textAlign: 'center', color: '#EF4444', fontSize: 12, fontWeight: '700', marginTop: 5 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' }
});
