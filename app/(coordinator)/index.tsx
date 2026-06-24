import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Club } from '../../src/types';
import { getManagedClubs } from '../../src/services/clubService';

export default function ManagedClubsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClubs = async () => {
      if (!user) return;
      try {
        const managed = await getManagedClubs(user.uid);
        setClubs(managed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadClubs();
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF3B30" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Managed Clubs</Text>
        <Text style={styles.headerSubtitle}>Select a club to manage its workspace</Text>
      </View>

      {clubs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>You are not coordinating any clubs yet.</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(coordinator)/create')}>
            <Text style={styles.createButtonText}>Create a Club</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id as string}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push(`/(coordinator)/club-workspace/${item.id}` as any)}
            >
              <Image source={{ uri: item.logoUrl || 'https://via.placeholder.com/100' }} style={styles.logo} />
              <View style={styles.cardContent}>
                <Text style={styles.clubName}>{item.name}</Text>
                <Text style={styles.clubCategory}>{item.category} • {item.memberCount} Members</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: '#666', marginTop: 4 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', elevation: 2 },
  logo: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  cardContent: { flex: 1 },
  clubName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  clubCategory: { color: '#888', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 15, textAlign: 'center' },
  createButton: { marginTop: 20, backgroundColor: '#FF3B30', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
