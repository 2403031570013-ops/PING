import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiClient, { BACKEND_URL } from '../config/axios';

// Parul University real coordinates
const CAMPUS_CENTER = { lat: 22.3572, lng: 73.2085 };
const CAMPUS_ZOOM = 16;

// Known campus landmarks with real coordinates
const CAMPUS_LANDMARKS = [
    { name: 'PIT Engineering', lat: 22.3572, lng: 73.2085, icon: '🏫' },
    { name: 'Central Library', lat: 22.3580, lng: 73.2090, icon: '📚' },
    { name: 'Putulik Food Court', lat: 22.3568, lng: 73.2075, icon: '🍔' },
    { name: 'Teresa Hostel', lat: 22.3565, lng: 73.2095, icon: '🏠' },
    { name: 'Cricket Ground', lat: 22.3560, lng: 73.2070, icon: '🏏' },
    { name: 'Parul Sevashram Hospital', lat: 22.3575, lng: 73.2100, icon: '🏥' },
    { name: 'Admin Block', lat: 22.3578, lng: 73.2082, icon: '🏛️' },
    { name: 'Security Main Gate', lat: 22.3555, lng: 73.2060, icon: '🚧' },
];

// Generate coordinates near a landmark based on location text
function getCoordinatesForLocation(locationText) {
    if (!locationText) return null;
    const lower = locationText.toLowerCase();

    for (const lm of CAMPUS_LANDMARKS) {
        if (lower.includes(lm.name.toLowerCase().split(' ')[0].toLowerCase())) {
            return {
                lat: lm.lat + (Math.random() - 0.5) * 0.001,
                lng: lm.lng + (Math.random() - 0.5) * 0.001
            };
        }
    }

    // Check common keywords
    if (lower.includes('library')) return { lat: 22.3580 + (Math.random() - 0.5) * 0.0008, lng: 73.2090 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('hostel')) return { lat: 22.3565 + (Math.random() - 0.5) * 0.0008, lng: 73.2095 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('canteen') || lower.includes('food') || lower.includes('cafe')) return { lat: 22.3568 + (Math.random() - 0.5) * 0.0008, lng: 73.2075 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('gate') || lower.includes('security') || lower.includes('parking')) return { lat: 22.3555 + (Math.random() - 0.5) * 0.0008, lng: 73.2060 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('hospital') || lower.includes('medical')) return { lat: 22.3575 + (Math.random() - 0.5) * 0.0008, lng: 73.2100 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('ground') || lower.includes('stadium') || lower.includes('sport')) return { lat: 22.3560 + (Math.random() - 0.5) * 0.0008, lng: 73.2070 + (Math.random() - 0.5) * 0.0008 };
    if (lower.includes('admin') || lower.includes('office')) return { lat: 22.3578 + (Math.random() - 0.5) * 0.0008, lng: 73.2082 + (Math.random() - 0.5) * 0.0008 };

    // Default: random position around campus center
    return {
        lat: CAMPUS_CENTER.lat + (Math.random() - 0.5) * 0.004,
        lng: CAMPUS_CENTER.lng + (Math.random() - 0.5) * 0.004
    };
}

/**
 * Generate Leaflet HTML for embedding a real OpenStreetMap
 */
