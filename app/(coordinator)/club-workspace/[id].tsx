import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Club, Event, Announcement, UserProfile } from '../../../src/types';
import { getClubById, deleteClub, getClubMembers } from '../../../src/services/clubService';
import { getEventsForClub } from '../../../src/services/eventService';
import { getAnnouncements, deleteAnnouncement, togglePinAnnouncement } from '../../../src/services/announcementService';

export default function ClubWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'announcements' | 'events' | 'members' | 'analytics'>('events');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      const clubData = await getClubById(id);
      setClub(clubData);
    } catch (e) {
      console.error("Error fetching club:", e);
    }

    try {
      const evtData = await getEventsForClub(id);
      setEvents(evtData);
    } catch (e) {
      console.error("Error fetching events:", e);
    }

    try {
      const annData = await getAnnouncements(id);
      setAnnouncements(annData);
    } catch (e) {
      console.error("Error fetching announcements:", e);
    }
    
    try {
      const memberData = await getClubMembers(id);
      setMembers(memberData);
    } catch (e) {
      console.error("Error fetching members:", e);
    }
    
    setLoading(false);
  };

  const handleDeleteAnnounce = async (annId: string) => {
    if (!id) return;
    await deleteAnnouncement(id, annId);
    await loadData();
  };

  const handleTogglePin = async (annId: string, currentPin: boolean) => {
    if (!id) return;
    await togglePinAnnouncement(id, annId, !currentPin);
    await loadData();
  };

  const handleDeleteClub = () => {
    Alert.alert(
      "Delete Club",
      `Are you sure you want to delete ${club?.name}? This action cannot be undone and will permanently delete the club.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (id) await deleteClub(id);
              router.replace('/(coordinator)/' as any);
            } catch (e: any) {
              Alert.alert("Error", e.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF3B30" /></View>;
  if (!club) return <View style={styles.center}><Text>Club not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{club.name} Workspace</Text>
      </View>

      <View style={styles.tabRow}>
        {['events', 'announcements', 'members', 'analytics'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab as any)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'events' && (
          <View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(coordinator)/create?type=event&clubId=${club.id}` as any)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>New Event</Text>
            </TouchableOpacity>
            
            {events.length === 0 ? <Text style={styles.emptyText}>No events managed.</Text> : events.map(evt => (
              <TouchableOpacity key={evt.id} style={styles.card} onPress={() => router.push(`/event-management/${evt.id}` as any)}>
                <Text style={styles.cardTitle}>{evt.title}</Text>
                <Text style={styles.cardSub}>{evt.date} • {evt.registeredCount}/{evt.capacity} Registered</Text>
                <Ionicons name="settings-outline" size={20} color="#666" style={styles.cardIcon} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'announcements' && (
          <View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(coordinator)/create?type=announcement&clubId=${club.id}` as any)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>New Announcement</Text>
            </TouchableOpacity>
            
            {announcements.length === 0 ? <Text style={styles.emptyText}>No announcements.</Text> : announcements.map(ann => (
              <View key={ann.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{ann.isPinned ? '📌 ' : ''}Announcement</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleTogglePin(ann.id as string, ann.isPinned)}>
                      <Ionicons name={ann.isPinned ? "pin" : "pin-outline"} size={20} color="#666" style={{ marginRight: 15 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAnnounce(ann.id as string)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.cardContent}>{ann.content}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Members: {club.memberCount}</Text>
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

        {activeTab === 'analytics' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Club Analytics Overview</Text>
              <Text style={styles.cardSub}>Total Events: {events.length}</Text>
              <Text style={styles.cardSub}>Total Members: {club.memberCount}</Text>
            </View>
            
            <View style={[styles.card, { borderColor: '#FF3B30', borderWidth: 1 }]}>
              <Text style={[styles.cardTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
              <Text style={styles.cardSub}>Permanently delete this club and remove it from the platform.</Text>
              <TouchableOpacity style={styles.deleteClubBtn} onPress={handleDeleteClub}>
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.deleteClubBtnText}>Delete Club</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#FF3B30' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#FF3B30' },
  content: { padding: 20 },
  actionBtn: { flexDirection: 'row', backgroundColor: '#FF3B30', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  emptyText: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 1, marginBottom: 15, position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardActions: { flexDirection: 'row' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  cardSub: { color: '#666', fontSize: 14, marginBottom: 5 },
  cardContent: { color: '#333' },
  cardIcon: { position: 'absolute', right: 15, top: 20 },
  deleteClubBtn: { flexDirection: 'row', backgroundColor: '#FF3B30', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  deleteClubBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 }
});
