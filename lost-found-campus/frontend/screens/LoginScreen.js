import React, { useState } from 'react';
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
    Animated,
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { setDbUser } = useUser();

    const handleAuth = async () => {
        if (!email || !password) {
            const msg = "Please enter email and password";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Oops!", msg);
            return;
        }

        if (!isLogin && !fullName) {
            const msg = "Please enter your full name";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Oops!", msg);
            return;
        }

        setLoading(true);
        try {
            let response;

            if (isLogin) {
                response = await apiClient.post('/auth/login', { email, password });
            } else {
                response = await apiClient.post('/auth/register', {
                    fullName,
                    email,
                    password
                });
            }

            const { user, token } = response.data;

            await AsyncStorage.setItem('authToken', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setDbUser(user);

        } catch (error) {
            const message = error.response?.data?.message || error.message || "Authentication failed";
            if (Platform.OS === 'web') {
                window.alert(message);
            } else {
                Alert.alert("Error", message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.content}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Logo Section */}
                        <View style={styles.logoSection}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="search" size={50} color="#667eea" />
                            </View>
                            <Text style={styles.appName}>Lost & Found</Text>
                            <Text style={styles.tagline}>Find what you've lost, return what you've found</Text>
                        </View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Join Us!'}</Text>
                            <Text style={styles.subtitle}>
                                {isLogin ? 'Sign in to continue' : 'Create your account'}
                            </Text>

                            {!isLogin && (
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={22} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Full Name"
                                        placeholderTextColor="#999"
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={22} color="#667eea" style={styles.inputIcon} />
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

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={22} color="#667eea" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color="#999"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleAuth}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>
                                                {isLogin ? "Sign In" : "Create Account"}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setIsLogin(!isLogin)}
                                style={styles.switchContainer}
                            >
                                <Text style={styles.switchText}>
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <Text style={styles.switchLink}>
                                        {isLogin ? "Sign Up" : "Sign In"}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <Text style={styles.footer}>
                            🔒 Your data is safe with us
                        </Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        marginBottom: 15,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 5,
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 25,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
        elevation: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        marginBottom: 25,
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9ff',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e8e9f3',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#333',
    },
    button: {
        marginTop: 10,
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    switchContainer: {
        marginTop: 20,
    },
    switchText: {
        textAlign: 'center',
        fontSize: 15,
        color: '#666',
    },
    switchLink: {
        color: '#667eea',
        fontWeight: '700',
    },
    footer: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 25,
        fontSize: 13,
    },
});
