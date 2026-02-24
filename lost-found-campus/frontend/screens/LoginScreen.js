import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Modal,
    Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Admin Key State
    const [showAdminKeyModal, setShowAdminKeyModal] = useState(false);
    const [adminKey, setAdminKey] = useState('');
    const [adminKeyError, setAdminKeyError] = useState('');
    const [adminKeyLoading, setAdminKeyLoading] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [shakeAnim] = useState(new Animated.Value(0));

    const { setDbUser, onboardingData } = useUser();
    const { theme } = useTheme();

    useEffect(() => {
        if (onboardingData?.role) setRole(onboardingData.role);
    }, [onboardingData]);

    const showMsg = (title, msg) => {
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(title, msg);
    };

    const shakeModal = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
    };

    const handleAuth = async () => {
        if (!email || !password) return showMsg("Oops!", "Enter email and password");
        if (!isLogin && !fullName) return showMsg("Oops!", "Enter your full name");
        setLoading(true);
        try {
            let res = isLogin
                ? await apiClient.post('auth/login', { email, password })
                : await apiClient.post('auth/register', { fullName, email, password, phone, role, campusId: onboardingData?.campusId });

            // Check if admin key is required
            if (res.data?.requiresAdminKey) {
                setAdminEmail(res.data.email || email);
                setShowAdminKeyModal(true);
                setAdminKey('');
                setAdminKeyError('');
                setLoading(false);
                return;
            }

            const { user, token } = res.data;
            if (user && token) {
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                setDbUser(user);
            }
        } catch (e) {
            showMsg("Error", e.response?.data?.message || "Auth failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        if (loading) return;

        // Immediate Feedback
        if (provider === 'google') {
            setLoading(true);
            try {
                showMsg("Social Login", "Connecting to Google Account...");

                // Simulate authenticating
                await new Promise(resolve => setTimeout(resolve, 1500));

                const mockGoogleUser = {
                    googleId: "G-" + Math.random().toString(36).substring(7),
                    email: email || "campus.user@gmail.com",
                    fullName: fullName || "Campus Hero",
                    photoURL: "https://ui-avatars.com/api/?name=G&background=EA4335&color=fff"
                };

                const res = await apiClient.post('auth/google', mockGoogleUser);
                const { user, token } = res.data;

                if (user && token) {
                    await AsyncStorage.setItem('authToken', token);
                    await AsyncStorage.setItem('user', JSON.stringify(user));
                    showMsg("Success", "Authenticated via Google!");
                    setDbUser(user);
                }
            } catch (e) {
                console.error("Google Auth Error:", e);
                showMsg("Auth Error", "Could not connect to Google services.");
            } finally {
                setLoading(false);
            }
        } else {
            showMsg("Coming Soon", "Apple login will be available in the next update.");
        }
    };

    const handleAdminKeySubmit = async () => {
        if (!adminKey.trim()) {
            setAdminKeyError('Admin Key is required');
            shakeModal();
            return;
        }

        setAdminKeyLoading(true);
        setAdminKeyError('');
        try {
            const res = await apiClient.post('/auth/login', {
                email: adminEmail || email,
                password,
                adminKey: adminKey.trim()
            });

            const { user, token } = res.data;
            if (user && token) {
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                setShowAdminKeyModal(false);
                setAdminKey('');
                setDbUser(user);
            }
        } catch (e) {
            const errMsg = e.response?.data?.message || 'Invalid Admin Key';
            setAdminKeyError(errMsg);
            shakeModal();
        } finally {
            setAdminKeyLoading(false);
        }
    };

    // ═══════════════════════════════════════
    // ADMIN KEY MODAL
    // ═══════════════════════════════════════
    const renderAdminKeyModal = () => (
        <Modal
            visible={showAdminKeyModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAdminKeyModal(false)}
        >
            <View style={styles.modalOverlay}>
                <Animated.View style={[
                    styles.modalCard,
                    { backgroundColor: theme.card, transform: [{ translateX: shakeAnim }] }
                ]}>
                    {/* Security Icon */}
                    <View style={styles.modalIconWrapper}>
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']}
                            style={styles.modalIconGradient}
                        >
                            <Ionicons name="shield-checkmark" size={36} color="#fff" />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                        🔐 Admin Verification
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                        This account requires a secret admin key to access the admin panel.
                    </Text>

                    {/* Admin Email Badge */}
                    <View style={[styles.adminBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Ionicons name="person-circle" size={16} color={theme.primary} />
                        <Text style={[styles.adminBadgeText, { color: theme.primary }]}>
                            {adminEmail}
                        </Text>
                    </View>

                    {/* Admin Key Input */}
                    <View style={[
                        styles.adminKeyInput,
                        { backgroundColor: theme.background, borderColor: adminKeyError ? '#EF4444' : theme.border }
                    ]}>
                        <Ionicons name="key" size={20} color={adminKeyError ? '#EF4444' : theme.textSecondary} />
                        <TextInput
                            style={[styles.adminKeyTextInput, { color: theme.text }]}
                            placeholder="Enter Admin Secret Key"
                            placeholderTextColor={theme.textSecondary}
                            secureTextEntry={true}
                            value={adminKey}
                            onChangeText={(text) => {
                                setAdminKey(text);
                                setAdminKeyError('');
                            }}
                            autoFocus={true}
                            onSubmitEditing={handleAdminKeySubmit}
                        />
                    </View>

                    {/* Error Message */}
                    {adminKeyError ? (
                        <View style={styles.errorRow}>
                            <Ionicons name="warning" size={14} color="#EF4444" />
                            <Text style={styles.errorText}>{adminKeyError}</Text>
                        </View>
                    ) : null}

                    {/* Security Warning */}
                    <View style={[styles.warningBox, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="alert-triangle" size={14} color="#D97706" />
                        <Text style={styles.warningText}>
                            Invalid attempts are logged and monitored.
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity
                            style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                            onPress={() => {
                                setShowAdminKeyModal(false);
                                setAdminKey('');
                                setAdminKeyError('');
                            }}
                        >
                            <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalSubmitBtn}
                            onPress={handleAdminKeySubmit}
                            disabled={adminKeyLoading}
                        >
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                style={styles.modalSubmitGradient}
                            >
                                {adminKeyLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="lock-open" size={18} color="#fff" />
                                        <Text style={styles.modalSubmitText}>Verify & Login</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header Branding */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            style={styles.securityIconBox}
                        >
                            <Ionicons name="shield-checkmark" size={40} color="#fff" />
                        </LinearGradient>
                        <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            A safe place to find and return items across your campus.
                        </Text>
                    </View>

                    {/* Mode Selector */}
                    <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={[styles.tab, isLogin && { backgroundColor: theme.primary }]}
                            onPress={() => setIsLogin(true)}
                        >
                            <Text style={[styles.tabText, { color: isLogin ? '#fff' : theme.textSecondary }]}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, !isLogin && { backgroundColor: theme.primary }]}
                            onPress={() => setIsLogin(false)}
                        >
                            <Text style={[styles.tabText, { color: !isLogin ? '#fff' : theme.textSecondary }]}>Register</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {!isLogin && (
                            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Full Name"
                                    placeholderTextColor={theme.textSecondary}
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>
                        )}

                        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Institutional Email"
                                placeholderTextColor={theme.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Password"
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {!isLogin && (
                            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="call-outline" size={20} color={theme.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Phone Number"
                                    placeholderTextColor={theme.textSecondary}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: 10 }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 10, fontWeight: '700' }}>Role:</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => setRole('student')}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                                        backgroundColor: role === 'student' ? theme.primary : theme.card
                                    }}
                                >
                                    <Text style={{ color: role === 'student' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: 13 }}>Student</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setRole('staff')}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                                        backgroundColor: role === 'staff' ? theme.primary : theme.card
                                    }}
                                >
                                    <Text style={{ color: role === 'staff' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: 13 }}>Staff</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.forgotPass} onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={{ color: theme.primary, fontWeight: '700' }}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginBtn, { backgroundColor: theme.primary }]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Text style={styles.loginBtnText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR CONTINUE WITH</Text>
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity
                            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => handleSocialLogin('google')}
                        >
                            <Ionicons name="logo-google" size={24} color="#EA4335" />
                            <Text style={[styles.socialBtnText, { color: theme.text }]}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => handleSocialLogin('apple')}
                        >
                            <Ionicons name="logo-apple" size={24} color={theme.text} />
                            <Text style={[styles.socialBtnText, { color: theme.text }]}>Apple</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 30 }}>
                        <Text style={[styles.footer, { color: theme.textSecondary }]}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Text style={{ color: theme.primary, fontWeight: '800' }}>{isLogin ? 'Sign Up' : 'Login'}</Text>
                        </Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Admin Key Modal */}
            {renderAdminKeyModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 30, paddingTop: 60, paddingBottom: 50 },
    header: { alignItems: 'center', marginBottom: 40 },
    securityIconBox: { width: 80, height: 80, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 10 },
    subtitle: { fontSize: 15, textAlign: 'center', opacity: 0.8, lineHeight: 22 },

    tabBar: { flexDirection: 'row', borderRadius: 15, padding: 5, marginBottom: 30 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    tabText: { fontSize: 14, fontWeight: '700' },

    form: { gap: 15 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', height: 60, borderRadius: 15,
        paddingHorizontal: 15, borderWidth: 1, gap: 12
    },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    forgotPass: { alignSelf: 'flex-end', marginTop: 5, marginBottom: 10 },

    loginBtn: {
        height: 60, borderRadius: 15, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10
    },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 35, gap: 15 },
    line: { flex: 1, height: 1 },
    dividerText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    socialRow: { flexDirection: 'row', gap: 15 },
    socialBtn: {
        flex: 1, height: 56, borderRadius: 15, borderWidth: 1,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10
    },
    socialBtnText: { fontSize: 16, fontWeight: '700' },

    footer: { textAlign: 'center', marginTop: 40, fontSize: 14, lineHeight: 18 },

    // ═══════════════════════════════════
    // ADMIN KEY MODAL STYLES
    // ═══════════════════════════════════
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 25
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 25
    },
    modalIconWrapper: {
        marginBottom: 20
    },
    modalIconGradient: {
        width: 72,
        height: 72,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center'
    },
    modalSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 10
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        marginBottom: 20
    },
    adminBadgeText: {
        fontSize: 13,
        fontWeight: '700'
    },
    adminKeyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 56,
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 2,
        gap: 12,
        marginBottom: 10
    },
    adminKeyTextInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 2
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        alignSelf: 'flex-start'
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700'
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20
    },
    warningText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#92400E',
        flex: 1
    },
    modalBtnRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12
    },
    modalCancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '700'
    },
    modalSubmitBtn: {
        flex: 2,
        borderRadius: 14,
        overflow: 'hidden'
    },
    modalSubmitGradient: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
    },
    modalSubmitText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800'
    }
});
