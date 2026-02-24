import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    TextInput,
    FlatList,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Platform,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../config/axios';

const { width, height } = Dimensions.get('window');

const ROLES = [
    { id: 'student', title: 'Student', icon: 'school', color: '#6366f1' },
    { id: 'staff', title: 'Faculty / Staff', icon: 'business', color: '#10b981' },
    { id: 'security', title: 'Security', icon: 'shield-checkmark', color: '#f59e0b' },
    { id: 'admin', title: 'Admin', icon: 'settings', color: '#ef4444' }
];

const PURPOSES = [
    { id: 'lost', title: 'I lost something', icon: 'search', color: '#3b82f6' },
    { id: 'found', title: 'I found something', icon: 'hand-right', color: '#10b981' },
    { id: 'explore', title: 'Just exploring', icon: 'compass', color: '#6366f1' }
];

export default function OnboardingScreen({ onComplete }) {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null);
    const [campus, setCampus] = useState(null);
    const [purpose, setPurpose] = useState(null);

    const [search, setSearch] = useState('');
    const [campuses, setCampuses] = useState([]);
    const [loadingCampuses, setLoadingCampuses] = useState(false);

    const { setOnboardingData } = useUser();
    const { theme, isDarkMode } = useTheme();
    const { width: windowWidth } = useWindowDimensions();

    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        console.log('Onboarding Step Changed:', step);
        if (step === 2) fetchCampuses();
        AsyncStorage.setItem('onboardingCurrentStep', step.toString());

        if (Platform.OS === 'web') {
            fadeAnim.setValue(1);
        } else {
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
        }
    }, [step]);

    useEffect(() => {
        const loadStep = async () => {
            const savedStep = await AsyncStorage.getItem('onboardingCurrentStep');
            if (savedStep) setStep(parseInt(savedStep));

            const savedData = await AsyncStorage.getItem('temp_onboarding');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.role) setRole(parsed.role);
                if (parsed.campusId) setCampus({ _id: parsed.campusId, name: parsed.campusName });
                if (parsed.purpose) setPurpose(parsed.purpose);
            }
        };
        loadStep();
    }, []);

    const fetchCampuses = async () => {
        setLoadingCampuses(true);
        try {
            const res = await apiClient.get('/auth/campuses');
            setCampuses(res.data);
        } catch (e) {
            setCampuses([
                { _id: '1', name: 'Parul University', city: 'Vadodara, Gujarat' },
                { _id: '2', name: 'Stanford University', city: 'Stanford, California' },
                { _id: '3', name: 'University of Mumbai', city: 'Mumbai, Maharashtra' },
                { _id: '4', name: 'Indian Institute of Technology', city: 'Delhi, India' }
            ]);
        } finally {
            setLoadingCampuses(false);
        }
    };

    const transitTo = (nextStep) => {
        if (Platform.OS === 'web') {
            setStep(nextStep);
            return;
        }
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start(() => {
            setStep(nextStep);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
        });
    };

    const handleFinalize = async () => {
        const data = { role, campusId: campus?._id, campusName: campus?.name, purpose };
        await setOnboardingData(data);
        await AsyncStorage.setItem('onboardingComplete', 'true');
        await AsyncStorage.removeItem('onboardingCurrentStep');
        onComplete();
    };

    const handleQuickStart = async () => {
        try {
            const data = { role: 'student', campusId: '1', campusName: 'Parul University', purpose: 'explore' };
            await setOnboardingData(data);
            await AsyncStorage.setItem('onboardingComplete', 'true');
            await AsyncStorage.removeItem('onboardingCurrentStep');
            onComplete();
        } catch (e) {
            console.error(e);
            onComplete();
        }
    };

    const goToLogin = async () => {
        await AsyncStorage.setItem('onboardingComplete', 'true');
        await AsyncStorage.removeItem('onboardingCurrentStep');
        onComplete();
    };

    const filteredCampuses = campuses.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
    );

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.topInfoRow}>
                <Text style={styles.stepIndicatorLabel}>Step 1 of 3</Text>
                <Text style={styles.stepTitleLabel}>Choose Profile</Text>
            </View>
            <Text style={[styles.question, { color: theme.text }]}>Who are you?</Text>
            <Text style={[styles.subQuestion, { color: theme.textSecondary }]}>Select your profile to start.</Text>
            <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                    <TouchableOpacity
                        key={r.id}
                        style={[
                            styles.roleCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                                width: windowWidth > 0 ? (windowWidth - 65) / 2 : '45%',
                            },
                            role === r.id && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                        ]}
                        onPress={() => setRole(r.id)}
                    >
                        <Ionicons name={r.icon} size={35} color={role === r.id ? theme.primary : theme.textSecondary} />
                        <Text style={[styles.roleTitle, { color: role === r.id ? theme.text : theme.textSecondary }]}>{r.title}</Text>
                        {role === r.id && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }, !role && styles.disabledBtn]}
                disabled={!role}
                onPress={() => transitTo(2)}
            >
                <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.topInfoRow}>
                <Text style={styles.stepIndicatorLabel}>Step 2 of 3</Text>
                <Text style={styles.stepTitleLabel}>Find Campus</Text>
            </View>
            <Text style={[styles.question, { color: theme.text }]}>Select Your Campus</Text>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search for your college..."
                    placeholderTextColor={theme.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <View style={styles.listWrapper}>
                {loadingCampuses ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredCampuses}
                        keyExtractor={item => item._id}
                        scrollEnabled={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.campusItem,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    campus?._id === item._id && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                                ]}
                                onPress={() => setCampus(item)}
                            >
                                <View style={[styles.campusIconBox, { backgroundColor: theme.border }]}>
                                    <Ionicons name="business" size={24} color={theme.primary} />
                                </View>
                                <View style={styles.campusInfo}>
                                    <Text style={[styles.campusName, { color: theme.text }]}>{item.name}</Text>
                                    <Text style={[styles.campusCity, { color: theme.textSecondary }]}>{item.city}</Text>
                                </View>
                                {campus?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
            <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }, !campus && styles.disabledBtn]}
                disabled={!campus}
                onPress={() => transitTo(3)}
            >
                <Text style={styles.primaryBtnText}>Continue to Final Step</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.topInfoRow}>
                <Text style={styles.stepIndicatorLabel}>Step 3 of 3</Text>
                <Text style={styles.stepTitleLabel}>One Last Thing</Text>
            </View>
            <Text style={[styles.question, { color: theme.text }]}>What do you want to do?</Text>
            <Text style={[styles.subQuestion, { color: theme.textSecondary }]}>We will show you items based on this.</Text>
            <View style={styles.purposeList}>
                {PURPOSES.map(p => (
                    <TouchableOpacity
                        key={p.id}
                        style={[
                            styles.purposeCard,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            purpose === p.id && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                        ]}
                        onPress={() => setPurpose(p.id)}
                    >
                        <Ionicons name={p.icon} size={28} color={purpose === p.id ? theme.primary : theme.textSecondary} />
                        <Text style={[styles.purposeTitle, { color: purpose === p.id ? theme.text : theme.textSecondary }]}>{p.title}</Text>
                        <Ionicons name={purpose === p.id ? "radio-button-on" : "radio-button-off"} size={22} color={purpose === p.id ? theme.primary : theme.border} />
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }, !purpose && styles.disabledBtn]}
                disabled={!purpose}
                onPress={handleFinalize}
            >
                <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? transitTo(step - 1) : null}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} style={{ opacity: step > 1 ? 1 : 0 }} />
                </TouchableOpacity>
                <View style={styles.logoTitleContainer}>
                    <Text style={[styles.navLogoText, { color: theme.primary }]}>WELCOME</Text>
                    <View style={styles.stepDots}>
                        {[1, 2, 3].map(i => (
                            <View key={i} style={[styles.dot, { backgroundColor: theme.border }, step === i && { backgroundColor: theme.primary, width: 25 }]} />
                        ))}
                    </View>
                </View>
                <TouchableOpacity onPress={handleQuickStart} style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>SKIP</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {Platform.OS === 'web' ? (
                    <View style={{ flex: 1, minHeight: '80vh', width: '100%' }}>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </Animated.View>
                )}

                <TouchableOpacity onPress={goToLogin} style={styles.skipToLogin}>
                    <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                        Already have an account? <Text style={{ color: theme.primary, fontWeight: '800' }}>Login</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, height: Platform.OS === 'web' ? '100vh' : 'auto' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    logoTitleContainer: { alignItems: 'center' },
    navLogoText: { fontSize: 10, fontWeight: '900', letterSpacing: 4, marginBottom: 8 },
    stepDots: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 4, borderRadius: 2 },
    body: { flex: 1, width: '100%' },
    scrollContent: { paddingHorizontal: 25, paddingBottom: 40, flexGrow: 1, width: '100%' },
    stepContainer: { paddingTop: 10, width: '100%' },
    topInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    stepIndicatorLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    stepTitleLabel: { fontSize: 13, color: '#6366f1', fontWeight: '800' },
    question: { fontSize: 32, fontWeight: '800', marginBottom: 12 },
    subQuestion: { fontSize: 15, lineHeight: 22, marginBottom: 40 },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 40 },
    roleCard: {
        borderRadius: 20,
        paddingVertical: 35,
        alignItems: 'center',
        borderWidth: 1,
        justifyContent: 'center'
    },
    roleTitle: { fontSize: 16, fontWeight: '700', marginTop: 15 },
    activeDot: { position: 'absolute', bottom: 12, width: 6, height: 6, borderRadius: 3 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 15,
        paddingHorizontal: 15, height: 56, borderWidth: 1, marginBottom: 25
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '500' },
    listWrapper: { flex: 1, marginBottom: 20 },
    campusItem: {
        padding: 12, borderRadius: 15, borderWidth: 1, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    campusIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    campusInfo: { flex: 1 },
    campusName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    campusCity: { fontSize: 12 },
    purposeList: { gap: 15, marginBottom: 40 },
    purposeCard: {
        flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 18, borderWidth: 1, gap: 18
    },
    purposeTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
    primaryBtn: {
        height: 60, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20
    },
    primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    disabledBtn: { opacity: 0.5 },
    skipToLogin: {
        alignItems: 'center',
        paddingVertical: 15,
        marginTop: 20
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600'
    }
});
