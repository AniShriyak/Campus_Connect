import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Event } from '../types';
import { db } from './firebase';

export const createEvent = async (clubId: string, eventData: Omit<Event, 'id' | 'clubId' | 'registeredCount' | 'createdAt'>): Promise<string> => {
  const newEvent: Event = {
    ...eventData,
    clubId,
    registeredCount: 0,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, 'events'), newEvent);
  return docRef.id;
};

export const getEventsForClub = async (clubId: string): Promise<Event[]> => {
  const q = query(collection(db, 'events'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  return evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getAllUpcomingEvents = async (): Promise<Event[]> => {
  // Using today's date string in YYYY-MM-DD format for simple comparison
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'events'), where('date', '>=', today), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  const snap = await getDoc(doc(db, 'events', eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
};
