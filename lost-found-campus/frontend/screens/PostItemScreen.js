import React, { useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Image,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function PostItemScreen({ navigation, route }) {
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const { campusId } = route.params || {};

    // Determine the campus ID to use
    // Priority: Route params -> User's campus -> null
    const targetCampusId = campusId || dbUser?.campusId?._id || dbUser?.campusId;

    const CATEGORIES = ['Electronics', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Others'];

    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('Others');
    const [type, setType] = useState('lost');
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const uploadImage = async () => {
        if (!image) return null;
        // In a real app, upload to Cloudinary/S3 here
        return image;
    };

    const handleSubmit = async () => {
        if (!title.trim() || !desc.trim() || !location.trim()) {
            Alert.alert("Missing Info", "Please fill in all details");
            return;
        }

        if (!targetCampusId) {
            Alert.alert("Error", "Campus not selected. Please go back and select a campus.");
            return;
        }

        setUploading(true);

        try {
            const imageUrl = await uploadImage();

            const payload = {
                title,
                description: desc,
                location,
                category,
                image: imageUrl,
                campusId: targetCampusId
            };

            const response = await apiClient.post(`/${type}`, payload);

            if (response.status === 201 || response.status === 200) {
                Alert.alert("Success", "Item posted successfully!");
                navigation.goBack();
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Failed to post item");
        } finally {
            setUploading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={isDarkMode ? [theme.card, theme.background] : ['#f8f9fa', '#e9ecef']}
                style={styles.header}
            >
                <Text style={[styles.headerTitle, { color: theme.text }]}>Post New Item</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Help the community find lost items</Text>
            </LinearGradient>

            <View style={[styles.typeSelector, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={[styles.typeBtn, type === 'lost' && styles.lostActive]}
                    onPress={() => setType('lost')}
                >
                    <Ionicons name="search" size={20} color={type === 'lost' ? '#fff' : theme.text} />
                    <Text style={[styles.typeBtnText, { color: theme.text }, type === 'lost' && styles.activeText]}>Lost Item</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeBtn, type === 'found' && styles.foundActive]}
                    onPress={() => setType('found')}
                >
                    <Ionicons name="gift" size={20} color={type === 'found' ? '#fff' : theme.text} />
                    <Text style={[styles.typeBtnText, { color: theme.text }, type === 'found' && styles.activeText]}>Found Item</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <TouchableOpacity style={[styles.imageUpload, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={pickImage}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.uploadedImage} />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="camera-outline" size={40} color={theme.textSecondary} />
                            <Text style={[styles.uploadText, { color: theme.textSecondary }]}>Add Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Title</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Blue Backpack"
                        placeholderTextColor={theme.textSecondary}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Location</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder={type === 'lost' ? "Where did you lose it?" : "Where did you find it?"}
                        placeholderTextColor={theme.textSecondary}
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        placeholder="Describe the item (color, brand, unique marks...)"
                        placeholderTextColor={theme.textSecondary}
                        value={desc}
                        onChangeText={setDesc}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, type === 'found' ? styles.submitFound : styles.submitLost]}
                    onPress={handleSubmit}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Post Report</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 25, paddingBottom: 15, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
    headerSubtitle: { fontSize: 14, color: '#666', marginTop: 5 },

    typeSelector: { flexDirection: 'row', margin: 20, backgroundColor: '#f0f0f0', borderRadius: 15, padding: 5 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
    lostActive: { backgroundColor: '#ff3b30' },
    foundActive: { backgroundColor: '#34c759' },
    typeBtnText: { fontWeight: '600', color: '#666' },
    activeText: { color: '#fff' },

    form: { padding: 20 },
    imageUpload: { height: 200, backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 25, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    uploadedImage: { width: '100%', height: '100%' },
    placeholderContainer: { alignItems: 'center' },
    uploadText: { color: '#999', marginTop: 10, fontWeight: '600' },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginLeft: 5 },
    input: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
    textArea: { height: 100, textAlignVertical: 'top' },

    submitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    submitLost: { backgroundColor: '#ff3b30' },
    submitFound: { backgroundColor: '#34c759' },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
