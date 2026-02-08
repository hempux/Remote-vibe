import React from 'react';
import { useWindowDimensions } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionDashboardScreen from '../screens/SessionDashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  Sessions: undefined;
  Settings: undefined;
};

export type SessionsStackParamList = {
  SessionsList: undefined;
  SessionDashboard: { sessionId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<SessionsStackParamList>();

const NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: 'transparent',
    primary: colors.electricBlue,
  },
};

function SessionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SessionsList" component={SessionsListScreen} />
      <Stack.Screen name="SessionDashboard" component={SessionDashboardScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  return (
    <NavigationContainer theme={NavigationTheme}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Sessions" component={SessionsStack} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
