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
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ForgotPasswordScreen({ navigation }) {
    const { theme } = useTheme();

    // State
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [showPassword, setShowPassword] = useState(false);

    // Load persisted email on mount
    useEffect(() => {
        const loadEmail = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('resetEmail');
                if (savedEmail) {
                    setEmail(savedEmail);
                }
            } catch (e) {
                console.log("Error loading email", e);
            }
        };
        loadEmail();
    }, []);

    const handleRequestOtp = async () => {
        if (!email) {
            if (Platform.OS === 'web') window.alert("Please enter your email address");
            else Alert.alert("Required", "Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/auth/forgot-password', { email });
            // Save email to survive refresh
            await AsyncStorage.setItem('resetEmail', email);

            const devOTP = response.data?.devOTP || '654321';
            const msg = response.data?.message || `Reset code sent! Use code: ${devOTP}`;
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Success", msg);

            setStep(2);
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to send OTP";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        // Recovery if email is lost from state
        let currentEmail = email;
        if (!currentEmail) {
            currentEmail = await AsyncStorage.getItem('resetEmail');
        }

        if (!currentEmail) {
            if (Platform.OS === 'web') window.alert("Email is missing. Please go back to step 1.");
            else Alert.alert("Error", "Email is missing. Please go back and enter your email again.");
            setStep(1);
            return;
        }

        if (!otp || !newPassword || !confirmPassword) {
            if (Platform.OS === 'web') window.alert("Please fill all fields");
            else Alert.alert("Required", "Please fill all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            if (Platform.OS === 'web') window.alert("Passwords do not match");
            else Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            console.log(`[FRONTEND] Sending reset request for: ${currentEmail}, OTP: ${otp}`);
            await apiClient.post('/auth/reset-password', {
                email: currentEmail,
                otp,
                newPassword
            });

            // Clear saved email on success
            await AsyncStorage.removeItem('resetEmail');

            const successMsg = "Password reset successfully! Please login.";
            if (Platform.OS === 'web') {
                window.alert(successMsg);
                navigation.navigate('Login');
            } else {
                Alert.alert("Success", successMsg, [
                    { text: "OK", onPress: () => navigation.navigate('Login') }
                ]);
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to reset password";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme.primaryGradient}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.content}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>

                        {/* Header */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backBtn}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-open" size={40} color={theme.primary} />
                            </View>
                            <Text style={styles.title}>Reset Password</Text>
                            <Text style={styles.subtitle}>
                                {step === 1
                                    ? "Enter your email to receive a reset code"
                                    : "Enter the code and your new password"}
                            </Text>
                        </View>

                        {/* Form */}
                        <View style={styles.card}>
                            {step === 1 ? (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={22} color={theme.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Email Address"
                                            placeholderTextColor="#999"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={handleRequestOtp}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={theme.primaryGradient}
                                            style={styles.buttonGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>Send Reset Code</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                                        <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { letterSpacing: 5, fontSize: 18, fontWeight: '700' }]}
                                            placeholder="000000"
                                            placeholderTextColor="#999"
                                            value={otp}
                                            onChangeText={setOtp}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={22} color={theme.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="New Password"
                                            placeholderTextColor="#999"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#999" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={22} color={theme.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Confirm Password"
                                            placeholderTextColor="#999"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={handleResetPassword}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={theme.primaryGradient}
                                            style={styles.buttonGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>Update Password</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 20 }}>
                                        <Text style={{ textAlign: 'center', color: '#64748B' }}>
                                            Change email?
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    content: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 25, justifyContent: 'center' },

    backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 10 },

    header: { alignItems: 'center', marginBottom: 30 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

    card: { backgroundColor: '#fff', borderRadius: 24, padding: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },

    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0F172A' },

    button: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
    buttonGradient: { paddingVertical: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
