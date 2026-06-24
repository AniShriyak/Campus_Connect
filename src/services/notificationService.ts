import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Notification } from '../types';
import { db } from './firebase';

export const createNotification = async (userId: string, type: Notification['type'], message: string, relatedId?: string): Promise<string> => {
  const newNotification: Omit<Notification, 'id'> = {
    userId,
    type,
    message,
    isRead: false,
    relatedId,
    createdAt: Date.now()
  };
  const docRef = await addDoc(collection(db, 'notifications'), newNotification);
  return docRef.id;
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, { isRead: true });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { isRead: true });
  });

  await batch.commit();
};
