import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: (({ color }) => <Ionicons name="home" size={24} color={color} />) }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: (({ color }) => <Ionicons name="compass" size={24} color={color} />) }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: (({ color }) => <Ionicons name="search" size={24} color={color} />) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (({ color }) => <Ionicons name="person" size={24} color={color} />) }} />
    </Tabs>
  );
}