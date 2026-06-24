import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Event, Registration } from '../../../src/types';
import { getEventById } from '../../../src/services/eventService';
import { getEventRegistrations, updateRegistrationStatus } from '../../../src/services/registrationService';

export default function EventManagement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [evtData, regData] = await Promise.all([
        getEventById(id),
        getEventRegistrations(id)
      ]);
      setEvent(evtData);
      setRegistrations(regData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (regId: string) => {
    try {
      await updateRegistrationStatus(regId, 'approved');
      await loadData();
    } catch (e) {
      alert("Error approving");
    }
  };

  const handleMarkAttended = async (regId: string) => {
    try {
      await updateRegistrationStatus(regId, 'attended');
      await loadData();
    } catch (e) {
      alert("Error marking attended");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF3B30" /></View>;
  if (!event) return <View style={styles.center}><Text>Event not found</Text></View>;

  const pending = registrations.filter(r => r.status === 'pending');
  const approved = registrations.filter(r => r.status === 'approved');
  const attended = registrations.filter(r => r.status === 'attended');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => alert('Scanner integration here')}>
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
            <Text style={styles.scanBtnText}>Scan Tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.certBtn} onPress={() => alert('Certificate generator here')}>
            <Ionicons name="ribbon-outline" size={24} color="#FF3B30" />
            <Text style={styles.certBtnText}>Issue Certs</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{pending.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{approved.length}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{attended.length}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
        </View>

        {/* Pending Approvals */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approval (Paid)</Text>
            {pending.map(reg => (
              <View key={reg.id} style={styles.regCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.regUser}>User: {reg.userId.substring(0,8)}...</Text>
                  <Text style={styles.regDate}>Date: {new Date(reg.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(reg.id as string)}>
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Attended Marking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approved Registrations</Text>
          {approved.length === 0 ? <Text style={styles.emptyText}>No approved registrations.</Text> : approved.map(reg => (
             <View key={reg.id} style={styles.regCard}>
             <View style={{ flex: 1 }}>
               <Text style={styles.regUser}>User: {reg.userId.substring(0,8)}...</Text>
               <Text style={styles.regId}>ID: {reg.id}</Text>
             </View>
             <TouchableOpacity style={styles.attendBtn} onPress={() => handleMarkAttended(reg.id as string)}>
               <Text style={styles.attendBtnText}>Mark Attended</Text>
             </TouchableOpacity>
           </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', flex: 1 },
  content: { padding: 20 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  scanBtn: { flex: 1, backgroundColor: '#000', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  scanBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  certBtn: { flex: 1, backgroundColor: '#ffebee', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  certBtnText: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 1, marginHorizontal: 5 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  regCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  regUser: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  regDate: { color: '#888', fontSize: 12 },
  regId: { color: '#aaa', fontSize: 10, fontFamily: 'monospace' },
  approveBtn: { backgroundColor: '#4caf50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  approveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  attendBtn: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  attendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  emptyText: { color: '#888', fontStyle: 'italic' }
});
