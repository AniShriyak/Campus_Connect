import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { getDocs, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CreateScreen() {
  const { profile } = useAuthStore();
  const [activeForm, setActiveForm] = useState<'event' | 'post' | 'club'>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clubs managed by this coordinator
  const { data: managedClubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ['managedClubs', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const q = query(
        collection(db, 'clubs'), 
        where('coordinatorIds', 'array-contains', profile?.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; name: string; upiId?: string }));
    }
  });

  // State for Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventFee, setEventFee] = useState('');
  const [eventUpi, setEventUpi] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [eventCover, setEventCover] = useState<string | null>(null);

  // State for Post Form
  const [postContent, setPostContent] = useState('');
  const [postClubId, setPostClubId] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);

  // State for Club Form (Admin or authorized coordinators)
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubCategory, setClubCategory] = useState('Technical');
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  const pickImage = async (type: 'event' | 'post' | 'club') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === 'event') setEventCover(uri);
      if (type === 'post') setPostImage(uri);
      if (type === 'club') setClubLogo(uri);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedClubId || !eventTitle || !eventDesc || !eventDate || !eventTime || !eventVenue) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedClub = managedClubs.find(c => c.id === selectedClubId);
      const upi = eventUpi || selectedClub?.upiId || 'test@upi';
      
      const newEvent = {
        clubId: selectedClubId,
        clubName: selectedClub?.name || 'Unknown Club',
        title: eventTitle,
        description: eventDesc,
        date: eventDate,
        time: eventTime,
        venue: eventVenue,
        entryFee: Number(eventFee) || 0,
        upiId: upi,
        coverImage: eventCover || 'https://picsum.photos/400/200',
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'events'), newEvent);
      Alert.alert('Success', 'Event created successfully!');
      
      // Reset fields
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      setEventTime('');
      setEventVenue('');
      setEventFee('');
      setEventUpi('');
      setEventCover(null);
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postClubId || !postContent) {
      Alert.alert('Validation Error', 'Please select a club and write some content.');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedClub = managedClubs.find(c => c.id === postClubId);
      const newPost = {
        clubId: postClubId,
        clubName: selectedClub?.name || 'Unknown Club',
        content: postContent,
        imageUrl: postImage || null,
        likesCount: 0,
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'posts'), newPost);
      Alert.alert('Success', 'Post created successfully!');
      
      setPostContent('');
      setPostImage(null);
    } catch (e: any) {
      Alert.alert('Post Failed', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClub = async () => {
    if (!clubName || !clubDesc) {
      Alert.alert('Validation Error', 'Please enter club name and description.');
      return;
    }
    setIsSubmitting(true);
    try {
      const newClub = {
        name: clubName,
        description: clubDesc,
        category: clubCategory,
        coordinatorIds: [profile?.id],
        logoUrl: clubLogo || 'https://picsum.photos/100',
        coverImage: 'https://picsum.photos/400/150',
        memberCount: 1,
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'clubs'), newClub);
      
      // Add the club to coordinator's joined/managed clubs locally
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          joinedClubs: arrayUnion(docRef.id)
        });
      }

      Alert.alert('Success', 'Club registered successfully!');
      
      setClubName('');
      setClubDesc('');
      setClubLogo(null);
    } catch (e: any) {
      Alert.alert('Club Creation Failed', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create New</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        {(['event', 'post', 'club'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.segmentButton, activeForm === type && styles.segmentActive]}
            onPress={() => setActiveForm(type)}
          >
            <Text style={[styles.segmentText, activeForm === type && styles.segmentTextActive]}>
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Forms */}
      {activeForm === 'event' && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Event</Text>
          
          <Text style={styles.label}>Select Club *</Text>
          {isLoadingClubs ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : managedClubs.length === 0 ? (
            <Text style={styles.warningText}>You must manage a club to create events.</Text>
          ) : (
            <View style={styles.selectorContainer}>
              {managedClubs.map(club => (
                <TouchableOpacity
                  key={club.id}
                  style={[styles.selectorItem, selectedClubId === club.id && styles.selectorItemActive]}
                  onPress={() => setSelectedClubId(club.id)}
                >
                  <Text style={[styles.selectorText, selectedClubId === club.id && styles.selectorTextActive]}>
                    {club.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Event Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Hackathon 2026" value={eventTitle} onChangeText={setEventTitle} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Provide details about registration, timelines..." value={eventDesc} onChangeText={setEventDesc} />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Date *</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={eventDate} onChangeText={setEventDate} />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Time *</Text>
              <TextInput style={styles.input} placeholder="e.g. 10:00 AM" value={eventTime} onChangeText={setEventTime} />
            </View>
          </View>

          <Text style={styles.label}>Venue *</Text>
          <TextInput style={styles.input} placeholder="e.g. Seminar Hall 3" value={eventVenue} onChangeText={setEventVenue} />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Entry Fee (INR)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0 for Free" value={eventFee} onChangeText={setEventFee} />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>UPI ID for Payments</Text>
              <TextInput style={styles.input} placeholder="yourname@okaxis" autoCapitalize="none" value={eventUpi} onChangeText={setEventUpi} />
            </View>
          </View>

          <Text style={styles.label}>Event Banner Image</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('event')}>
            {eventCover ? (
              <Image source={eventCover} style={styles.pickerPreview} />
            ) : (
              <View style={styles.pickerPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#8E8E93" />
                <Text style={styles.pickerText}>Select Banner Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleCreateEvent} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Publish Event</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeForm === 'post' && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Write Post</Text>

          <Text style={styles.label}>Select Club *</Text>
          {isLoadingClubs ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : managedClubs.length === 0 ? (
            <Text style={styles.warningText}>You must manage a club to post updates.</Text>
          ) : (
            <View style={styles.selectorContainer}>
              {managedClubs.map(club => (
                <TouchableOpacity
                  key={club.id}
                  style={[styles.selectorItem, postClubId === club.id && styles.selectorItemActive]}
                  onPress={() => setPostClubId(club.id)}
                >
                  <Text style={[styles.selectorText, postClubId === club.id && styles.selectorTextActive]}>
                    {club.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Content *</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Announce meetings, results, or casual news..." value={postContent} onChangeText={setPostContent} />

          <Text style={styles.label}>Attach Image</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('post')}>
            {postImage ? (
              <Image source={postImage} style={styles.pickerPreview} />
            ) : (
              <View style={styles.pickerPlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#8E8E93" />
                <Text style={styles.pickerText}>Add Photo Attachment</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleCreatePost} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Post to Club Feed</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeForm === 'club' && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Register Club</Text>

          <Text style={styles.label}>Club Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Robotics Club" value={clubName} onChangeText={setClubName} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Specify vision, rules, requirements..." value={clubDesc} onChangeText={setClubDesc} />

          <Text style={styles.label}>Category</Text>
          <View style={styles.selectorContainer}>
            {['Technical', 'Cultural', 'Sports', 'Arts'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.selectorItem, clubCategory === cat && styles.selectorItemActive]}
                onPress={() => setClubCategory(cat)}
              >
                <Text style={[styles.selectorText, clubCategory === cat && styles.selectorTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Club Logo / Icon</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('club')}>
            {clubLogo ? (
              <Image source={clubLogo} style={styles.pickerPreview} />
            ) : (
              <View style={styles.pickerPlaceholder}>
                <Ionicons name="apps-outline" size={32} color="#8E8E93" />
                <Text style={styles.pickerText}>Upload Club Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleCreateClub} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Register Club</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  scrollContent: {
    paddingBottom: 40,
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F2',
    borderRadius: 12,
    padding: 2,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#636366',
  },
  segmentTextActive: {
    color: '#FF3B30',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  rowItem: {
    flex: 1,
    paddingHorizontal: 6,
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  selectorItem: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectorItemActive: {
    backgroundColor: '#FF3B30',
  },
  selectorText: {
    fontSize: 13,
    color: '#636366',
    fontWeight: '600',
  },
  selectorTextActive: {
    color: '#FFF',
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  pickerPreview: {
    width: '100%',
    height: '100%',
  },
  pickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
});
