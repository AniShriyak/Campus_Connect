import { collection, doc, getDoc, getDocs, addDoc, setDoc, query, where, runTransaction, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Club, Membership, UserProfile } from '../types';

export const createClub = async (userId: string, clubData: Omit<Club, 'id' | 'coordinatorIds' | 'memberCount' | 'createdAt'>): Promise<string> => {
  return await runTransaction(db, async (transaction) => {
    // 1. READ MUST HAPPEN BEFORE ANY WRITES
    const userRef = doc(db, 'users', userId);
    const userSnap = await transaction.get(userRef);

    // 2. Create the club (WRITE)
    const clubRef = doc(collection(db, 'clubs'));
    const newClub: Club = {
      ...clubData,
      coordinatorIds: [userId],
      memberCount: 1, // Coordinator is also a member
      createdAt: Date.now(),
    };
    transaction.set(clubRef, newClub);

    // 3. Add coordinator to memberships (WRITE)
    const membershipId = `${userId}_${clubRef.id}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    const newMembership: Membership = {
      userId,
      clubId: clubRef.id,
      joinedAt: Date.now(),
    };
    transaction.set(membershipRef, newMembership);

    // 4. Ensure user has 'coordinator' role (WRITE)
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserProfile;
      if (!userData.roles.includes('coordinator')) {
        transaction.update(userRef, {
          roles: arrayUnion('coordinator')
        });
      }
    }

    return clubRef.id;
  });
};

export const getClubs = async (): Promise<Club[]> => {
  const snapshot = await getDocs(collection(db, 'clubs'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
};

export const getClubById = async (clubId: string): Promise<Club | null> => {
  const snap = await getDoc(doc(db, 'clubs', clubId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Club;
};

export const joinClub = async (userId: string, clubId: string): Promise<void> => {
  return await runTransaction(db, async (transaction) => {
    // Check if already a member
    const q = query(collection(db, 'memberships'), where('userId', '==', userId), where('clubId', '==', clubId));
    const membershipSnaps = await getDocs(q); // Note: getDocs inside transaction is not strictly serialized in client SDK unless using transaction.get, but client SDK transactions only support doc refs for get().
    // We will do a client-side check first outside transaction, or just use a composite ID for membership to ensure uniqueness.
    
    const membershipId = `${userId}_${clubId}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    const membershipSnap = await transaction.get(membershipRef);
    
    if (membershipSnap.exists()) {
      throw new Error("User is already a member of this club.");
    }

    const clubRef = doc(db, 'clubs', clubId);
    const clubSnap = await transaction.get(clubRef);
    if (!clubSnap.exists()) {
      throw new Error("Club does not exist.");
    }

    const clubData = clubSnap.data() as Club;

    transaction.set(membershipRef, {
      userId,
      clubId,
      joinedAt: Date.now()
    });

    transaction.update(clubRef, {
      memberCount: clubData.memberCount + 1
    });
  });
};

export const getManagedClubs = async (userId: string): Promise<Club[]> => {
  const q = query(collection(db, 'clubs'), where('coordinatorIds', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
};

export const deleteClub = async (clubId: string): Promise<void> => {
  const clubRef = doc(db, 'clubs', clubId);
  await deleteDoc(clubRef);
};

export const getUserClubs = async (userId: string): Promise<Club[]> => {
  const q = query(collection(db, 'memberships'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const clubIds = snapshot.docs.map(doc => doc.data().clubId);
  
  if (clubIds.length === 0) return [];
  
  // Note: 'in' queries are limited to 10 items. For a robust solution, chunking is required.
  const chunkedIds = [];
  for (let i = 0; i < clubIds.length; i += 10) {
    chunkedIds.push(clubIds.slice(i, i + 10));
  }
  
  let allClubs: Club[] = [];
  for (const chunk of chunkedIds) {
    const clubQuery = query(collection(db, 'clubs'), where('__name__', 'in', chunk));
    const clubSnaps = await getDocs(clubQuery);
    allClubs = [...allClubs, ...clubSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club))];
  }
  
  return allClubs;
};

export const getClubMembers = async (clubId: string): Promise<UserProfile[]> => {
  const q = query(collection(db, 'memberships'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  const userIds = snapshot.docs.map(doc => doc.data().userId);
  
  if (userIds.length === 0) return [];
  
  const userPromises = userIds.map(uid => getDoc(doc(db, 'users', uid)));
  const userSnaps = await Promise.all(userPromises);
  
  return userSnaps
    .filter(snap => snap.exists())
    .map(snap => ({ uid: snap.id, ...snap.data() } as UserProfile));
};
