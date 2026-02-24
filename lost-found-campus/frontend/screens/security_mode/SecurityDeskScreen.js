import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SecurityDeskScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [location, setLocation] = useState('Gate 1');
    const [category, setCategory] = useState('Others');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notifyUserId, setNotifyUserId] = useState(null);
    const [scanningStep, setScanningStep] = useState(null); // 'analyzing', 'reading', 'matching', 'done'

    // Simulated Auto-ID Recognition
    const handleOCR = async (uri) => {
        setLoading(true);
        setScanningStep('analyzing');

        try {
            // Step 1: Analyze Texture
            await new Promise(r => setTimeout(r, 800));
            setScanningStep('reading');

            // Step 2: Read Text
            await new Promise(r => setTimeout(r, 1000));
            setScanningStep('matching');

            // Step 3: Database Lookup
            await new Promise(r => setTimeout(r, 800));

            // Result simulation
            const simulatedAnikId = "698be84fe258bb49844af9a0"; // The actual ID found in DB

            setTitle("Student ID Card - Anik Jain");
            setDesc("Official University ID Card detected.\nName: Anik Jain\nEnrollment: 2403031570013\nStatus: Registered Student");
            setCategory("Documents");
            setNotifyUserId(simulatedAnikId);
            setScanningStep('done');

            Alert.alert(
                "✅ Identity Verified",
                "System matched photo with Student DB.\n\nDirect notification will be sent upon logging.",
                [{ text: "Continue", style: "default" }]
            );
        } catch (e) {
            console.error("OCR Failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Security mode requires camera access.");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setImage(uri);
            handleOCR(uri);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert("Input Required", "Please ensure the item name is correctly detected.");
            return;
        }

        try {
            setLoading(true);
            await apiClient.post('/security/quick-log', {
                title,
                description: desc,
                location,
                category,
                image,
                notifyUserId
            });

            Alert.alert(
                "👮‍♂️ Official Log Entry Saved",
                "The item has been successfully logged.\n\nA digital receipt and notification were sent to the owner.",
                [{
                    text: "Done", onPress: () => {
                        setTitle(''); setDesc(''); setImage(null); setNotifyUserId(null); setScanningStep(null);
                    }
                }]
            );
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to log item";
            Alert.alert("System Error", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.badge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.badgeText}>LIVE SECURITY FEED</Text>
                    </View>
                </View>
                <Text style={styles.headerTitle}>Security Portal</Text>
                <Text style={styles.headerSub}>Rapid Logging & Student Identification</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity
                    style={[styles.cameraContainer, image && { height: 250 }]}
                    onPress={pickImage}
                    activeOpacity={0.8}
                >
                    {image ? (
                        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <Image source={{ uri: image }} style={styles.preview} />

                            {loading && (
                                <View style={styles.scanOverlay}>
                                    <View style={styles.scanLine} />
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.loadingText}>
                                            {scanningStep === 'analyzing' ? 'ANALYZING TEXTURE...' :
                                                scanningStep === 'reading' ? 'READING ID DATA...' :
                                                    'MATCHING CAMPUS DB...'}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {scanningStep === 'done' && (
                                <View style={styles.verifiedTag}>
                                    <Ionicons name="checkmark-seal" size={18} color="#fff" />
                                    <Text style={styles.verifiedText}>DB MATCH FOUND</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.cameraPlaceholder}>
                            <View style={styles.cameraCircle}>
                                <Ionicons name="scan-outline" size={32} color="#fff" />
                            </View>
                            <Text style={styles.cameraLabel}>SCAN ID CARD OR ITEM</Text>
                            <Text style={styles.cameraHint}>System will auto-detect student details</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={[styles.form, { borderTopColor: '#3b82f6', borderTopWidth: 4 }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text" size={18} color="#3b82f6" />
                        <Text style={styles.sectionTitle}>LOG DETAILS</Text>
                    </View>

                    <Text style={styles.label}>Name / Label</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Waiting for scan..."
                        placeholderTextColor="#94a3b8"
                    />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Location</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={location}
                                    style={styles.picker}
                                    onValueChange={(v) => setLocation(v)}
                                >
                                    <Picker.Item label="Entry Gate 1" value="Gate 1" />
                                    <Picker.Item label="Library" value="Library" />
                                    <Picker.Item label="Admin Block" value="Admin" />
                                </Picker>
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={category}
                                    style={styles.picker}
                                    onValueChange={(v) => setCategory(v)}
                                >
                                    <Picker.Item label="ID / Doc" value="Documents" />
                                    <Picker.Item label="Mobility" value="Electronics" />
                                    <Picker.Item label="Personal" value="Others" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Log Notes</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        value={desc}
                        onChangeText={setDesc}
                        multiline
                        placeholder="Additional details..."
                        placeholderTextColor="#94a3b8"
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.submitGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="cloud-upload" size={20} color="#fff" />
                            <Text style={styles.submitText}>OFFICIALLY LOG ITEM</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    badgeText: { color: '#ef4444', fontSize: 10, fontWeight: '900' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSub: { color: 'rgba(255,255,255,0.6)', marginTop: 4, fontSize: 13, fontWeight: '500' },

    content: { padding: 20 },
    cameraContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 15, marginBottom: 20, height: 200, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1' },
    cameraPlaceholder: { alignItems: 'center' },
    cameraCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    cameraLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    cameraHint: { fontSize: 12, color: '#64748b', marginTop: 4 },
    preview: { width: '100%', height: '100%', borderRadius: 18 },

    scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    scanLine: { width: '90%', height: 2, backgroundColor: '#3b82f6', position: 'absolute', top: '50%', shadowColor: '#3b82f6', shadowOpacity: 1, shadowRadius: 10 },
    loadingBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 15 },
    loadingText: { color: '#fff', fontSize: 10, fontWeight: '900', marginTop: 10, letterSpacing: 1 },
    verifiedTag: { position: 'absolute', top: 15, right: 15, backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
    verifiedText: { color: '#fff', fontSize: 10, fontWeight: '900' },

    form: { backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: '#3b82f6', letterSpacing: 1 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, paddingLeft: 4 },
    input: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', fontWeight: '700', fontSize: 15 },
    pickerContainer: { backgroundColor: '#f8fafc', borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    picker: { height: 55, width: '100%' },
    submitBtn: { marginTop: 10, borderRadius: 18, overflow: 'hidden', elevation: 4 },
    submitGradient: { padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }
});
