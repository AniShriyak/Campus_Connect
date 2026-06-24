import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Club, Registration, Event } from '../../src/types';
import { getUserClubs } from '../../src/services/clubService';
import { getUserRegistrations } from '../../src/services/registrationService';
import { getEventById } from '../../src/services/eventService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, logout, switchRole } = useAuthStore();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [registrations, setRegistrations] = useState<(Registration & { eventData?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [userClubs, userRegs] = await Promise.all([
          getUserClubs(user.uid),
          getUserRegistrations(user.uid)
        ]);
        
        // Fetch event titles for registrations
        const regsWithEvents = await Promise.all(
          userRegs.map(async (reg) => {
            const evt = await getEventById(reg.eventId);
            return { ...reg, eventData: evt || undefined };
          })
        );
        
        setClubs(userClubs);
        setRegistrations(regsWithEvents);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleSwitchMode = async () => {
    setSwitching(true);
    await switchRole('coordinator');
    setSwitching(false);
    router.replace('/(coordinator)/' as any);
  };

  if (loading || !profile) return <View style={styles.center}><ActivityIndicator size="large" color="#6B4CE6" /></View>;

  const hasCoordinatorRole = profile.roles.includes('coordinator') || profile.roles.includes('admin');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{profile.fullName}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Current Mode: Student</Text>
          </View>

          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchMode} disabled={switching}>
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.switchButtonText}>{switching ? "Switching..." : "Switch To Coordinator"}</Text>
          </TouchableOpacity>
        </View>

        {/* My Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Registrations</Text>
          {registrations.length === 0 ? (
            <Text style={styles.emptyText}>You haven't registered for any events yet.</Text>
          ) : (
            registrations.map(reg => (
              <TouchableOpacity key={reg.id} style={styles.listItem} onPress={() => router.push(`/ticket/${reg.id}` as any)}>
                <View style={styles.iconCircle}>
                  <Ionicons name="ticket" size={20} color="#6B4CE6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{reg.eventData?.title || 'Unknown Event'}</Text>
                  <Text style={styles.listSubtitle}>Status: {reg.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* My Clubs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Clubs</Text>
          {clubs.length === 0 ? (
            <Text style={styles.emptyText}>You haven't joined any clubs yet.</Text>
          ) : (
            clubs.map(club => (
              <TouchableOpacity key={club.id} style={styles.listItem} onPress={() => router.push(`/club/${club.id}` as any)}>
                <View style={[styles.iconCircle, { backgroundColor: '#f3e5f5' }]}>
                  <Ionicons name="people" size={20} color="#9c27b0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{club.name}</Text>
                  <Text style={styles.listSubtitle}>{club.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Certificates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          {registrations.filter(r => r.certificateUrl).length === 0 ? (
            <Text style={styles.emptyText}>No certificates earned yet.</Text>
          ) : (
            registrations.filter(r => r.certificateUrl).map(reg => (
              <TouchableOpacity key={reg.id} style={styles.listItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
                  <Ionicons name="document-text" size={20} color="#4caf50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{reg.eventData?.title} Certificate</Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#666" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  userInfo: { alignItems: 'center', padding: 20, backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, elevation: 2, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6B4CE6', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold' },
  userEmail: { color: '#666', marginTop: 5 },
  roleBadge: { backgroundColor: '#e9ecef', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 15 },
  roleText: { color: '#333', fontWeight: 'bold', fontSize: 12 },
  switchButton: { flexDirection: 'row', backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginTop: 20, alignItems: 'center' },
  switchButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  listTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  listSubtitle: { color: '#888', fontSize: 12 },
  emptyText: { color: '#888', fontStyle: 'italic', marginLeft: 5 },
  logoutButton: { marginHorizontal: 20, backgroundColor: '#ffebee', padding: 15, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 }
});
