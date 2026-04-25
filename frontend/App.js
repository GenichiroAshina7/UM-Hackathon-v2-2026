import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from './src/constants/theme';
import HomeScreen from './src/screens/HomeScreen';
import MoneyScreen from './src/screens/MoneyScreen';
import DebtScreen from './src/screens/DebtScreen';
import BusinessScreen from './src/screens/BusinessScreen';
import AIAdvisorScreen from './src/screens/AIAdvisorScreen';
import AdviceScreen from './src/screens/AdviceScreen';

// Disable native screens on web to prevent blank screen
if (Platform.OS === 'web') {
  try {
    const screens = require('react-native-screens');
    screens.enableScreens(false);
  } catch (e) {}
}

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = {
    Home: '🏠',
    Money: '💰',
    Debt: '⚡',
    Business: '🏪',
    'AI Advisor': '🧠',
    Advice: '📝',
  };
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              paddingBottom: 4,
              paddingTop: 4,
              height: 56,
            },
            tabBarLabelStyle: {
              fontSize: 9,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Money" component={MoneyScreen} />
          <Tab.Screen name="Debt" component={DebtScreen} />
          <Tab.Screen name="Business" component={BusinessScreen} />
          <Tab.Screen name="AI Advisor" component={AIAdvisorScreen} options={{ tabBarLabel: 'AI Advisor' }} />
          <Tab.Screen name="Advice" component={AdviceScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, opacity: 0.5 },
  iconFocused: { opacity: 1 },
});
