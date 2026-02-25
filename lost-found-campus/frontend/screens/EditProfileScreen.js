import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Image,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import apiClient, { BACKEND_URL } from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function EditProfileScreen({ navigation }) {
    const { dbUser, refreshUser } = useUser();
    const { theme, isDarkMode } = useTheme();

    const [fullName, setFullName] = useState(dbUser?.fullName || '');
    const [phone, setPhone] = useState(dbUser?.phone || '');
    const [whatsappNumber, setWhatsappNumber] = useState(dbUser?.whatsappNumber || '');
    const [photoURL, setPhotoURL] = useState(dbUser?.photoURL || '');
    const [saving, setSaving] = useState(false);

    // Change password states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPassSection, setShowPassSection] = useState(false);
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);

    const showMsg = (title, msg) => {
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
                base64: true,
            });

            if (!result.canceled) {
                let base64Data = result.assets[0].base64;

                // BUG FIX: On web, base64 might be missing from result even if requested.
                // We fetch the blob and convert it manually.
                if (!base64Data && Platform.OS === 'web') {
                    try {
                        const response = await fetch(result.assets[0].uri);
                        const blob = await response.blob();
                        base64Data = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.error("Base64 conversion failed:", e);
                    }
                }

                if (base64Data) {
                    setPhotoURL(`data:image/jpeg;base64,${base64Data}`);
                } else {
                    setPhotoURL(result.assets[0].uri);
                }
            }
        } catch (err) {
            showMsg('Error', 'Failed to pick image.');
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) return showMsg('Error', 'Name is required.');

        setSaving(true);
        try {
            const res = await apiClient.put('/auth/profile', {
                fullName: fullName.trim(),
                phone: phone.trim(),
                whatsappNumber: whatsappNumber.trim(),
                photoURL
            });

            await refreshUser();
            showMsg('✅ Success', 'Profile updated successfully!');
            navigation.goBack();
        } catch (err) {
            showMsg('Error', err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) return showMsg('Error', 'Enter your current password.');
        if (!newPassword) return showMsg('Error', 'Enter a new password.');
        if (newPassword.length < 6) return showMsg('Error', 'New password must be at least 6 characters.');
        if (newPassword !== confirmPassword) return showMsg('Error', 'Passwords do not match.');

        setChangingPassword(true);
        try {
            await apiClient.put('/auth/change-password', {
                currentPassword,
                newPassword
            });

            showMsg('✅ Success', 'Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPassSection(false);
        } catch (err) {
            showMsg('Error', err.response?.data?.message || 'Failed to change password.');
        } finally {
            setChangingPassword(false);
        }
    };

    const getAvatarUrl = () => {
        if (photoURL) {
            return photoURL.startsWith('http') || photoURL.startsWith('data:')
                ? photoURL
                : `${BACKEND_URL}${photoURL}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=${isDarkMode ? '2D5BFF' : 'fff'}&color=${isDarkMode ? 'fff' : '2D5BFF'}&size=200&bold=true`;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient colors={theme.primaryGradient || ['#667eea', '#764ba2']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Avatar */}
                <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                    <Image source={{ uri: getAvatarUrl() }} style={styles.avatar} />
                    <View style={styles.cameraBadge}>
                        <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Info Section */}
                <View style={[styles.section, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        <Ionicons name="person" size={18} color={theme.primary} /> Personal Info
                    </Text>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Your full name"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Ionicons name="call-outline" size={18} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Your phone number"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Email (cannot be changed)</Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border, opacity: 0.6 }]}>
                        <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.textSecondary }]}
                            value={dbUser?.email || ''}
                            editable={false}
                        />
                        <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>WhatsApp Number</Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={whatsappNumber}
                            onChangeText={setWhatsappNumber}
                            placeholder="Your WhatsApp number"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Campus (tap to change)</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CampusSelect')}
                        style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}
                    >
                        <Ionicons name="school-outline" size={18} color={theme.textSecondary} />
                        <Text style={[styles.input, { color: theme.text }]}>
                            {dbUser?.campusId?.name || 'Select Campus'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Role (contact admin to change)</Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border, opacity: 0.6 }]}>
                        <Ionicons name="shield-outline" size={18} color={theme.textSecondary} />
                        <TextInput
                            style={[styles.input, { color: theme.textSecondary }]}
                            value={dbUser?.role?.charAt(0).toUpperCase() + dbUser?.role?.slice(1) || 'Student'}
                            editable={false}
                        />
                        <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSaveProfile}
                        disabled={saving}
                        style={styles.saveBtn}
                    >
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.saveBtnGradient}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Change Password Section */}
                <View style={[styles.section, { backgroundColor: theme.card }]}>
                    <TouchableOpacity
                        onPress={() => setShowPassSection(!showPassSection)}
                        style={styles.sectionToggle}
                    >
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            <Ionicons name="key" size={18} color="#F59E0B" /> Change Password
                        </Text>
                        <Ionicons
                            name={showPassSection ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={theme.textSecondary}
                        />
                    </TouchableOpacity>

                    {showPassSection && (
                        <View style={styles.passSection}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Current Password</Text>
                            <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Enter current password"
                                    placeholderTextColor={theme.textSecondary}
                                    secureTextEntry={!showCurrentPass}
                                />
                                <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                                    <Ionicons name={showCurrentPass ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
                            <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Ionicons name="key-outline" size={18} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Min 6 characters"
                                    placeholderTextColor={theme.textSecondary}
                                    secureTextEntry={!showNewPass}
                                />
                                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                                    <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>
                            <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter new password"
                                    placeholderTextColor={theme.textSecondary}
                                    secureTextEntry={!showNewPass}
                                />
                                {newPassword && confirmPassword && (
                                    <Ionicons
                                        name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                        size={18}
                                        color={newPassword === confirmPassword ? '#10B981' : '#EF4444'}
                                    />
                                )}
                            </View>

                            {/* Password Strength Indicator */}
                            {newPassword.length > 0 && (
                                <View style={styles.strengthRow}>
                                    <View style={[styles.strengthBar, { backgroundColor: newPassword.length >= 6 ? '#10B981' : '#EF4444' }]} />
                                    <View style={[styles.strengthBar, { backgroundColor: newPassword.length >= 8 ? '#10B981' : theme.border }]} />
                                    <View style={[styles.strengthBar, { backgroundColor: newPassword.length >= 10 && /[!@#$%^&*]/.test(newPassword) ? '#10B981' : theme.border }]} />
                                    <Text style={[styles.strengthText, { color: theme.textSecondary }]}>
                                        {newPassword.length < 6 ? 'Too short' : newPassword.length < 8 ? 'Fair' : newPassword.length < 10 ? 'Good' : 'Strong'}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                                style={styles.saveBtn}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#D97706']}
                                    style={styles.saveBtnGradient}
                                >
                                    {changingPassword ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="key" size={20} color="#fff" />
                                            <Text style={styles.saveBtnText}>Update Password</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Account Info */}
                <View style={[styles.section, { backgroundColor: theme.card, marginBottom: 40 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        <Ionicons name="information-circle" size={18} color="#3B82F6" /> Account Info
                    </Text>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Karma Points</Text>
                        <Text style={[styles.infoValue, { color: '#F59E0B' }]}>⭐ {dbUser?.karmaPoints || 0}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Account Status</Text>
                        <Text style={[styles.infoValue, { color: '#10B981' }]}>✅ {dbUser?.status || 'Active'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Member Since</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>
                            {dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Login Count</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser?.loginCount || 0}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 30, alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
    cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#667eea', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    changePhotoText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8, fontWeight: '600' },
    content: { flex: 1, paddingHorizontal: 16, marginTop: -10 },
    section: { borderRadius: 16, padding: 20, marginTop: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
    sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
    input: { flex: 1, fontSize: 15, fontWeight: '500' },
    saveBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
    saveBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    passSection: { marginTop: 10 },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthText: { fontSize: 11, fontWeight: '700', marginLeft: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
    infoLabel: { fontSize: 14, fontWeight: '500' },
    infoValue: { fontSize: 14, fontWeight: '700' },
});
