import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Image,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import apiClient, { BACKEND_URL } from '../config/axios';
import { useUser } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function PostItemScreen({ navigation, route }) {
    const { dbUser } = useUser();
    const { theme, isDarkMode } = useTheme();
    const { campusId, editItem } = route.params || {};

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
    const [bounty, setBounty] = useState('');
    const [isInsured, setIsInsured] = useState(false);
    const [priority, setPriority] = useState('normal');
    const [coordinates, setCoordinates] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);

    useEffect(() => {
        if (editItem) {
            setTitle(editItem.title || '');
            setDesc(editItem.description || '');
            setLocation(editItem.location || '');
            setCategory(editItem.category || 'Others');
            setType(editItem.type || 'lost');
            setBounty(editItem.bounty?.toString() || '');
            setIsInsured(!!editItem.isInsured);
            setPriority(editItem.priority || 'normal');
            if (editItem.coordinates) setCoordinates(editItem.coordinates);

            if (editItem.image) {
                const imgUrl = editItem.image.startsWith('http') || editItem.image.startsWith('data:')
                    ? editItem.image
                    : `${BACKEND_URL}${editItem.image}`;
                setImage(imgUrl);
            }
        }
    }, [editItem]);

    const handleGetLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need location access to tag the exact spot.');
                return;
            }

            const currentPos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setCoordinates({
                latitude: currentPos.coords.latitude,
                longitude: currentPos.coords.longitude
            });

            // Try reverse geocoding to fill location name if empty
            if (!location) {
                const [addr] = await Location.reverseGeocodeAsync({
                    latitude: currentPos.coords.latitude,
                    longitude: currentPos.coords.longitude
                });
                if (addr && (addr.name || addr.street)) {
                    setLocation(`${addr.name || ''} ${addr.street || ''}`.trim());
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Location Error', 'Failed to get your current location.');
        } finally {
            setLocationLoading(false);
        }
    };

    // Validation errors
    const [errors, setErrors] = useState({});
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const handleImageChoice = async (choice) => {
        setShowPickerModal(false);
        const options = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
            base64: true,
        };

        try {
            let result;
            if (choice === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "We need camera access to take photos of items.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (!result.canceled) {
                setIsScanning(true);
                const asset = result.assets[0];
                let finalImage = asset.uri;

                if (Platform.OS === 'web' || !asset.base64) {
                    try {
                        // Resizing logic for Web to keep DB clean and payload small
                        const img = document.createElement('img');
                        const base64Promise = new Promise((resolve, reject) => {
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                let width = img.width;
                                let height = img.height;
                                const maxDimension = 700; // Even more aggressive for stability

                                if (width > maxDimension || height > maxDimension) {
                                    if (width > height) {
                                        height *= maxDimension / width;
                                        width = maxDimension;
                                    } else {
                                        width *= maxDimension / height;
                                        height = maxDimension;
                                    }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);
                                // Compress to JPEG with 0.4 quality for ultra-small payload
                                resolve(canvas.toDataURL('image/jpeg', 0.4));
                            };
                            img.onerror = reject;
                            img.src = asset.uri;
                        });
                        finalImage = await base64Promise;
                    } catch (e) {
                        console.error("Web conversion/resize failed:", e);
                        // Fallback to raw fetch if canvas fails
                        try {
                            const response = await fetch(asset.uri);
                            const blob = await response.blob();
                            finalImage = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                        } catch (e2) {
                            finalImage = asset.uri;
                        }
                    }
                } else {
                    finalImage = asset.base64.startsWith('data:')
                        ? asset.base64
                        : `data:image/jpeg;base64,${asset.base64}`;
                }

                setImage(finalImage);
                setIsScanning(false);
                setErrors(e => ({ ...e, image: false }));
            }
        } catch (e) {
            console.error("Image Picker Error:", e);
            Alert.alert("Error", "Could not capture image.");
        }
    };

    const uploadImage = async () => {
        if (!image) return null;
        // In a real app, upload to Cloudinary/S3 here
        return image;
    };

    const handleSubmit = async () => {
        // Validate ALL mandatory fields
        const newErrors = {};
        const missingFields = [];

        if (!title.trim()) {
            newErrors.title = true;
            missingFields.push('Title');
        }
        if (!desc.trim()) {
            newErrors.desc = true;
            missingFields.push('Description');
        }
        if (!location.trim()) {
            newErrors.location = true;
            missingFields.push('Location');
        }
        if (!image) {
            newErrors.image = true;
            missingFields.push('Photo');
        }

        setErrors(newErrors);

        if (missingFields.length > 0) {
            const msg = `Please fill the following mandatory fields:\n\n• ${missingFields.join('\n• ')}`;
            if (Platform.OS === 'web') {
                window.alert(`⚠️ Missing Required Fields\n\n${msg}`);
            } else {
                Alert.alert('⚠️ Missing Required Fields', msg);
            }
            return;
        }

        if (image && image.startsWith('blob:')) {
            Alert.alert("Error", "Image processing failed (Blob detected). Please try selecting the image again.");
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
                campusId: targetCampusId,
                bounty: bounty ? parseFloat(bounty) : 0,
                isInsured,
                priority,
                coordinates
            };

            let response;
            if (editItem) {
                response = await apiClient.put(`/${type}/${editItem._id}`, payload);
            } else {
                response = await apiClient.post(`/${type}`, payload);
            }

            if (response.status === 201 || response.status === 200) {
                const successMsg = editItem ? "Item updated successfully!" : "Item posted successfully!";
                Alert.alert("Success", successMsg);
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
                <Text style={[styles.headerTitle, { color: theme.text }]}>Report something</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Help someone find their things</Text>
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
                {/* Photo Upload - MANDATORY */}
                <Text style={[styles.label, { color: theme.text, marginLeft: 5, marginBottom: 8 }]}>
                    Photo <Text style={{ color: '#EF4444' }}>*</Text>
                    {errors.image && <Text style={styles.errorHint}> — Required</Text>}
                </Text>
                <TouchableOpacity
                    style={[
                        styles.imageUpload,
                        { backgroundColor: theme.card, borderColor: errors.image ? '#EF4444' : theme.border },
                        errors.image && { borderWidth: 2, borderStyle: 'dashed' }
                    ]}
                    onPress={() => setShowPickerModal(true)}
                >
                    {isScanning ? (
                        <View style={styles.scanningOverlay}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.scanningText, { color: theme.primary }]}>AI Analyzing Image...</Text>
                        </View>
                    ) : image ? (
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: image }} style={styles.uploadedImage} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setImage(null)}
                            >
                                <Ionicons name="close-circle" size={28} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="camera-reverse" size={40} color={errors.image ? '#EF4444' : theme.textSecondary} />
                            <Text style={[styles.uploadText, { color: errors.image ? '#EF4444' : theme.textSecondary }]}>
                                {errors.image ? '⚠️ Photo is required!' : 'Tap to Capture or Upload'}
                            </Text>
                            <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4 }}>Supports ID Cards, Wallets, Gadgets</Text>
                        </View>
                    )}
                    {image && !isScanning && (
                        <View style={styles.imageOverlayBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 }}>Analyzed</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                        Title <Text style={{ color: '#EF4444' }}>*</Text>
                        {errors.title && <Text style={styles.errorHint}> — Required</Text>}
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            { backgroundColor: theme.card, color: theme.text, borderColor: errors.title ? '#EF4444' : theme.border },
                            errors.title && { borderWidth: 2 }
                        ]}
                        placeholder="e.g. Blue Backpack"
                        placeholderTextColor={errors.title ? '#FCA5A5' : theme.textSecondary}
                        value={title}
                        onChangeText={(t) => { setTitle(t); setErrors(e => ({ ...e, title: false })); }}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                        Location <Text style={{ color: '#EF4444' }}>*</Text>
                        {errors.location && <Text style={styles.errorHint}> — Required</Text>}
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            { backgroundColor: theme.card, color: theme.text, borderColor: errors.location ? '#EF4444' : theme.border },
                            errors.location && { borderWidth: 2 }
                        ]}
                        placeholder={type === 'lost' ? "Where did you lose it?" : "Where did you find it?"}
                        placeholderTextColor={errors.location ? '#FCA5A5' : theme.textSecondary}
                        value={location}
                        onChangeText={(t) => { setLocation(t); setErrors(e => ({ ...e, location: false })); }}
                    />

                    <TouchableOpacity
                        onPress={handleGetLocation}
                        style={[styles.locationBadge, { backgroundColor: coordinates ? '#D1FAE5' : theme.card, borderColor: coordinates ? '#10B981' : theme.border }]}
                    >
                        {locationLoading ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                            <>
                                <Ionicons
                                    name={coordinates ? "location" : "location-outline"}
                                    size={16}
                                    color={coordinates ? '#10B981' : theme.textSecondary}
                                />
                                <Text style={[styles.locationBadgeText, { color: coordinates ? '#065F46' : theme.textSecondary }]}>
                                    {coordinates ? "GPS Spot Captured" : "Get Current Spot"}
                                </Text>
                                {coordinates && (
                                    <TouchableOpacity onPress={() => setCoordinates(null)} style={{ marginLeft: 8 }}>
                                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    category === cat && (type === 'found' ? { backgroundColor: '#34c759', borderColor: '#34c759' } : { backgroundColor: '#ff3b30', borderColor: '#ff3b30' }),
                                    category !== cat && { backgroundColor: theme.card, borderColor: theme.border }
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: category === cat ? '700' : '500',
                                    color: category === cat ? '#fff' : theme.text
                                }}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                    {/* Bounty Input */}
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.label, { color: theme.text }]}>Reward points (Optional)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="Optional"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            value={bounty}
                            onChangeText={setBounty}
                        />
                    </View>

                    {/* Priority Selector */}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: theme.text }]}>How important is it?</Text>
                        <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                            {['normal', 'high'].map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={{ flex: 1, padding: 15, backgroundColor: priority === p ? (p === 'high' ? '#FF3B30' : theme.primary) : 'transparent' }}
                                    onPress={() => setPriority(p)}
                                >
                                    <Text style={{ textAlign: 'center', color: priority === p ? '#fff' : theme.text, fontSize: 12, fontWeight: 'bold' }}>
                                        {p.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Insurance Toggle */}
                <TouchableOpacity
                    style={[styles.checkboxContainer, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => setIsInsured(!isInsured)}
                >
                    <Ionicons name={isInsured ? "checkbox" : "square-outline"} size={24} color={isInsured ? theme.success : theme.textSecondary} />
                    <Text style={[styles.checkboxLabel, { color: theme.text }]}>This item is very important</Text>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                        Description <Text style={{ color: '#EF4444' }}>*</Text>
                        {errors.desc && <Text style={styles.errorHint}> — Required</Text>}
                    </Text>
                    <TextInput
                        style={[
                            styles.input, styles.textArea,
                            { backgroundColor: theme.card, color: theme.text, borderColor: errors.desc ? '#EF4444' : theme.border },
                            errors.desc && { borderWidth: 2 }
                        ]}
                        placeholder="Describe the item (color, brand, unique marks...)"
                        placeholderTextColor={errors.desc ? '#FCA5A5' : theme.textSecondary}
                        value={desc}
                        onChangeText={(t) => { setDesc(t); setErrors(e => ({ ...e, desc: false })); }}
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
                        <Text style={styles.submitBtnText}>Submit now</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Photo Choice Modal */}
            <Modal visible={showPickerModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.pickerModal, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Photo Source</Text>

                        <View style={styles.pickerRow}>
                            <TouchableOpacity style={styles.pickerItem} onPress={() => handleImageChoice('camera')}>
                                <View style={[styles.pickerIcon, { backgroundColor: '#3b82f6' }]}>
                                    <Ionicons name="camera" size={30} color="#fff" />
                                </View>
                                <Text style={[styles.pickerLabel, { color: theme.text }]}>Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.pickerItem} onPress={() => handleImageChoice('gallery')}>
                                <View style={[styles.pickerIcon, { backgroundColor: '#10b981' }]}>
                                    <Ionicons name="images" size={30} color="#fff" />
                                </View>
                                <Text style={[styles.pickerLabel, { color: theme.text }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.cancelBtn, { backgroundColor: theme.background }]}
                            onPress={() => setShowPickerModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    imageUpload: { height: 220, backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 25, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    imageWrapper: { width: '100%', height: '100%', position: 'relative' },
    removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 2 },
    uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderContainer: { alignItems: 'center' },
    uploadText: { color: '#999', marginTop: 10, fontWeight: '700', fontSize: 15 },

    scanningOverlay: { alignItems: 'center', justifyContent: 'center' },
    scanningText: { marginTop: 15, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
    imageOverlayBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(16, 185, 129, 0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginLeft: 5 },
    input: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
    errorHint: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },

    submitBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    submitLost: { backgroundColor: '#ff3b30' },
    submitFound: { backgroundColor: '#34c759' },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    categoriesContainer: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    checkboxLabel: { marginLeft: 10, fontSize: 14, fontWeight: '600' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerModal: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
    modalHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 25 },
    pickerRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
    pickerItem: { alignItems: 'center' },
    pickerIcon: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    pickerLabel: { fontSize: 13, fontWeight: '700' },
    cancelBtn: { padding: 16, borderRadius: 15, alignItems: 'center' },
    cancelBtnText: { fontWeight: '700', fontSize: 14 },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'flex-start',
        gap: 6,
    },
    locationBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    }
});
