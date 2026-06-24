import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Registration, Event } from '../../src/types';
import { getRegistrationById } from '../../src/services/registrationService';
import { getEventById } from '../../src/services/eventService';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const regData = await getRegistrationById(id);
        setRegistration(regData);
        if (regData) {
          const evtData = await getEventById(regData.eventId);
          setEvent(evtData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!registration || !event) return <View style={styles.center}><Text>Ticket not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Ticket</Text>
      </View>

      <View style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>{event.date} • {event.time}</Text>
          <Text style={styles.eventVenue}>{event.venue}</Text>
        </View>
        
        <View style={styles.divider}>
          <View style={styles.notchLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.notchRight} />
        </View>

        <View style={styles.qrSection}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={registration.qrPayload || registration.id}
              size={200}
              color="black"
              backgroundColor="white"
            />
          </View>
          <Text style={styles.regId}>ID: {registration.id}</Text>
          
          <View style={[styles.statusBadge, registration.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
            <Text style={styles.statusText}>{registration.status.toUpperCase()}</Text>
          </View>

          {registration.certificateUrl && (
            <TouchableOpacity style={styles.certButton} onPress={() => {/* Download or open URL */}}>
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.certText}>View Certificate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  ticketCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 5 },
  ticketHeader: { backgroundColor: '#6B4CE6', padding: 25, alignItems: 'center' },
  eventTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  eventDate: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 4 },
  eventVenue: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#fff' },
  notchLeft: { width: 20, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5', marginLeft: -10 },
  notchRight: { width: 20, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5', marginRight: -10 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  qrSection: { padding: 30, alignItems: 'center' },
  qrWrapper: { padding: 15, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, marginBottom: 20 },
  regId: { color: '#888', fontFamily: 'monospace', marginBottom: 15 },
  statusBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  statusApproved: { backgroundColor: '#e8f5e9' },
  statusPending: { backgroundColor: '#fff3e0' },
  statusText: { fontWeight: 'bold', color: '#333' },
  certButton: { marginTop: 20, backgroundColor: '#2196F3', flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center' },
  certText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 }
});
