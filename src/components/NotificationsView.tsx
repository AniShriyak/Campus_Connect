import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { Notification } from '../types';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

export default function NotificationsView() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'event_reminder': return <Ionicons name="calendar" size={24} color="#6B4CE6" />;
      case 'registration_update': return <Ionicons name="ticket" size={24} color="#4CAF50" />;
      case 'new_announcement': return <Ionicons name="megaphone" size={24} color="#FF9800" />;
      default: return <Ionicons name="notifications" size={24} color="#666" />;
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6B4CE6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id as string}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => !item.isRead && handleMarkAsRead(item.id as string)}
            >
              <View style={[styles.iconBox, !item.isRead && styles.unreadIconBox]}>
                {renderIcon(item.type)}
              </View>
              <View style={styles.content}>
                <Text style={[styles.message, !item.isRead && styles.unreadMessage]}>{item.message}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  markAllText: { color: '#6B4CE6', fontWeight: 'bold' },
  emptyText: { color: '#888', marginTop: 15, fontSize: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
  unreadCard: { backgroundColor: '#f0f4ff', borderColor: '#e0eaff', borderWidth: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  unreadIconBox: { backgroundColor: '#fff' },
  content: { flex: 1 },
  message: { color: '#666', fontSize: 15, lineHeight: 22 },
  unreadMessage: { color: '#333', fontWeight: '600' },
  time: { color: '#aaa', fontSize: 12, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B4CE6', marginLeft: 10 }
});
