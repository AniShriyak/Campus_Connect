import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Club, Announcement, Event, UserProfile } from '../../src/types';
import { getClubById, joinClub, getClubMembers } from '../../src/services/clubService';
import { getAnnouncements } from '../../src/services/announcementService';
import { getEventsForClub } from '../../src/services/eventService';

export default function ClubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, activeRole } = useAuthStore();
  
  const [club, setClub] = useState<Club | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'announcements' | 'events' | 'members'>('announcements');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const clubData = await getClubById(id);
      setClub(clubData);
      
      const annData = await getAnnouncements(id).catch(e => { console.error(e); return []; });
      setAnnouncements(annData);

      const evtData = await getEventsForClub(id).catch(e => { console.error(e); return []; });
      setEvents(evtData);
      
      const memberData = await getClubMembers(id).catch(e => { console.error(e); return []; });
      setMembers(memberData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !club || !club.id) return;
    setJoining(true);
    try {
      await joinClub(user.uid, club.id);
      // Refresh
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setJoining(false);
    }
  };

  const isCoordinator = activeRole === 'coordinator' && club?.coordinatorIds.includes(user?.uid || '');

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!club) return <View style={styles.center}><Text>Club not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Image source={{ uri: club.coverImage || 'https://via.placeholder.com/600x200' }} style={styles.cover} />
          <Image source={{ uri: club.logoUrl || 'https://via.placeholder.com/100' }} style={styles.logo} />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>{club.name}</Text>
          <Text style={styles.category}>{club.category}</Text>
          <Text style={styles.description}>{club.description}</Text>
          <Text style={styles.memberCount}>{club.memberCount} Members</Text>

          {activeRole === 'student' && (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin} disabled={joining}>
              <Text style={styles.joinText}>{joining ? "Joining..." : "Join Club"}</Text>
            </TouchableOpacity>
          )}

          {isCoordinator && (
            <TouchableOpacity style={styles.manageButton} onPress={() => router.push(`/club-workspace/${club.id}` as any)}>
              <Text style={styles.manageText}>Manage Club</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {['announcements', 'events', 'members'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab as any)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'announcements' && (
            <View>
              {isCoordinator && (
                 <TouchableOpacity style={styles.createPostBtn} onPress={() => router.push(`/(coordinator)/create?clubId=${club.id}&type=announcement` as any)}>
                   <Text style={styles.createPostText}>+ Create Announcement</Text>
                 </TouchableOpacity>
              )}
              {announcements.map(a => (
                <View key={a.id} style={styles.card}>
                  {a.isPinned && <Text style={styles.pinned}>📌 Pinned</Text>}
                  <Text style={styles.cardText}>{a.content}</Text>
                </View>
              ))}
            </View>
          )}
          {activeTab === 'events' && (
            <View>
              {isCoordinator && (
                 <TouchableOpacity style={styles.createPostBtn} onPress={() => router.push(`/(coordinator)/create?clubId=${club.id}&type=event` as any)}>
                   <Text style={styles.createPostText}>+ Create Event</Text>
                 </TouchableOpacity>
              )}
              {events.map(e => (
                <TouchableOpacity key={e.id} style={styles.card} onPress={() => router.push(`/event/${e.id}` as any)}>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text>{e.date} • {e.venue}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeTab === 'members' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{club.memberCount} Members</Text>
              {members.map(member => (
                <View key={member.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                  <Ionicons name="person-circle-outline" size={32} color="#666" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{member.name}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{member.roles.includes('coordinator') ? 'Coordinator' : 'Student'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'relative', marginBottom: 50 },
  backButton: { position: 'absolute', top: 10, left: 10, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 20 },
  cover: { width: '100%', height: 150 },
  logo: { width: 80, height: 80, borderRadius: 40, position: 'absolute', bottom: -40, left: 20, borderWidth: 3, borderColor: '#fff' },
  infoSection: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold' },
  category: { color: '#6B4CE6', fontWeight: 'bold', marginVertical: 4 },
  description: { color: '#666', marginTop: 8 },
  memberCount: { color: '#888', marginTop: 8, fontSize: 12 },
  joinButton: { backgroundColor: '#6B4CE6', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' },
  joinText: { color: '#fff', fontWeight: 'bold' },
  manageButton: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' },
  manageText: { color: '#fff', fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#6B4CE6' },
  tabText: { color: '#666', fontWeight: 'bold' },
  activeTabText: { color: '#6B4CE6' },
  content: { padding: 15 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  cardText: { color: '#444' },
  pinned: { color: '#FF9500', fontWeight: 'bold', marginBottom: 5 },
  createPostBtn: { backgroundColor: '#e9ecef', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  createPostText: { color: '#333', fontWeight: 'bold' },
});
