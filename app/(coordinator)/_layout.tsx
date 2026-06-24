import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CoordinatorLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FF3B30', headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Clubs', tabBarIcon: (({ color }) => <Ionicons name="business" size={24} color={color} />) }} />
      <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: (({ color }) => <Ionicons name="add-circle" size={24} color={color} />) }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: (({ color }) => <Ionicons name="notifications" size={24} color={color} />) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (({ color }) => <Ionicons name="person" size={24} color={color} />) }} />
      
      {/* Hide workspace/management screens from tabs */}
      <Tabs.Screen name="club-workspace/[id]" options={{ href: null }} />
      <Tabs.Screen name="event-management/[id]" options={{ href: null }} />
    </Tabs>
  );
}
