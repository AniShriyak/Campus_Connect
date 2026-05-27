// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  coverImage?: string;
  logoUrl?: string;
  memberCount: number;
}

interface Event {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  entryFee: number;
  coverImage?: string;
}

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { profile, setProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Arts'];

  // Fetch all clubs
  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery<Club[]>({
    queryKey: ['clubs'],
    queryFn: async () => {
      const q = query(collection(db, 'clubs'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
    }
  });

  // Fetch all events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const q = query(collection(db, 'events'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    }
  });

  // Join/Leave club mutation
  const toggleJoinClubMutation = useMutation({
    mutationFn: async ({ clubId, isJoined }: { clubId: string; isJoined: boolean }) => {
      if (!auth.currentUser) throw new Error('Not authenticated');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const clubRef = doc(db, 'clubs', clubId);
      
      if (isJoined) {
        await updateDoc(userRef, {
          joinedClubs: arrayRemove(clubId)
        });
        // Decrement club member count
        const clubDoc = await getDoc(clubRef);
        const currentCount = clubDoc.data()?.memberCount || 0;
        await updateDoc(clubRef, {
          memberCount: Math.max(0, currentCount - 1)
        });
      } else {
        await updateDoc(userRef, {
          joinedClubs: arrayUnion(clubId)
        });
        // Increment club member count
        const clubDoc = await getDoc(clubRef);
        const currentCount = clubDoc.data()?.memberCount || 0;
        await updateDoc(clubRef, {
          memberCount: currentCount + 1
        });
      }
      
      // Return updated interests/profile
      const updatedUserDoc = await getDoc(userRef);
      return updatedUserDoc.data();
    },
    onSuccess: (data) => {
      if (data) {
        setProfile(data as any);
      }
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update club membership.');
    }
  });

  const handleJoinPress = (clubId: string) => {
    const isJoined = profile?.joinedClubs?.includes(clubId) || false;
    toggleJoinClubMutation.mutate({ clubId, isJoined });
  };

  // Filter logic
  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          club.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || club.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.clubName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Discover clubs and events on campus</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs or events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillSelected
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextSelected
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Events Section */}
        {filteredEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.8 + 16} decelerationRate="fast">
              {filteredEvents.map(event => (
                <View key={event.id} style={styles.eventCard}>
                  <Image
                    source={event.coverImage || 'https://picsum.photos/400/200'}
                    style={styles.eventImage}
                    contentFit="cover"
                  />
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventClub}>{event.clubName}</Text>
                    <Text style={styles.eventTitleText}>{event.title}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="calendar-outline" size={14} color="#666" />
                      <Text style={styles.eventMetaText}>{event.date}</Text>
                    </View>
                    <View style={styles.eventMeta}>
                      <Ionicons name="location-outline" size={14} color="#666" />
                      <Text style={styles.eventMetaText}>{event.venue}</Text>
                    </View>
                    <View style={styles.eventBottom}>
                      <Text style={styles.eventFee}>
                        {event.entryFee === 0 ? 'Free' : `₹${event.entryFee}`}
                      </Text>
                      <TouchableOpacity 
                        style={styles.viewEventButton}
                        onPress={() => router.push({ pathname: '/(student)/event-details', params: { eventId: event.id } })}
                      >
                        <Text style={styles.viewEventButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Clubs Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Campus Clubs</Text>
          {isLoadingClubs ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          ) : filteredClubs.length === 0 ? (
            <Text style={styles.emptyText}>No clubs found matching your search.</Text>
          ) : (
            filteredClubs.map(club => {
              const isJoined = profile?.joinedClubs?.includes(club.id) || false;
              return (
                <View key={club.id} style={styles.clubCard}>
                  <Image
                    source={club.coverImage || 'https://picsum.photos/400/150'}
                    style={styles.clubCover}
                    contentFit="cover"
                  />
                  <View style={styles.clubContent}>
                    <View style={styles.clubHeaderRow}>
                      <Image
                        source={club.logoUrl || 'https://picsum.photos/100'}
                        style={styles.clubLogo}
                      />
                      <View style={styles.clubInfo}>
                        <Text style={styles.clubNameText}>{club.name}</Text>
                        <Text style={styles.clubMemberCount}>
                          {club.memberCount || 0} members • {club.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.clubDescription} numberOfLines={2}>
                      {club.description}
                    </Text>
                    <View style={styles.clubActions}>
                      <TouchableOpacity 
                        style={[styles.joinButton, isJoined && styles.joinedButton]}
                        onPress={() => handleJoinPress(club.id)}
                        disabled={toggleJoinClubMutation.isPending}
                      >
                        {toggleJoinClubMutation.isPending ? (
                          <ActivityIndicator size="small" color={isJoined ? '#007AFF' : '#fff'} />
                        ) : (
                          <Text style={[styles.joinButtonText, isJoined && styles.joinedButtonText]}>
                            {isJoined ? 'Joined' : 'Join Club'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0F2',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  categoriesContainer: {
    paddingLeft: 20,
    marginBottom: 24,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEF0F2',
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  eventCard: {
    width: width * 0.8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginLeft: 20,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 140,
  },
  eventDetails: {
    padding: 16,
  },
  eventClub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  eventTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 4,
    marginBottom: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventMetaText: {
    fontSize: 13,
    color: '#636366',
    marginLeft: 6,
  },
  eventBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  eventFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  viewEventButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewEventButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  clubCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  clubCover: {
    width: '100%',
    height: 100,
  },
  clubContent: {
    padding: 16,
  },
  clubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -36,
    marginBottom: 12,
  },
  clubLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: '#FFF',
  },
  clubInfo: {
    marginLeft: 12,
    marginTop: 20,
    flex: 1,
  },
  clubNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  clubMemberCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  clubDescription: {
    fontSize: 14,
    color: '#636366',
    lineHeight: 20,
    marginBottom: 16,
  },
  clubActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  joinedButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  joinedButtonText: {
    color: '#007AFF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 20,
    fontSize: 16,
  },
});
