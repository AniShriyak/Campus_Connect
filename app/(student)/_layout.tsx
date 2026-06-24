import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6B4CE6', headerShown: false }}>
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: (({ color }) => <Ionicons name="compass" size={24} color={color} />) }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: (({ color }) => <Ionicons name="notifications" size={24} color={color} />) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (({ color }) => <Ionicons name="person" size={24} color={color} />) }} />
    </Tabs>
  );
}
