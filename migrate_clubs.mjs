import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "campusconnect-e5b5d.firebaseapp.com",
  projectId: "campusconnect-e5b5d",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "campusconnect-e5b5d.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateClubs() {
  console.log("Starting club migration (coordinators -> coordinatorIds)...");
  const clubsSnap = await getDocs(collection(db, "clubs"));
  
  let migratedCount = 0;
  
  for (const clubDoc of clubsSnap.docs) {
    const data = clubDoc.data();
    if (data.coordinators && !data.coordinatorIds) {
      const clubRef = doc(db, "clubs", clubDoc.id);
      await updateDoc(clubRef, {
        coordinatorIds: data.coordinators
      });
      console.log(`Migrated club ${clubDoc.id} (${data.name})`);
      migratedCount++;
    }
  }
  
  console.log(`Migration complete! Migrated ${migratedCount} clubs.`);
  process.exit(0);
}

migrateClubs().catch(console.error);
