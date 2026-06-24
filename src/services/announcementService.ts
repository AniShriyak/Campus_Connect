import { collection, doc, getDocs, addDoc, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Announcement } from '../types';

export const createAnnouncement = async (clubId: string, data: Omit<Announcement, 'id' | 'createdAt'>): Promise<string> => {
  const announcementsRef = collection(db, `clubs/${clubId}/announcements`);
  const newAnnouncement: Announcement = {
    ...data,
    createdAt: Date.now()
  };
  const docRef = await addDoc(announcementsRef, newAnnouncement);
  return docRef.id;
};

export const getAnnouncements = async (clubId: string): Promise<Announcement[]> => {
  const announcementsRef = collection(db, `clubs/${clubId}/announcements`);
  const q = query(announcementsRef);
  const snapshot = await getDocs(q);
  
  const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
  
  // Sort pinned to the top, then by createdAt desc
  return announcements.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });
};

export const deleteAnnouncement = async (clubId: string, announcementId: string): Promise<void> => {
  const announcementRef = doc(db, `clubs/${clubId}/announcements`, announcementId);
  await deleteDoc(announcementRef);
};

export const togglePinAnnouncement = async (clubId: string, announcementId: string, isPinned: boolean): Promise<void> => {
  const announcementRef = doc(db, `clubs/${clubId}/announcements`, announcementId);
  await updateDoc(announcementRef, { isPinned });
};
