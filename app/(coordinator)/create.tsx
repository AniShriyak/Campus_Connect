import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { createClub } from '../../src/services/clubService';
import { createEvent } from '../../src/services/eventService';
import { createAnnouncement } from '../../src/services/announcementService';

export default function CreateScreen() {
  const { type, clubId } = useLocalSearchParams<{ type: string, clubId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [formType, setFormType] = useState(type || 'club'); // 'club', 'event', 'announcement'
  const [loading, setLoading] = useState(false);
  
  // Generic form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [coverImage, setCoverImage] = useState('');

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (formType === 'club') {
        const newClubId = await createClub(user.uid, {
          name: title,
          description,
          category,
        });
        router.replace(`/(coordinator)/club-workspace/${newClubId}` as any);
      } else if (formType === 'event') {
        if (!clubId) throw new Error("Club ID required for event");
        const newEventId = await createEvent(clubId, {
          title,
          description,
          date,
          time,
          venue,
          capacity: parseInt(capacity) || 0,
          entryFee: parseInt(entryFee) || 0,
          ...(coverImage ? { coverImage } : {})
        });
        router.replace(`/event-management/${newEventId}` as any);
      } else if (formType === 'announcement') {
        if (!clubId) throw new Error("Club ID required for announcement");
        await createAnnouncement(clubId, {
          clubId,
          authorId: user.uid,
          content: description,
          isPinned: false
        });
        router.back();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {type ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>Create {formType.charAt(0).toUpperCase() + formType.slice(1)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {formType === 'club' || formType === 'event' ? (
          <View>
            <Text style={styles.label}>{formType === 'club' ? 'Club Name' : 'Event Title'}</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter name" />
          </View>
        ) : null}

        <View>
          <Text style={styles.label}>{formType === 'announcement' ? 'Announcement Content' : 'Description'}</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={description} 
            onChangeText={setDescription} 
            placeholder="Enter description..." 
            multiline 
          />
        </View>

        {formType === 'club' && (
          <View>
            <Text style={styles.label}>Category</Text>
            <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Tech, Music" />
          </View>
        )}

        {formType === 'event' && (
          <>
            <Text style={styles.label}>Date & Time</Text>
            <View style={{ flexDirection: 'row' }}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              <TextInput style={[styles.input, { flex: 1 }]} value={time} onChangeText={setTime} placeholder="HH:MM" />
            </View>

            <Text style={styles.label}>Venue</Text>
            <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="Enter venue" />

            <Text style={styles.label}>Cover Image URL (Optional)</Text>
            <TextInput style={styles.input} value={coverImage} onChangeText={setCoverImage} placeholder="https://..." />

            <Text style={styles.label}>Capacity & Fee</Text>
            <View style={{ flexDirection: 'row' }}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} value={capacity} onChangeText={setCapacity} placeholder="Capacity (0 for unlimited)" keyboardType="numeric" />
              <TextInput style={[styles.input, { flex: 1 }]} value={entryFee} onChangeText={setEntryFee} placeholder="Entry Fee (0 for free)" keyboardType="numeric" />
            </View>
          </>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Publish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 15, color: '#333' },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#FF3B30', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
