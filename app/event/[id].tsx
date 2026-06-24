import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Event, Registration } from '../../src/types';
import { getEventById } from '../../src/services/eventService';
import { getEventRegistrations, registerForEvent } from '../../src/services/registrationService';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const evtData = await getEventById(id);
      setEvent(evtData);
      
      const regs = await getEventRegistrations(id);
      const myReg = regs.find(r => r.userId === user.uid);
      if (myReg) {
        setUserRegistration(myReg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !event || !event.id) return;
    setRegistering(true);
    try {
      await registerForEvent(user.uid, event.id, event.clubId);
      await loadData(); // Reload to get new registration and updated count
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!event) return <View style={styles.center}><Text>Event not found</Text></View>;

  const isFull = event.registeredCount >= event.capacity && event.capacity > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Image source={{ uri: event.coverImage || 'https://via.placeholder.com/600x300' }} style={styles.cover} />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{event.date} at {event.time}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{event.venue}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{event.entryFee === 0 ? 'Free' : `₹${event.entryFee}`}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{event.registeredCount} / {event.capacity || 'Unlimited'} Seats Filled</Text>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{event.description}</Text>

          {/* Registration Logic */}
          <View style={styles.actionSection}>
            {userRegistration ? (
              <View>
                <View style={styles.registeredBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <Text style={styles.registeredText}>Registered ({userRegistration.status})</Text>
                </View>
                <TouchableOpacity style={styles.ticketButton} onPress={() => router.push(`/ticket/${userRegistration.id}` as any)}>
                  <Text style={styles.ticketButtonText}>View Ticket</Text>
                </TouchableOpacity>
              </View>
            ) : isFull ? (
              <View style={styles.fullBadge}>
                <Text style={styles.fullText}>Full</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={registering}>
                <Text style={styles.registerText}>{registering ? "Registering..." : "Register Now"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'relative' },
  backButton: { position: 'absolute', top: 10, left: 10, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 20 },
  cover: { width: '100%', height: 250 },
  infoSection: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailText: { marginLeft: 10, fontSize: 16, color: '#444' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  description: { color: '#666', lineHeight: 22 },
  actionSection: { marginTop: 30 },
  registerButton: { backgroundColor: '#6B4CE6', padding: 15, borderRadius: 10, alignItems: 'center' },
  registerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullBadge: { backgroundColor: '#e9ecef', padding: 15, borderRadius: 10, alignItems: 'center' },
  fullText: { color: '#888', fontSize: 18, fontWeight: 'bold' },
  registeredBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, marginBottom: 10 },
  registeredText: { color: '#34C759', fontWeight: 'bold', marginLeft: 8 },
  ticketButton: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' },
  ticketButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
