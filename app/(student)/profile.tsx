import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

interface Club {
  id: string;
  name: string;
  category: string;
  logoUrl?: string;
}

interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  status: 'pending' | 'approved' | 'attended' | 'rejected';
  certificateUrl?: string;
}

export default function StudentProfile() {
  const { profile, logout } = useAuthStore();
  const [activeSegment, setActiveSegment] = useState<'clubs' | 'events'>('clubs');

  // Fetch student's joined clubs
  const { data: joinedClubs = [], isLoading: isLoadingClubs } = useQuery<Club[]>({
    queryKey: ['myClubs', profile?.joinedClubs],
    enabled: !!profile?.joinedClubs && profile.joinedClubs.length > 0,
    queryFn: async () => {
      const clubs: Club[] = [];
      for (const clubId of profile?.joinedClubs || []) {
        const clubDoc = await getDoc(doc(db, 'clubs', clubId));
        if (clubDoc.exists()) {
          clubs.push({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }
      }
      return clubs;
    }
  });

  // Fetch student's event registrations
  const { data: registrations = [], isLoading: isLoadingRegs } = useQuery<Registration[]>({
    queryKey: ['myRegistrations', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const q = query(collection(db, 'registrations'), where('userId', '==', profile?.id));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    }
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (e: any) {
      Alert.alert('Sign Out Failed', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image
          source={profile?.profileImage || 'https://picsum.photos/200'}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile?.fullName || 'Student Name'}</Text>
        <Text style={styles.email}>{profile?.email || 'student@college.ac.in'}</Text>
        <Text style={styles.college}>{profile?.college || 'College Name'}</Text>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {profile.interests.map(interest => (
              <View key={interest} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeSegment === 'clubs' && styles.segmentActive]}
          onPress={() => setActiveSegment('clubs')}
        >
          <Ionicons name="people-outline" size={18} color={activeSegment === 'clubs' ? '#007AFF' : '#636366'} />
          <Text style={[styles.segmentText, activeSegment === 'clubs' && styles.segmentTextActive]}>
            Joined Clubs ({profile?.joinedClubs?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeSegment === 'events' && styles.segmentActive]}
          onPress={() => setActiveSegment('events')}
        >
          <Ionicons name="calendar-outline" size={18} color={activeSegment === 'events' ? '#007AFF' : '#636366'} />
          <Text style={[styles.segmentText, activeSegment === 'events' && styles.segmentTextActive]}>
            My Events ({registrations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segment Details */}
      {activeSegment === 'clubs' ? (
        <View style={styles.listSection}>
          {isLoadingClubs ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : joinedClubs.length === 0 ? (
            <Text style={styles.emptyText}>You haven't joined any clubs yet.</Text>
          ) : (
            joinedClubs.map(club => (
              <View key={club.id} style={styles.listItem}>
                <Image source={club.logoUrl || 'https://picsum.photos/100'} style={styles.listLogo} />
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{club.name}</Text>
                  <Text style={styles.listSubtitle}>{club.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.listSection}>
          {isLoadingRegs ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : registrations.length === 0 ? (
            <Text style={styles.emptyText}>You haven't registered for any events yet.</Text>
          ) : (
            registrations.map(reg => (
              <View key={reg.id} style={styles.listItem}>
                <View style={styles.eventInfoContainer}>
                  <Text style={styles.listTitle}>{reg.eventTitle}</Text>
                  <View style={styles.eventStatusRow}>
                    <Text style={styles.eventStatusLabel}>Status: </Text>
                    <Text style={[
                      styles.statusText,
                      reg.status === 'approved' && styles.statusApproved,
                      reg.status === 'attended' && styles.statusAttended,
                      reg.status === 'pending' && styles.statusPending,
                      reg.status === 'rejected' && styles.statusRejected,
                    ]}>
                      {reg.status}
                    </Text>
                  </View>
                </View>
                {reg.status === 'attended' && reg.certificateUrl && (
                  <TouchableOpacity style={styles.certificateButton}>
                    <Ionicons name="ribbon-outline" size={16} color="#FFF" />
                    <Text style={styles.certificateButtonText}>Certificate</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  email: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  college: {
    fontSize: 14,
    color: '#636366',
    fontWeight: '500',
    marginTop: 4,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  interestTag: {
    backgroundColor: '#EEF0F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  interestText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '600',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F2',
    borderRadius: 12,
    padding: 2,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636366',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#007AFF',
  },
  listSection: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  listLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  eventInfoContainer: {
    flex: 1,
  },
  eventStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventStatusLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  statusPending: { color: '#FF9500' },
  statusApproved: { color: '#34C759' },
  statusAttended: { color: '#007AFF' },
  statusRejected: { color: '#FF3B30' },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  certificateButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginVertical: 20,
    fontSize: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 24,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
