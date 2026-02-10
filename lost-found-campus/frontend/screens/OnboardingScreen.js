import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: 1,
        icon: 'search-circle',
        title: 'Find Lost Items',
        description: 'Quickly search and browse through lost items reported on your campus.',
        color: '#667eea'
    },
    {
        id: 2,
        icon: 'hand-right',
        title: 'Report Found Items',
        description: 'Found something? Post it and help reunite items with their owners.',
        color: '#34c759'
    },
    {
        id: 3,
        icon: 'chatbubbles',
        title: 'Connect & Chat',
        description: 'Chat directly with finders or owners to coordinate item handover.',
        color: '#ff9500'
    },
    {
        id: 4,
        icon: 'star',
        title: 'Earn Karma Points',
        description: 'Get rewarded for helping others. Climb the leaderboard!',
        color: '#764ba2'
    }
];

export default function OnboardingScreen({ onComplete }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = async () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            await AsyncStorage.setItem('onboardingComplete', 'true');
            onComplete();
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('onboardingComplete', 'true');
        onComplete();
    };

    const slide = slides[currentSlide];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[slide.color, slide.color + '99']}
                style={styles.gradient}
            >
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={slide.icon} size={100} color="#fff" />
                    </View>

                    <Text style={styles.title}>{slide.title}</Text>
                    <Text style={styles.description}>{slide.description}</Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.dots}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentSlide === index && styles.activeDot
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextText}>
                            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={slide.color} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1, paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
    skipBtn: { alignSelf: 'flex-end' },
    skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    iconContainer: {
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 40
    },
    title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 20 },
    description: { fontSize: 18, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 28, paddingHorizontal: 20 },
    footer: { alignItems: 'center' },
    dots: { flexDirection: 'row', marginBottom: 30 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 5 },
    activeDot: { backgroundColor: '#fff', width: 30 },
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 40,
        borderRadius: 30
    },
    nextText: { fontSize: 18, fontWeight: '700', color: '#333' }
});
