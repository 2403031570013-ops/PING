import React, { useEffect } from 'react';
import { Platform } from 'react-native';
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

import HistoryScreen from './screens/HistoryScreen';
import CallHistoryScreen from './screens/CallHistoryScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
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

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Browse') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Inbox') iconName = focused ? 'mail' : 'mail-outline';
          else if (route.name === 'Calls') iconName = focused ? 'call' : 'call-outline';
          else if (route.name === 'Reports') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
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

      {dbUser?.role === 'admin' && (
        <Tab.Screen
          name="Reports"
          component={AdminScreen}
          options={{
            title: 'Reports',
            tabBarLabel: 'Reports'
          }}
        />
      )}

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
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('onboardingComplete').then(value => {
      // If value is null, user hasn't seen onboarding -> isFirstLaunch = true
      // If value is 'true', user has seen it -> isFirstLaunch = false
      setIsFirstLaunch(value === null);
    });
  }, []);

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

  if (loading || isFirstLaunch === null) return null; // Splash screen could go here

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isFirstLaunch ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {props => <OnboardingScreen {...props} onComplete={() => setIsFirstLaunch(false)} />}
          </Stack.Screen>
        ) : null}

        {!dbUser ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
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

            {(dbUser.role === 'admin' || dbUser.role === 'staff') && (
              <>
                <Stack.Screen name="SecurityDesk" component={SecurityDeskScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Report Moderation' }} />
                <Stack.Screen name="AdvancedAdmin" component={AdvancedAdminDashboard} options={{ title: 'University Management Console' }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <RootNavigation />
        <CallOverlay />
      </ThemeProvider>
    </UserProvider>
  );
}
