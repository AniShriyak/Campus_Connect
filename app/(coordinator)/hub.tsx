import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

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
}

export default function HubScreen() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'registrations' | 'scan'>('registrations');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  
  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const queryClient = useQueryClient();

  // Fetch managed clubs first to filter registrations by club
  const { data: managedClubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ['managedClubs', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const q = query(
        collection(db, 'clubs'),
        where('coordinatorIds', 'array-contains', profile?.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.id);
    }
  });

  // Fetch pending registrations for managed clubs
  const { data: registrations = [], isLoading: isLoadingRegs } = useQuery<Registration[]>({
    queryKey: ['hubRegistrations', managedClubs],
    enabled: managedClubs.length > 0,
    queryFn: async () => {
      // Query all registrations, then filter locally for managed clubs (since Firestore doesn't support array-contains query matching on single fields easily here)
      const q = query(collection(db, 'registrations'), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      return list.filter(reg => managedClubs.includes(reg.clubId));
    }
  });

  // Mutation to approve/reject registrations
  const verifyRegistrationMutation = useMutation({
    mutationFn: async ({ regId, status }: { regId: string; status: 'approved' | 'rejected' }) => {
      const regRef = doc(db, 'registrations', regId);
      await updateDoc(regRef, { status });
      return { regId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubRegistrations'] });
      Alert.alert('Success', 'Registration status updated!');
    },
    onError: (e: any) => {
      Alert.alert('Error', e.message || 'Failed to update registration.');
    }
  });

  // Function to process scanned QR ticket
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setIsProcessingQR(true);
    try {
      // Expecting dynamic payload format: "cc_ticket:{regId}"
      if (!data.startsWith('cc_ticket:')) {
        throw new Error('Invalid ticket QR code format.');
      }
      
      const regId = data.split(':')[1];
      const regRef = doc(db, 'registrations', regId);
      const regDoc = await getDoc(regRef);

      if (!regDoc.exists()) {
        throw new Error('Registration ticket not found in database.');
      }

      const regData = regDoc.data() as Registration;
      if (!managedClubs.includes(regData.clubId)) {
        throw new Error("You are not the coordinator for this event's club.");
      }

      if (regData.status === 'attended') {
        Alert.alert('Already Attended', `${regData.userName} has already checked in.`);
      } else if (regData.status === 'pending' || regData.status === 'rejected') {
        throw new Error(`Ticket is in state: ${regData.status}. Make sure payment is approved first.`);
      } else {
        // Update registration status to 'attended'
        await updateDoc(regRef, { status: 'attended' });
        Alert.alert(
          'Attendance Confirmed 🎉', 
          `Checked in: ${regData.userName}\nEvent: ${regData.eventTitle}`
        );
      }
    } catch (error: any) {
      Alert.alert('Check-in Failed ❌', error.message || 'Verification error.');
    } finally {
      setIsProcessingQR(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coordinator Hub</Text>
      </View>

      {/* Segment tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'registrations' && styles.tabActive]}
          onPress={() => setActiveTab('registrations')}
        >
          <Text style={[styles.tabText, activeTab === 'registrations' && styles.tabTextActive]}>
            Approvals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'scan' && styles.tabActive]}
          onPress={() => setActiveTab('scan')}
        >
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            Scan Tickets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Approvals tab view */}
      {activeTab === 'registrations' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoadingClubs || isLoadingRegs ? (
            <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 40 }} />
          ) : registrations.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color="#C7C7CC" />
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>No pending event registrations for approval.</Text>
            </View>
          ) : (
            registrations.map(reg => (
              <View key={reg.id} style={styles.regCard}>
                <View style={styles.regHeader}>
                  <Text style={styles.regStudentName}>{reg.userName}</Text>
                  <Text style={styles.regFee}>Fee: ₹{reg.fee}</Text>
                </View>
                <Text style={styles.regEventTitle}>{reg.eventTitle}</Text>
                
                {reg.paymentProofUrl ? (
                  <TouchableOpacity 
                    style={styles.proofThumbContainer}
                    onPress={() => setSelectedProof(reg.paymentProofUrl || null)}
                  >
                    <Image source={reg.paymentProofUrl} style={styles.proofThumb} contentFit="cover" />
                    <View style={styles.proofOverlay}>
                      <Ionicons name="expand" size={20} color="#FFF" />
                      <Text style={styles.proofOverlayText}>View Payment Screenshot</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noProofText}>No payment proof uploaded.</Text>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => verifyRegistrationMutation.mutate({ regId: reg.id, status: 'rejected' })}
                    disabled={verifyRegistrationMutation.isPending}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => verifyRegistrationMutation.mutate({ regId: reg.id, status: 'approved' })}
                    disabled={verifyRegistrationMutation.isPending}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Scan Tickets tab view */}
      {activeTab === 'scan' && (
        <View style={styles.scannerWrapper}>
          {!permission ? (
            <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 40 }} />
          ) : !permission.granted ? (
            <View style={styles.permissionView}>
              <Ionicons name="camera-outline" size={48} color="#FF3B30" />
              <Text style={styles.permissionText}>Camera Access Required</Text>
              <Text style={styles.permissionSubtext}>Please grant camera permission to scan ticket QR codes.</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              <View style={styles.overlayFrameContainer}>
                <View style={styles.scanTargetFrame} />
                <Text style={styles.scanHintText}>Align ticket QR code inside the box</Text>
              </View>
              {scanned && (
                <View style={styles.scannedActions}>
                  {isProcessingQR ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <TouchableOpacity style={styles.scanAgainBtn} onPress={() => setScanned(false)}>
                      <Text style={styles.scanAgainBtnText}>Scan Next Ticket</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Proof Preview Modal */}
      <Modal visible={!!selectedProof} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedProof(null)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {selectedProof && (
            <Image source={selectedProof} style={styles.modalImage} contentFit="contain" />
          )}
        </View>
      </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F2',
    borderRadius: 12,
    padding: 2,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#636366',
  },
  tabTextActive: {
    color: '#FF3B30',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  regCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  regHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  regStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  regFee: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34C759',
  },
  regEventTitle: {
    fontSize: 14,
    color: '#636366',
    marginBottom: 12,
  },
  proofThumbContainer: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  proofThumb: {
    width: '100%',
    height: '100%',
  },
  proofOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofOverlayText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  noProofText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  rejectBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  approveBtn: {
    backgroundColor: '#FF3B30',
  },
  rejectBtnText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scannerWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFF',
  },
  permissionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayFrameContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FF3B30',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHintText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scannedActions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  scanAgainBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanAgainBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.8,
  },
});
