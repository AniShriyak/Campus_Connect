import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Club, Event } from '../../src/types';
import { getClubs, getUserClubs, joinClub } from '../../src/services/clubService';
import { getAllUpcomingEvents } from '../../src/services/eventService';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Tech', 'Music', 'Art', 'Sports', 'Literature', 'Cultural'];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allClubs, userClubs, allEvents] = await Promise.all([
        getClubs(),
        getUserClubs(user.uid),
        getAllUpcomingEvents()
      ]);
      setClubs(allClubs);
      setMyClubs(userClubs);
      setEvents(allEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!user) return;
    try {
      await joinClub(user.uid, clubId);
      await loadData(); // Reload to reflect changes
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredClubs = clubs.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6B4CE6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs or events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Upcoming Events */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {events.map(event => (
                <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => router.push(`/event/${event.id}` as any)}>
                  <Image source={event.coverImage || 'https://via.placeholder.com/400x200'} style={styles.eventImage} />
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.eventMeta}>{event.date} • {event.venue}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* My Clubs */}
        {myClubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Clubs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {myClubs.map(club => (
                <TouchableOpacity key={club.id} style={styles.myClubCard} onPress={() => router.push(`/club/${club.id}` as any)}>
                  <Image source={club.logoUrl || 'https://via.placeholder.com/100'} style={styles.myClubLogo} />
                  <Text style={styles.myClubName} numberOfLines={1}>{club.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 20 }}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)} style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}>
              <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* All Clubs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Clubs</Text>
          {filteredClubs.map(club => {
            const isMember = myClubs.some(mc => mc.id === club.id);
            return (
              <TouchableOpacity key={club.id} style={styles.clubRow} onPress={() => router.push(`/club/${club.id}` as any)}>
                <Image source={club.logoUrl || 'https://via.placeholder.com/100'} style={styles.clubRowLogo} />
                <View style={styles.clubRowInfo}>
                  <Text style={styles.clubRowName}>{club.name}</Text>
                  <Text style={styles.clubRowCategory}>{club.category} • {club.memberCount} members</Text>
                </View>
                {!isMember ? (
                  <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinClub(club.id as string)}>
                    <Text style={styles.joinBtnText}>Join</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedBadgeText}>Joined</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', backgroundColor: '#eee', marginHorizontal: 20, padding: 12, borderRadius: 10, marginBottom: 20, alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 16 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  eventCard: { width: width * 0.7, backgroundColor: '#fff', borderRadius: 12, marginRight: 15, overflow: 'hidden', elevation: 2 },
  eventImage: { width: '100%', height: 120 },
  eventDetails: { padding: 12 },
  eventTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  eventMeta: { color: '#666', fontSize: 12 },
  myClubCard: { alignItems: 'center', marginRight: 20, width: 80 },
  myClubLogo: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#6B4CE6', marginBottom: 8 },
  myClubName: { fontSize: 12, textAlign: 'center', color: '#333' },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 20, marginRight: 10 },
  catPillActive: { backgroundColor: '#6B4CE6' },
  catText: { color: '#666', fontWeight: 'bold' },
  catTextActive: { color: '#fff' },
  clubRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  clubRowLogo: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  clubRowInfo: { flex: 1 },
  clubRowName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  clubRowCategory: { color: '#888', fontSize: 12 },
  joinBtn: { backgroundColor: '#6B4CE6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  joinedBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  joinedBadgeText: { color: '#34C759', fontWeight: 'bold', fontSize: 12 }
});
