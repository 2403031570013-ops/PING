import React, { useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import apiClient from './config/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'; // NEW
import CampusSelectScreen from './screens/CampusSelectScreen';
import HomeScreen from './screens/HomeScreen';
import PostItemScreen from './screens/PostItemScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import ChatScreen from './screens/ChatScreen';
import AdminScreen from './screens/AdminScreen';
import AdvancedAdminDashboard from './screens/AdvancedAdminDashboard';
import InboxScreen from './screens/InboxScreen';
import ProfileScreen from './screens/ProfileScreen';
import ClaimsScreen from './screens/ClaimsScreen';
import MyItemsScreen from './screens/MyItemsScreen';
import SecurityDeskScreen from './screens/security_mode/SecurityDeskScreen';
import MapScreen from './screens/MapScreen';

import HistoryScreen from './screens/HistoryScreen';
import CallHistoryScreen from './screens/CallHistoryScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import BlockedUsersScreen from './screens/BlockedUsersScreen';
import MyReportsScreen from './screens/MyReportsScreen';
import CallOverlay from './components/CallOverlay';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return;
  }
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log("Error getting push token", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

function MainTabs() {
  const { theme } = useTheme();
  const { unreadMsgs, unreadNotifs, dbUser } = useUser();
  const isAdmin = dbUser?.role === 'admin';
  const isStaff = dbUser?.role === 'staff';

  const tabBarOptions = {
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: 'gray',
    tabBarStyle: {
      backgroundColor: theme.card,
      borderTopColor: theme.border,
      height: Platform.OS === 'ios' ? 90 : 70,
      paddingBottom: Platform.OS === 'ios' ? 30 : 12,
      paddingTop: 12
    },
    headerStyle: {
      backgroundColor: theme.card,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    headerTitleStyle: {
      fontWeight: '800',
      color: theme.text,
      fontSize: 17
    }
  };

  // ── ADMIN TABS ──
  if (isAdmin) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'Reports') iconName = focused ? 'flag' : 'flag-outline';
            else if (route.name === 'Inbox') iconName = focused ? 'mail' : 'mail-outline';
            else if (route.name === 'SecurityDesk') iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          ...tabBarOptions
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={AdvancedAdminDashboard}
          options={{ title: '🏛️ Admin Dashboard' }}
        />
        <Tab.Screen
          name="Reports"
          component={AdminScreen}
          options={{ title: 'Report Moderation' }}
        />
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            title: 'Messages',
            tabBarBadge: unreadMsgs > 0 ? unreadMsgs : null,
            tabBarBadgeStyle: { backgroundColor: theme.primary, color: '#fff', fontSize: 10 }
          }}
        />
        <Tab.Screen
          name="SecurityDesk"
          component={SecurityDeskScreen}
          options={{ title: 'Security Desk', headerShown: false }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'My Account',
            tabBarBadge: unreadNotifs > 0 ? (unreadNotifs > 9 ? '9+' : unreadNotifs) : null,
            tabBarBadgeStyle: { backgroundColor: '#ef4444', color: '#fff', fontSize: 10 }
          }}
        />
      </Tab.Navigator>
    );
  }

  // ── STAFF TABS ──
  if (isStaff) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'SecurityDesk') iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
            else if (route.name === 'Browse') iconName = focused ? 'search' : 'search-outline';
            else if (route.name === 'Inbox') iconName = focused ? 'mail' : 'mail-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          ...tabBarOptions
        })}
      >
        <Tab.Screen
          name="SecurityDesk"
          component={SecurityDeskScreen}
          options={{ title: '🛡️ Security Desk', headerShown: false }}
        />
        <Tab.Screen
          name="Browse"
          component={HomeScreen}
          options={{ title: 'Lost & Found' }}
        />
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            title: 'Messages',
            tabBarBadge: unreadMsgs > 0 ? unreadMsgs : null,
            tabBarBadgeStyle: { backgroundColor: theme.primary, color: '#fff', fontSize: 10 }
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'My Account',
            tabBarBadge: unreadNotifs > 0 ? (unreadNotifs > 9 ? '9+' : unreadNotifs) : null,
            tabBarBadgeStyle: { backgroundColor: '#ef4444', color: '#fff', fontSize: 10 }
          }}
        />
      </Tab.Navigator>
    );
  }

  // ── STUDENT TABS (Default) ──
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Browse') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Inbox') iconName = focused ? 'mail' : 'mail-outline';
          else if (route.name === 'Calls') iconName = focused ? 'call' : 'call-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        ...tabBarOptions
      })}
    >
      <Tab.Screen
        name="Browse"
        component={HomeScreen}
        options={{ title: 'Lost & Found' }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          title: 'My Chats',
          tabBarBadge: unreadMsgs > 0 ? unreadMsgs : null,
          tabBarBadgeStyle: { backgroundColor: theme.primary, color: '#fff', fontSize: 10 }
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallHistoryScreen}
        options={{ title: 'Calls' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Account',
          tabBarBadge: unreadNotifs > 0 ? (unreadNotifs > 9 ? '9+' : unreadNotifs) : null,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', color: '#fff', fontSize: 10 }
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigation() {
  const { dbUser, loading } = useUser();
  const [isFirstLaunch, setIsFirstLaunch] = useState(Platform.OS === 'web' ? false : null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('onboardingComplete');
        // 🚀 BYPASS ONBOARDING FOR WEB AS REQUESTED
        if (Platform.OS === 'web') {
          setIsFirstLaunch(false);
        } else {
          setIsFirstLaunch(value === null);
        }
      } catch (e) {
        setIsFirstLaunch(false);
      }
    };
    checkOnboarding();

    // Safety timeout: if after 1 sec we are still null, force state to unblock UI
    const timer = setTimeout(() => {
      if (isFirstLaunch === null) {
        // Skip onboarding on web, show it on mobile if needed
        setIsFirstLaunch(Platform.OS !== 'web');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isFirstLaunch]);

  useEffect(() => {
    if (dbUser) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          apiClient.post('/auth/push-token', { pushToken: token }).catch(err => {
            console.log("Error saving push token to server", err);
          });
        }
      });
    }
  }, [dbUser]);

  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Loading CampusGov...</Text>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isFirstLaunch && !dbUser && Platform.OS !== 'web' ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {props => <OnboardingScreen {...props} onComplete={() => setIsFirstLaunch(false)} />}
          </Stack.Screen>
        ) : null}

        {!dbUser ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            {!dbUser.campusId && (
              <Stack.Screen name="CampusSelect" component={CampusSelectScreen} options={{ title: 'Select Campus' }} />
            )}

            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

            <Stack.Screen name="PostItem" component={PostItemScreen} options={{ title: 'Post New Item' }} />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            <Stack.Screen name="Claims" component={ClaimsScreen} options={{ title: 'Handover Requests' }} />
            <Stack.Screen name="MyItems" component={MyItemsScreen} options={{ title: 'My Posts' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Resolution History' }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ headerShown: false }} />

            {(dbUser.role === 'admin' || dbUser.role === 'staff') && (
              <>
                <Stack.Screen name="SecurityDeskStack" component={SecurityDeskScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AdminStack" component={AdminScreen} options={{ title: 'Report Moderation' }} />
                <Stack.Screen name="AdvancedAdminStack" component={AdvancedAdminDashboard} options={{ title: 'University Management Console' }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.log('SW failed:', err));
      });
    }
  }, []);

  return (
    <UserProvider>
      <ThemeProvider>
        <RootNavigation />
        <CallOverlay />
      </ThemeProvider>
    </UserProvider>
  );
}
