import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Alert } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import Auth from './components/pages/auth/auth'
import ForgotPasswordScreen from './components/pages/auth/ForgotPasswordScreen';
import ChangePasswordScreen from './components/pages/auth/ChangePasswordScreen';
import ChatRoomListScreen from './components/pages/screens/ChatRoomListScreen'
import ChatScreen from './components/pages/screens/ChatScreen'
import ContactListScreen from './components/pages/screens/ContactListScreen'
import CreateGroupScreen from './components/pages/screens/CreateGroupScreen';
import AddFriendScreen from './components/pages/screens/AddFriendScreen';
import GroupOptionsScreen from './components/pages/screens/GroupOptionsScreen';
import GroupMembersScreen from './components/pages/screens/GroupMembersScreen';
import AddGroupMembersScreen from './components/pages/screens/AddGroupMembersScreen';
import PersonalScreen from './components/pages/screens/PersonalScreen';
import AccountSettingsScreen from './components/pages/screens/AccountSettingsScreen';
import UserProfileScreen from './components/pages/screens/UserProfileScreen';

const Stack = createStackNavigator();

// Cấu hình deep linking để hỗ trợ cả backend URL và custom scheme
const linking = {
  prefixes: [
    'chatapp://',
    'http://chat.fff3l.click',
    'https://chat.fff3l.click'
  ],
  config: {
    screens: {
      ChangePasswordScreen: {
        path: 'api/auth/verify-reset-password',
        parse: {
          token: (token) => token,
        },
      },
    },
  },
};

const App = () => {
  useEffect(() => {
    // Handle deep links when app is already running
    const handleDeepLink = (event) => {
      console.log('Deep link received:', event.url);

      // Kiểm tra nếu là link reset password từ backend
      if (event.url.includes('verify-reset-password')) {
        try {
          const url = new URL(event.url);
          const token = url.searchParams.get('token');

          if (token) {
            console.log('Token found in deep link:', token.substring(0, 20) + '...');
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
        }
      }
    };

    // Add event listener for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was opened via deep link
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('Initial URL:', initialUrl);
          handleDeepLink({ url: initialUrl });
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    getInitialURL();

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={Auth} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
          <Stack.Screen name="ChatRoomListScreen" component={ChatRoomListScreen} />
          <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen name="ContactListScreen" component={ContactListScreen} />
          <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
          <Stack.Screen name="AddFriendScreen" component={AddFriendScreen} />
          <Stack.Screen name="GroupOptionsScreen" component={GroupOptionsScreen} />
          <Stack.Screen name="GroupMembersScreen" component={GroupMembersScreen} />
          <Stack.Screen name="AddGroupMembersScreen" component={AddGroupMembersScreen} />
          <Stack.Screen name="PersonalScreen" component={PersonalScreen} />
          <Stack.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  )
}

export default App;