import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CoordinatorLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FF3B30', headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: (({ color }) => <Ionicons name="home" size={24} color={color} />) }} />
      <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: (({ color }) => <Ionicons name="add-circle" size={24} color={color} />) }} />
      <Tabs.Screen name="hub" options={{ title: 'Hub', tabBarIcon: (({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (({ color }) => <Ionicons name="person" size={24} color={color} />) }} />
    </Tabs>
  );
}