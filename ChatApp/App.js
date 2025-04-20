import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Auth from './components/pages/auth/auth'
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


const Stack = createStackNavigator();
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={Auth} />
        <Stack.Screen name="ChatRoomListScreen" component={ChatRoomListScreen} />
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
  )
}

export default App;