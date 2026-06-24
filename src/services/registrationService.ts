import { collection, doc, getDoc, getDocs, addDoc, query, where, runTransaction, updateDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Registration, Event } from '../types';

export const registerForEvent = async (userId: string, eventId: string, clubId: string): Promise<string> => {
  return await runTransaction(db, async (transaction) => {
    // 1. Check event capacity
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await transaction.get(eventRef);
    if (!eventSnap.exists()) {
      throw new Error("Event does not exist.");
    }

    const eventData = eventSnap.data() as Event;
    if (eventData.registeredCount >= eventData.capacity && eventData.capacity > 0) {
      throw new Error("Event is full.");
    }

    // 2. Check if already registered (Querying inside transaction with client SDK is limited, so we check doc explicitly)
    // We can use a composite ID to ensure user only registers once per event
    const registrationId = `${eventId}_${userId}`;
    const registrationRef = doc(db, 'registrations', registrationId);
    const registrationSnap = await transaction.get(registrationRef);
    
    if (registrationSnap.exists()) {
      throw new Error("You are already registered for this event.");
    }

    // 3. Create Registration
    const qrPayload = JSON.stringify({ registrationId, eventId, userId });
    
    const newRegistration: Registration = {
      eventId,
      clubId,
      userId,
      status: 'pending', // Will be approved immediately if free, or by coordinator if paid
      qrPayload,
      createdAt: Date.now()
    };

    if (eventData.entryFee === 0) {
      newRegistration.status = 'approved';
    }

    transaction.set(registrationRef, newRegistration);

    // 4. Update event registeredCount
    transaction.update(eventRef, {
      registeredCount: eventData.registeredCount + 1
    });

    return registrationId;
  });
};

export const getUserRegistrations = async (userId: string): Promise<Registration[]> => {
  const q = query(collection(db, 'registrations'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
  return regs.sort((a, b) => b.createdAt - a.createdAt);
};

export const getRegistrationById = async (registrationId: string): Promise<Registration | null> => {
  const snap = await getDoc(doc(db, 'registrations', registrationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Registration;
};

export const getEventRegistrations = async (eventId: string): Promise<Registration[]> => {
  const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
  const snapshot = await getDocs(q);
  const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
  return regs.sort((a, b) => b.createdAt - a.createdAt);
};

export const updateRegistrationStatus = async (registrationId: string, status: Registration['status']): Promise<void> => {
  const registrationRef = doc(db, 'registrations', registrationId);
  await updateDoc(registrationRef, { status });
};

export const uploadCertificate = async (registrationId: string, fileBlob: Blob): Promise<string> => {
  const certificateRef = ref(storage, `certificates/${registrationId}.pdf`);
  await uploadBytes(certificateRef, fileBlob);
  const downloadUrl = await getDownloadURL(certificateRef);
  
  const registrationRef = doc(db, 'registrations', registrationId);
  await updateDoc(registrationRef, { certificateUrl: downloadUrl });
  
  return downloadUrl;
};
