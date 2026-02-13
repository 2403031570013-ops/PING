import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../config/axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SecurityDeskScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [location, setLocation] = useState('Security Gate 1');
    const [category, setCategory] = useState('Others');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notifyUserId, setNotifyUserId] = useState(null);

    // Simulated Auto-ID Recognition
    const handleOCR = async (uri) => {
        setLoading(true);
        try {
            // In a real app, this would be an API call to OCR + Database Lookup
            // For now, we simulate finding "Anik Jain"
            const simulatedAnikId = "698be84fe258bb49844af9a0"; // The actual ID found in DB

            setTimeout(() => {
                Alert.alert("Auto-ID Detected", "Name: Anik Jain\nEnrollment: 2403031570013\n\nNotification queued for Student!");
                setTitle("Student ID Card - Anik Jain");
                setDesc("Found at Main Gate. ID: 2403031570013");
                setCategory("Documents");
                setNotifyUserId(simulatedAnikId);
                setLoading(false);
            }, 1000);
        } catch (e) {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
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
            Alert.alert("Missing Info", "Please provide a title or name for the item.");
            return;
        }

        try {
            setLoading(true);
            console.log("[Security] Submitting log with data:", { title, location, category, notifyUserId });

            const response = await apiClient.post('/security/quick-log', {
                title,
                description: desc,
                location,
                category,
                image,
                notifyUserId
            });

            console.log("[Security] Log successful:", response.data);
            Alert.alert("Logged Successfully", "Item added to database and direct notification sent to student.");
            setTitle(''); setDesc(''); setImage(null); setNotifyUserId(null);
        } catch (error) {
            console.error("[Security] Submit Error Details:", error.response?.data || error.message);
            const msg = error.response?.data?.message || "Failed to log item";
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>👮‍♂️ Security Desk Mode</Text>
                <Text style={styles.headerSub}>Quick Log & Auto-Notification System</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>

                <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                    <View style={styles.cameraCircle}>
                        <Ionicons name="camera" size={40} color="#fff" />
                    </View>
                    <Text style={styles.cameraText}>{image ? "Retake Photo" : "Scan Item / ID Card"}</Text>
                </TouchableOpacity>

                {image && (
                    <Image source={{ uri: image }} style={styles.preview} />
                )}

                <View style={styles.form}>
                    <Text style={styles.label}>Detected Item Name</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Blue Wallet"
                        placeholderTextColor="#94a3b8"
                    />

                    <Text style={styles.label}>Location Found</Text>
                    <Picker
                        selectedValue={location}
                        style={styles.picker}
                        onValueChange={(itemValue) => setLocation(itemValue)}
                    >
                        <Picker.Item label="Security Gate 1" value="Gate 1" />
                        <Picker.Item label="Library Reception" value="Library" />
                        <Picker.Item label="Canteen Area" value="Canteen" />
                        <Picker.Item label="Parking Lot A" value="Parking A" />
                    </Picker>

                    <Text style={styles.label}>Category</Text>
                    <Picker
                        selectedValue={category}
                        style={styles.picker}
                        onValueChange={(itemValue) => setCategory(itemValue)}
                    >
                        <Picker.Item label="Documents / ID" value="Documents" />
                        <Picker.Item label="Electronics" value="Electronics" />
                        <Picker.Item label="Keys" value="Keys" />
                        <Picker.Item label="Others" value="Others" />
                    </Picker>

                    <Text style={styles.label}>Description / ID Details</Text>
                    <TextInput
                        style={[styles.input, { height: 80 }]}
                        value={desc}
                        onChangeText={setDesc}
                        multiline
                        placeholder="Details..."
                        placeholderTextColor="#94a3b8"
                    />

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                        <Text style={styles.submitText}>{loading ? "Processing..." : "LOG ITEM & NOTIFY STUDENT"}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingTop: 40, paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSub: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 13, fontWeight: '500' },
    content: { padding: 20, maxWidth: 600, alignSelf: 'center', width: '100%' },
    cameraBtn: { alignItems: 'center', marginBottom: 20 },
    cameraCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
    cameraText: { fontWeight: '700', color: '#475569' },
    preview: { width: '100%', height: 200, borderRadius: 15, marginBottom: 20 },
    form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', fontWeight: '600', height: 50 },
    picker: { backgroundColor: '#f8fafc', marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
