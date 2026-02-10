import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Animated,
    Platform
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../config/axios';
import { useUser } from '../context/UserContext';

const CAMPUS_ICONS = {
    'Parul University': 'school',
    'IIT Bombay': 'flask',
    'Delhi University': 'library',
    'BITS Pilani': 'rocket',
    'VIT Vellore': 'planet',
};

const CAMPUS_COLORS = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
];

export default function CampusSelectScreen({ navigation }) {
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const { refreshUser, dbUser } = useUser();

    useEffect(() => {
        const fetchCampuses = async () => {
            try {
                const response = await apiClient.get('/auth/campuses');
                if (Array.isArray(response.data)) {
                    setCampuses(response.data);
                }
            } catch (error) {
                console.error("Error fetching campuses:", error);
                setCampuses([
                    { _id: '1', name: 'Parul University', city: 'Vadodara' },
                    { _id: '2', name: 'Demo Campus', city: 'Demo City' }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchCampuses();
    }, []);

    // Smart Campus Detection
    useEffect(() => {
        if (!loading && campuses.length > 0 && dbUser?.email) {
            const isParulEmail = dbUser.email.toLowerCase().includes('@paruluniversity.ac.in');
            if (isParulEmail) {
                const parulCampus = campuses.find(c => c.name.toLowerCase().includes('parul university'));

                if (parulCampus) {
                    // Slight delay to ensure UI is rendered
                    setTimeout(() => {
                        if (Platform.OS === 'web') {
                            if (window.confirm("We detected a Parul University email. Do you want to join Parul University campus directly?")) {
                                handleSelect(parulCampus);
                            }
                        } else {
                            Alert.alert(
                                "Campus Detection",
                                "We detected a Parul University email. Do you want to join Parul University campus?",
                                [
                                    { text: "No, let me choose", style: "cancel" },
                                    { text: "Yes", onPress: () => handleSelect(parulCampus) }
                                ]
                            );
                        }
                    }, 500);
                }
            }
        }
    }, [loading, campuses, dbUser]);

    const handleSelect = async (campus) => {
        try {
            setSelectedId(campus._id);
            const response = await apiClient.put('/auth/profile', { campusId: campus._id });

            if (response.status === 200) {
                await refreshUser();
                navigation.replace('Main');
            } else {
                Alert.alert("Error", "Failed to save selection");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Connection Error", "Check your backend server.");
        } finally {
            setSelectedId(null);
        }
    };

    const renderCampusCard = ({ item, index }) => {
        const colors = CAMPUS_COLORS[index % CAMPUS_COLORS.length];
        const iconName = CAMPUS_ICONS[item.name] || 'business';
        const isSelected = selectedId === item._id;

        return (
            <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.85}
                disabled={isSelected}
            >
                <LinearGradient
                    colors={colors}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={iconName} size={32} color="rgba(255,255,255,0.9)" />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardCity}>
                                <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                                {' '}{item.city || 'India'}
                            </Text>
                        </View>
                        {isSelected ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                        )}
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.loadingGradient}
                >
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading campuses...</Text>
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.greeting}>Hey, {dbUser?.fullName?.split(' ')[0] || 'there'}! 👋</Text>
                    <Text style={styles.headerTitle}>Select Your Campus</Text>
                    <Text style={styles.headerSubtitle}>
                        Choose your university to see lost & found items near you
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.listContainer}>
                <FlatList
                    data={campuses}
                    keyExtractor={(item) => item._id}
                    renderItem={renderCampusCard}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    🔍 {campuses.length} campuses available
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5'
    },
    loadingContainer: {
        flex: 1,
    },
    loadingGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 15,
        fontSize: 16,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 25,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerContent: {
        alignItems: 'flex-start',
    },
    greeting: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 22,
    },
    listContainer: {
        flex: 1,
        marginTop: -20,
    },
    list: {
        padding: 20,
        paddingTop: 25,
    },
    card: {
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    cardSelected: {
        opacity: 0.7,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 55,
        height: 55,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    cardCity: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#888',
        fontSize: 14,
    },
});
