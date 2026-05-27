import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, collection, addDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
  upiId: string;
  coverImage?: string;
}

interface Registration {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  fee: number;
  paymentProofUrl?: string;
  status: 'pending' | 'approved' | 'attended' | 'rejected';
  certificateUrl?: string;
}

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const [paymentProofUri, setPaymentProofUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Event Details
  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: ['eventDetails', eventId],
    queryFn: async () => {
      const docSnap = await getDoc(doc(db, 'events', eventId));
      if (!docSnap.exists()) throw new Error('Event not found');
      return { id: docSnap.id, ...docSnap.data() } as Event;
    }
  });

  // Fetch Registration status for this user
  const { data: registration, isLoading: isLoadingReg } = useQuery<Registration | null>({
    queryKey: ['eventRegistration', eventId, profile?.id],
    enabled: !!profile?.id && !!eventId,
    queryFn: async () => {
      const q = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId),
        where('userId', '==', profile?.id)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Registration;
    }
  });

  const pickPaymentProof = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Photos permission is required to upload screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPaymentProofUri(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    if (!event || !profile) return;
    
    // Check if paid event and no proof uploaded
    const isPaid = event.entryFee > 0;
    if (isPaid && !paymentProofUri) {
      Alert.alert('Payment Proof Required', 'Please upload a screenshot of your payment proof.');
      return;
    }

    setIsSubmitting(true);
    try {
      let downloadUrl = '';

      if (isPaid && paymentProofUri) {
        // 1. Upload proof to Firebase Storage
        const response = await fetch(paymentProofUri);
        const blob = await response.blob();
        
        const timestamp = Date.now();
        const storageRef = ref(storage, `paymentProofs/${profile.id}/${eventId}_${timestamp}.jpg`);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }

      // 2. Create registration document in Firestore
      const regData = {
        userId: profile.id,
        userName: profile.fullName,
        eventId: event.id,
        eventTitle: event.title,
        clubId: event.clubId,
        fee: event.entryFee,
        paymentProofUrl: downloadUrl || null,
        status: isPaid ? 'pending' : 'approved', // Free events are pre-approved
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'registrations'), regData);
      
      Alert.alert(
        'Success 🎉', 
        isPaid 
          ? 'Registration submitted! A coordinator will verify your payment.' 
          : 'Successfully registered for this event!'
      );
      
      setPaymentProofUri(null);
      queryClient.invalidateQueries({ queryKey: ['eventRegistration', eventId, profile?.id] });
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvent || isLoadingReg) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPaid = event.entryFee > 0;
  const upiPayLink = `upi://pay?pa=${event.upiId}&pn=${encodeURIComponent(event.clubName)}&am=${event.entryFee}&cu=INR`;
  const upiQrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayLink)}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backFloatBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
      </TouchableOpacity>

      {/* Cover Image */}
      <Image source={event.coverImage || 'https://picsum.photos/400/200'} style={styles.coverImage} contentFit="cover" />

      {/* Content Wrapper */}
      <View style={styles.content}>
        <Text style={styles.clubName}>{event.clubName}</Text>
        <Text style={styles.title}>{event.title}</Text>

        {/* Event Meta Details */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={22} color="#007AFF" />
            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{event.date}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={22} color="#007AFF" />
            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>Time</Text>
              <Text style={styles.metaValue}>{event.time}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={22} color="#007AFF" />
            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>Venue</Text>
              <Text style={styles.metaValue}>{event.venue}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>About Event</Text>
        <Text style={styles.description}>{event.description}</Text>

        {/* Pricing / Registration Flows */}
        {!registration ? (
          <View style={styles.regCard}>
            <Text style={styles.sectionTitle}>Register for Event</Text>
            <View style={styles.feeContainer}>
              <Text style={styles.feeLabel}>Entry Fee:</Text>
              <Text style={styles.feeValue}>{isPaid ? `₹${event.entryFee}` : 'FREE'}</Text>
            </View>

            {isPaid && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentInstructions}>
                  Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) to make the payment of ₹{event.entryFee} to the club.
                </Text>
                
                {/* Dynamic UPI QR Code */}
                <View style={styles.qrContainer}>
                  <Image source={upiQrApiUrl} style={styles.upiQrImage} />
                  <Text style={styles.upiIdText}>UPI ID: {event.upiId}</Text>
                </View>

                {/* Proof Picker */}
                <TouchableOpacity style={styles.proofPicker} onPress={pickPaymentProof}>
                  {paymentProofUri ? (
                    <Image source={paymentProofUri} style={styles.proofPreview} />
                  ) : (
                    <View style={styles.proofPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={28} color="#007AFF" />
                      <Text style={styles.proofPickerText}>Upload Payment Screenshot</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.registerBtn} 
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerBtnText}>
                  {isPaid ? 'Submit Payment Proof' : 'Claim Free Pass'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.ticketCard,
            registration.status === 'approved' && styles.ticketCardApproved,
            registration.status === 'attended' && styles.ticketCardAttended,
            registration.status === 'pending' && styles.ticketCardPending,
            registration.status === 'rejected' && styles.ticketCardRejected,
          ]}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketHeaderTitle}>YOUR PASS</Text>
              <View style={[
                styles.statusBadge,
                registration.status === 'approved' && styles.badgeApproved,
                registration.status === 'attended' && styles.badgeAttended,
                registration.status === 'pending' && styles.badgePending,
                registration.status === 'rejected' && styles.badgeRejected,
              ]}>
                <Text style={styles.statusBadgeText}>{registration.status}</Text>
              </View>
            </View>

            {registration.status === 'pending' && (
              <View style={styles.ticketContent}>
                <Ionicons name="hourglass-outline" size={48} color="#FF9500" />
                <Text style={styles.ticketMsgTitle}>Verification Pending</Text>
                <Text style={styles.ticketMsgSubtitle}>
                  The coordinator is reviewing your payment proof screenshot. Check back soon for your entry QR code.
                </Text>
              </View>
            )}

            {registration.status === 'rejected' && (
              <View style={styles.ticketContent}>
                <Ionicons name="close-circle-outline" size={48} color="#FF3B30" />
                <Text style={styles.ticketMsgTitle}>Registration Rejected</Text>
                <Text style={styles.ticketMsgSubtitle}>
                  Your payment screenshot could not be verified. Please contact the coordinator or re-upload your proof.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setPaymentProofUri(null)}>
                  <Text style={styles.retryBtnText}>Retry Registration</Text>
                </TouchableOpacity>
              </View>
            )}

            {registration.status === 'approved' && (
              <View style={styles.ticketContent}>
                <Text style={styles.ticketLabel}>Present this QR code at the entry gates:</Text>
                <View style={styles.qrContainer}>
                  <Image 
                    source={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=cc_ticket:${registration.id}`} 
                    style={styles.upiQrImage} 
                  />
                  <Text style={styles.ticketIdText}>Pass ID: CC-{registration.id.slice(0, 8).toUpperCase()}</Text>
                </View>
              </View>
            )}

            {registration.status === 'attended' && (
              <View style={styles.ticketContent}>
                <Ionicons name="ribbon-outline" size={54} color="#007AFF" />
                <Text style={styles.ticketMsgTitle}>Attendance Marked 🎉</Text>
                <Text style={styles.ticketMsgSubtitle}>
                  You attended this event! Your certificate has been generated.
                </Text>
                {registration.certificateUrl && (
                  <TouchableOpacity style={styles.downloadCertBtn}>
                    <Ionicons name="download-outline" size={18} color="#FFF" />
                    <Text style={styles.downloadCertBtnText}>View Certificate (PDF)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A3A3C',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  backFloatBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: 220,
  },
  content: {
    padding: 20,
  },
  clubName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 4,
    marginBottom: 16,
  },
  metaCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  metaInfo: {
    marginLeft: 12,
  },
  metaLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 22,
    marginBottom: 24,
  },
  regCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  feeValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34C759',
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentInstructions: {
    fontSize: 13,
    color: '#636366',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 12,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
  },
  upiQrImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  upiIdText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '500',
  },
  proofPicker: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    backgroundColor: '#F4F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 16,
  },
  proofPlaceholder: {
    alignItems: 'center',
  },
  proofPickerText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 6,
  },
  proofPreview: {
    width: '100%',
    height: '100%',
  },
  registerBtn: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketCard: {
    borderRadius: 20,
    backgroundColor: '#FFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ticketCardPending: { borderTopWidth: 6, borderTopColor: '#FF9500' },
  ticketCardApproved: { borderTopWidth: 6, borderTopColor: '#34C759' },
  ticketCardAttended: { borderTopWidth: 6, borderTopColor: '#007AFF' },
  ticketCardRejected: { borderTopWidth: 6, borderTopColor: '#FF3B30' },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 12,
  },
  ticketHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8E8E93',
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badgePending: { backgroundColor: '#FFEBD6' },
  badgeApproved: { backgroundColor: '#E2FBE9' },
  badgeAttended: { backgroundColor: '#E3F2FD' },
  badgeRejected: { backgroundColor: '#FFEBEA' },
  ticketContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ticketLabel: {
    fontSize: 13,
    color: '#636366',
    textAlign: 'center',
    marginBottom: 8,
  },
  ticketIdText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 8,
    letterSpacing: 1,
  },
  ticketMsgTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 12,
  },
  ticketMsgSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  downloadCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  downloadCertBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
