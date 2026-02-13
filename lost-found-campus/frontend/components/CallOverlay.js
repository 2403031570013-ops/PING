import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions, Vibration, Platform, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSocket } from '../utils/socket';
import { useUser } from '../context/UserContext';
import { Audio as ExpoAudio } from 'expo-av';
import apiClient from '../config/axios';

const { width, height } = Dimensions.get('window');

export default function CallOverlay() {
    const [feedback, setFeedback] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [sound, setSound] = useState(null);
    const { dbUser, socket } = useUser();

    // Refs
    const timeoutRef = useRef(null);
    const startTimeRef = useRef(null);
    const activeCallRef = useRef(null); // Critical: Access fresh state in event listeners

    // Sync activeCall state to ref
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    // --- Database Logging ---
    const saveCallLog = async (otherId, status, duration = 0) => {
        try {
            console.log(`[CallOverlay] Logging Call: ${status}, Duration: ${duration}s`);
            await apiClient.post('/calls', {
                receiverId: otherId,
                status,
                duration
            });
        } catch (e) {
            console.error("DB Call Log Failed:", e);
        }
    };

    // --- Chat Logging ---
    const logCall = async (userId, statusMsg) => {
        try {
            const chatRes = await apiClient.post('/chat', { otherUserId: userId });
            if (chatRes.data?._id) {
                await apiClient.post(`/chat/${chatRes.data._id}/message`, { text: statusMsg });
            }
        } catch (e) {
            console.error("Chat Log Failed:", e);
        }
    };

    // --- Sound Logic ---
    useEffect(() => {
        let currentSound = null;
        let webAudio = null;

        const playSound = async (type) => {
            const ringtoneUri = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Synthesized_Phone_Ring_Tone.ogg';
            const dialtoneUri = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
            const uri = type === 'ringtone' ? ringtoneUri : dialtoneUri;

            try {
                if (Platform.OS === 'web') {
                    if (webAudio) { webAudio.pause(); webAudio = null; }
                    webAudio = new Audio(uri);
                    webAudio.loop = true;
                    webAudio.volume = 1.0;
                    webAudio.play().catch(e => console.error("Web Audio Play Error", e));
                } else {
                    await ExpoAudio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                        shouldDuckAndroid: true,
                    });
                    if (currentSound) await currentSound.unloadAsync();
                    const { sound: newSound } = await ExpoAudio.Sound.createAsync(
                        { uri }, { shouldPlay: true, isLooping: true }
                    );
                    currentSound = newSound;
                    setSound(newSound);
                }
            } catch (error) { console.log("Error playing sound:", error); }
        };

        const stopSound = async () => {
            if (Platform.OS === 'web') {
                if (webAudio) { webAudio.pause(); webAudio = null; }
            } else {
                if (currentSound) { await currentSound.stopAsync(); await currentSound.unloadAsync(); currentSound = null; setSound(null); }
            }
            if (Platform.OS !== 'web') Vibration.cancel();
        };

        if (activeCall?.status === 'ringing') {
            playSound('ringtone');
            if (Platform.OS !== 'web') Vibration.vibrate([1000, 1000], true);
        } else if (activeCall?.status === 'calling') {
            playSound('dialtone');
        } else {
            stopSound();
        }

        return () => { stopSound(); };
    }, [activeCall?.status]);


    // --- Socket Logic ---
    const closeCallWithFeedback = (message) => {
        setFeedback(message);
        setTimeout(() => { setActiveCall(null); setFeedback(null); }, 2000);
    };

    useEffect(() => {
        const currentSocket = socket;
        if (!currentSocket) return;

        const handleIncomingCall = ({ from, name, offer }) => {
            setActiveCall({ from, name, status: 'ringing', offer, isCaller: false });

            // Auto-dismiss execution
            timeoutRef.current = setTimeout(() => {
                if (activeCallRef.current?.status === 'ringing') {
                    closeCallWithFeedback("Missed Call");
                    // Can log here if desired: saveCallLog(from, 'missed', 0); (Incoming Missed)
                }
            }, 30000);
        };

        const handleStartCall = (e) => {
            const targetId = e.detail.to;
            setActiveCall({ from: targetId, name: e.detail.name, status: 'calling', isCaller: true });

            // Auto-cancel if no answer
            timeoutRef.current = setTimeout(() => {
                currentSocket.emit('end-call', { to: targetId });
                closeCallWithFeedback("No Answer");
                const call = activeCallRef.current;
                logCall(targetId, "📞 Voice Call - No Answer");
                saveCallLog(targetId, 'missed', 0); // Log missed call
            }, 30000);
        };

        const handleCallAnswered = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            startTimeRef.current = Date.now();
            setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        };

        const handleCallEnded = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            closeCallWithFeedback("Call Ended");

            // Log completion if I am the Caller
            const call = activeCallRef.current;
            if (call?.isCaller && call?.status === 'connected' && startTimeRef.current) {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                logCall(call.from, `📞 Call Ended (${duration}s)`);
                saveCallLog(call.from, 'completed', duration);
            }
        };

        const handleCallRejected = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            closeCallWithFeedback("Line Busy");
            // Caller logs "Declined"
            const call = activeCallRef.current;
            if (call?.isCaller && call?.from) {
                logCall(call.from, "📞 Call Declined");
                saveCallLog(call.from, 'declined', 0);
            }
        };

        const handleCallFailed = ({ message }) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            closeCallWithFeedback(message || "Call Failed");
        };

        currentSocket.on('incoming-call', handleIncomingCall);
        currentSocket.on('call-answered', handleCallAnswered);
        currentSocket.on('call-ended', handleCallEnded);
        currentSocket.on('call-rejected', handleCallRejected);
        currentSocket.on('call-failed', handleCallFailed);

        if (Platform.OS === 'web') {
            window.addEventListener('start-outgoing-call', handleStartCall);
        } else {
            DeviceEventEmitter.addListener('start-outgoing-call', handleStartCall);
        }

        return () => {
            currentSocket.off('incoming-call', handleIncomingCall);
            currentSocket.off('call-answered', handleCallAnswered);
            currentSocket.off('call-ended', handleCallEnded);
            currentSocket.off('call-rejected', handleCallRejected);
            currentSocket.off('call-failed', handleCallFailed);

            if (Platform.OS === 'web') {
                window.removeEventListener('start-outgoing-call', handleStartCall);
            } else {
                DeviceEventEmitter.removeAllListeners('start-outgoing-call');
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [socket]); // Empty dependency array ensures listeners bound once. activeCallRef handles state access.

    // --- User Actions ---
    const handleAccept = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const currentSocket = getSocket();
        if (currentSocket && activeCall) {
            currentSocket.emit('answer-call', { to: activeCall.from });
        }
        startTimeRef.current = Date.now();
        setActiveCall(prev => ({ ...prev, status: 'connected' }));
    };

    const handleReject = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const currentSocket = getSocket();
        if (currentSocket && activeCall) {
            currentSocket.emit('reject-call', { to: activeCall.from });
        }
        setActiveCall(null);
    };

    const handleEnd = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const currentSocket = getSocket();

        if (activeCall) {
            // Log manually ended call (Caller side preference usually)
            if (activeCall.status === 'calling') {
                logCall(activeCall.from, "📞 Voice Call - Cancelled");
                saveCallLog(activeCall.from, 'cancelled', 0);
            } else if (activeCall.status === 'connected') {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000) || 0;
                logCall(activeCall.from, `📞 Call Ended (${duration}s)`);
                saveCallLog(activeCall.from, 'completed', duration);
            }

            if (currentSocket) {
                currentSocket.emit('end-call', { to: activeCall.from });
            }
        }
        setActiveCall(null);
    };

    if (!activeCall && !feedback) return null;

    return (
        <Modal transparent animationType="slide" visible={!!activeCall || !!feedback}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
                {feedback ? (
                    <View style={styles.center}>
                        <Ionicons name="information-circle" size={64} color="#e94560" />
                        <Text style={[styles.name, { marginTop: 20 }]}>{feedback}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.profileSection}>
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${activeCall?.name || 'User'}&background=random&size=200` }}
                                style={styles.avatar}
                            />
                            <Text style={styles.name}>{activeCall?.name}</Text>
                            <Text style={styles.status}>
                                {activeCall?.status === 'ringing' ? 'Incoming Voice Call...' :
                                    activeCall?.status === 'calling' ? 'Calling...' : 'In Call'}
                            </Text>
                        </View>

                        <View style={styles.controls}>
                            {activeCall?.status === 'ringing' ? (
                                <View style={styles.ringingControls}>
                                    <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleReject}>
                                        <Ionicons name="close" size={32} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
                                        <Ionicons name="call" size={32} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.connectedControls}>
                                    <TouchableOpacity
                                        style={[styles.circleBtn, isMuted && styles.activeCircleBtn]}
                                        onPress={() => setIsMuted(!isMuted)}
                                    >
                                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleEnd}>
                                        <Ionicons name="call" size={32} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.circleBtn}>
                                        <Ionicons name="volume-high" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </LinearGradient>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-around', alignItems: 'center', paddingVertical: 100 },
    profileSection: { alignItems: 'center' },
    avatar: { width: 140, height: 140, borderRadius: 70, marginBottom: 20, borderWidth: 4, borderColor: '#4ecca3' },
    name: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 10 },
    status: { fontSize: 16, color: '#4ecca3', fontWeight: '600' },
    controls: { width: '80%', alignItems: 'center' },
    ringingControls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    connectedControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%' },
    btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    declineBtn: { backgroundColor: '#e94560' },
    acceptBtn: { backgroundColor: '#4ecca3' },
    circleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    activeCircleBtn: { backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
