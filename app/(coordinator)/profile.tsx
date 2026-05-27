import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

export default function CoordinatorProfile() {
  const { profile, logout } = useAuthStore();

  // Fetch count of clubs managed by this coordinator
  const { data: stats = { clubsCount: 0, eventsCount: 0, approvalsCount: 0 }, isLoading } = useQuery({
    queryKey: ['coordinatorStats', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // 1. Fetch managed clubs
      const clubsQuery = query(collection(db, 'clubs'), where('coordinatorIds', 'array-contains', profile?.id));
      const clubsSnap = await getDocs(clubsQuery);
      const clubsCount = clubsSnap.docs.length;
      const clubIds = clubsSnap.docs.map(doc => doc.id);

      // 2. Fetch events linked to these clubs
      let eventsCount = 0;
      if (clubIds.length > 0) {
        const eventsQuery = query(collection(db, 'events'), where('clubId', 'in', clubIds));
        const eventsSnap = await getDocs(eventsQuery);
        eventsCount = eventsSnap.docs.length;
      }

      // 3. Fetch reviewed registrations (approved or rejected) for these clubs
      let approvalsCount = 0;
      if (clubIds.length > 0) {
        const regsQuery = query(collection(db, 'registrations'), where('status', 'in', ['approved', 'rejected', 'attended']));
        const regsSnap = await getDocs(regsQuery);
        const reviewedRegs = regsSnap.docs.filter(doc => clubIds.includes(doc.data().clubId));
        approvalsCount = reviewedRegs.length;
      }

      return { clubsCount, eventsCount, approvalsCount };
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
        <Text style={styles.name}>{profile?.fullName || 'Coordinator Name'}</Text>
        <Text style={styles.email}>{profile?.email || 'coordinator@college.ac.in'}</Text>
        <Text style={styles.college}>{profile?.college || 'College Name'}</Text>
        
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>Club Coordinator</Text>
        </View>
      </View>

      {/* Statistics Grid */}
      <Text style={styles.sectionTitle}>Dashboard Summary</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color="#FF3B30" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="people" size={24} color="#FF3B30" />
            <Text style={styles.statVal}>{stats.clubsCount}</Text>
            <Text style={styles.statLabel}>Managed Clubs</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="calendar" size={24} color="#FF3B30" />
            <Text style={styles.statVal}>{stats.eventsCount}</Text>
            <Text style={styles.statLabel}>Events Hosted</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-circle" size={24} color="#FF3B30" />
            <Text style={styles.statVal}>{stats.approvalsCount}</Text>
            <Text style={styles.statLabel}>Reviews Done</Text>
          </View>
        </View>
      )}

      {/* Options Panel */}
      <View style={styles.optionsList}>
        <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Information', 'CampusConnect Coordinator v1.0')}>
          <Ionicons name="information-circle-outline" size={22} color="#1C1C1E" />
          <Text style={styles.optionText}>App Info</Text>
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
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
  roleTag: {
    backgroundColor: '#FFEBEA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  roleTagText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsList: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 12,
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