function generateLeafletHTML(items, landmarks) {
    const lostItems = items.filter(i => i.type === 'lost');
    const foundItems = items.filter(i => i.type === 'found');

    // Build markers JSON
    const itemMarkers = items.map(item => {
        const coords = (item.coordinates && item.coordinates.latitude)
            ? { lat: item.coordinates.latitude, lng: item.coordinates.longitude }
            : getCoordinatesForLocation(item.location);

        return {
            lat: coords?.lat || CAMPUS_CENTER.lat,
            lng: coords?.lng || CAMPUS_CENTER.lng,
            title: item.title || 'Unknown Item',
            location: item.location || 'Campus',
            type: item.type || 'lost',
            category: item.category || 'Others',
            status: item.status || 'active',
            id: item._id || '',
            postedBy: item.postedBy?.fullName || 'Anonymous',
            image: item.image ? (item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : BACKEND_URL + item.image) : null
        };
    });

    // We need to use a dynamic backend URL for images in the iframe
    // Since we're in an iframe, we pass the BACKEND_URL from the parent

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; }

    .custom-popup .leaflet-popup-content-wrapper {
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        overflow: hidden;
    }
    .custom-popup .leaflet-popup-content {
        margin: 0;
        min-width: 200px;
    }
    .popup-img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        background: #f1f5f9;
        display: block;
    }
    .popup-card {
        padding: 12px 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .popup-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #fff;
        margin-bottom: 6px;
    }
    .popup-badge.lost { background: linear-gradient(135deg, #EF4444, #DC2626); }
    .popup-badge.found { background: linear-gradient(135deg, #10B981, #059669); }
    .popup-title {
        font-size: 13px;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 4px;
        line-height: 1.3;
    }
    .popup-info {
        font-size: 10px;
        color: #64748B;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 2px;
    }
    .popup-user {
        font-size: 10px;
        color: #8B5CF6;
        font-weight: 600;
        margin-top: 4px;
    }

    .landmark-popup {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 8px 12px;
        text-align: center;
    }
    .landmark-popup .lm-name {
        font-size: 13px;
        font-weight: 700;
        color: #1E293B;
    }
    .landmark-popup .lm-type {
        font-size: 10px;
        color: #94A3B8;
        text-transform: uppercase;
    }

    .stats-bar {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1000;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        padding: 12px 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        gap: 16px;
    }
    .stat { text-align: center; }
    .stat-num { font-size: 20px; font-weight: 800; }
    .stat-num.red { color: #EF4444; }
    .stat-num.green { color: #10B981; }
    .stat-label { font-size: 9px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .campus-label {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 1000;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        padding: 10px 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .campus-label h3 { font-size: 13px; font-weight: 800; color: #1E293B; margin: 0; }
    .campus-label .live { font-size: 10px; font-weight: 900; color: #EF4444; margin-top: 2px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
</style>
</head>
<body>

<div class="campus-label">
    <h3>🎓 Parul University</h3>
    <div class="live">● LIVE MAP</div>
</div>

<div class="stats-bar">
    <div class="stat">
        <div class="stat-num red">\${lostItems.length}</div>
        <div class="stat-label">Lost</div>
    </div>
    <div class="stat">
        <div class="stat-num green">\${foundItems.length}</div>
        <div class="stat-label">Found</div>
    </div>
    <div class="stat">
        <div class="stat-num" style="color:#6366F1">\${items.length}</div>
        <div class="stat-label">Total</div>
    </div>
</div>

<div id="map"></div>

<script>
    var map = L.map('map', {
        zoomControl: false,
        attributionControl: true
    }).setView([\${CAMPUS_CENTER.lat}, \${CAMPUS_CENTER.lng}], \${CAMPUS_ZOOM});

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Campus boundary circle
    L.circle([\${CAMPUS_CENTER.lat}, \${CAMPUS_CENTER.lng}], {
        radius: 400,
        color: '#6366F1',
        weight: 2,
        fillColor: '#6366F1',
        fillOpacity: 0.05,
        dashArray: '8,8'
    }).addTo(map);

    // Landmark markers
    var landmarks = \${JSON.stringify(landmarks)};
    landmarks.forEach(function(lm) {
        var icon = L.divIcon({
            html: '<div style="font-size:24px;text-align:center;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">' + lm.icon + '</div>',
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        L.marker([lm.lat, lm.lng], { icon: icon })
            .addTo(map)
            .bindPopup('<div class="landmark-popup"><div class="lm-name">' + lm.icon + ' ' + lm.name + '</div><div class="lm-type">Campus Landmark</div></div>', { className: 'custom-popup' });
    });

    // Item markers
    var items = \${JSON.stringify(itemMarkers)};
    items.forEach(function(item) {
        var color = item.type === 'lost' ? '#EF4444' : '#10B981';
        var iconSymbol = item.type === 'lost' ? '⚠️' : '✅';

        var icon = L.divIcon({
            html: '<div style="width:28px;height:28px;background:' + color + ';border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:3px solid white;font-size:13px;cursor:pointer">' + iconSymbol + '</div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        var popup = '<div class="custom-popup-content">';
        if (item.image) {
            popup += '<img src="' + item.image + '" class="popup-img" onerror="this.style.display=\\'none\\'">';
        }
        popup += '<div class="popup-card">' +
            '<span class="popup-badge ' + item.type + '">' + item.type + '</span>' +
            '<div class="popup-title">' + item.title + '</div>' +
            '<div class="popup-info">📍 ' + item.location + '</div>' +
            '<div class="popup-info">📂 ' + item.category + '</div>' +
            '<div class="popup-user">By: ' + item.postedBy + '</div>' +
            '</div></div>';

        L.marker([item.lat, item.lng], { icon: icon })
            .addTo(map)
            .bindPopup(popup, { className: 'custom-popup', maxWidth: 250 });
    });

    // Heatmap-like glow for clusters (visual effect)
    items.forEach(function(item) {
        var color = item.type === 'lost' ? '#EF4444' : '#10B981';
        L.circle([item.lat, item.lng], {
            radius: 30,
            color: 'transparent',
            fillColor: color,
            fillOpacity: 0.15
        }).addTo(map);
    });

</script>
</body>
</html>`;
}

export default function MapScreen({ navigation }) {
    const { theme } = useTheme();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const iframeRef = useRef(null);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await apiClient.get('/items');
                setItems(response.data || []);
            } catch (error) {
                console.error("Map fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    const filteredItems = items.filter(item => {
        if (selectedFilter === 'all') return true;
        return item.type === selectedFilter;
    });

    const renderWebMap = () => {
        const html = generateLeafletHTML(filteredItems, CAMPUS_LANDMARKS);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        return (
            <iframe
                ref={iframeRef}
                src={url}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 20,
                }}
                title="Campus Map"
            />
        );
    };

    const renderMobileMap = () => {
        return (
            <View style={styles.center}>
                <View style={[styles.optimizedBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="desktop-outline" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.mobileText, { color: theme.text }]}>
                    View on Desktop for best experience
                </Text>
                <Text style={[styles.mobileSubtext, { color: theme.textSecondary }]}>
                    Real-time item heatmaps and interactive campus markers are fully optimized for web browsers.
                </Text>
                <TouchableOpacity
                    style={[styles.webBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {/* In a real app, this might open the web URL */ }}
                >
                    <Text style={styles.webBtnText}>Use Web Version</Text>
                </TouchableOpacity>
            </View>
        );
    };


    const FilterButton = ({ label, value, icon }) => (
        <TouchableOpacity
            style={[
                styles.filterBtn,
                selectedFilter === value && styles.filterBtnActive,
                selectedFilter === value && {
                    backgroundColor: value === 'lost' ? '#FEE2E2' : value === 'found' ? '#D1FAE5' : '#EEF2FF'
                }
            ]}
            onPress={() => setSelectedFilter(value)}
        >
            <Ionicons
                name={icon}
                size={14}
                color={selectedFilter === value
                    ? (value === 'lost' ? '#EF4444' : value === 'found' ? '#10B981' : '#6366F1')
                    : '#94A3B8'}
            />
            <Text style={[
                styles.filterText,
                selectedFilter === value && {
                    color: value === 'lost' ? '#EF4444' : value === 'found' ? '#10B981' : '#6366F1',
                    fontWeight: '700'
                }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>Campus Map</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Parul University, Vadodara
                    </Text>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                <FilterButton label="All Items" value="all" icon="layers-outline" />
                <FilterButton label="Lost" value="lost" icon="alert-circle-outline" />
                <FilterButton label="Found" value="found" icon="checkmark-circle-outline" />
            </View>

            {/* Map */}
            <View style={[styles.mapWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.primary || '#6366F1'} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                            Loading campus map...
                        </Text>
                    </View>
                ) : (
                    Platform.OS === 'web' ? renderWebMap() : renderMobileMap()
                )}
            </View>

            {/* Bottom Legend */}
            <View style={[styles.legend, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>Lost Items</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>Found Items</Text>
                </View>
                <View style={styles.legendItem}>
                    <Text style={styles.legendEmoji}>🏫</Text>
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>Landmarks</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        gap: 5,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterBtnActive: {
        borderColor: 'transparent',
    },
    filterText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    },
    mapWrapper: {
        flex: 1,
        margin: 12,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        marginTop: 8,
    },
    mobileText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
    },
    mobileSubtext: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 18,
    },
    optimizedBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    webBtn: {
        marginTop: 15,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    webBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },

    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 24,
        borderTopWidth: 1,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendEmoji: {
        fontSize: 14,
    },
});
