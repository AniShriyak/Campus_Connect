import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU",
  authDomain: "campusconnect-e5b5d.firebaseapp.com",
  projectId: "campusconnect-e5b5d",
  storageBucket: "campusconnect-e5b5d.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Seeding Test Verification Club...");
  const clubsSnap = await getDocs(query(collection(db, "clubs"), where("name", "==", "Test Verification Club")));
  
  if (clubsSnap.empty) {
    console.log("No Test Verification Club found. Creating one...");
    const newClubRef = await addDoc(collection(db, "clubs"), {
      name: "Test Verification Club",
      category: "Tech",
      createdAt: Date.now(),
      description: "A club for testing verification features.",
      memberCount: 1,
      coordinatorIds: []
    });
    await addSeedData(newClubRef.id, "Test Verification Club");
  } else {
    for (const clubDoc of clubsSnap.docs) {
      await addSeedData(clubDoc.id, clubDoc.data().name);
    }
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

async function addSeedData(clubId, clubName) {
  console.log(`Adding seed data for ${clubName} (${clubId})`);
  
  // Add an event
  const eventRef = await addDoc(collection(db, "events"), {
    clubId: clubId,
    clubName: clubName,
    title: "Test Verification Event",
    description: "This is a seeded test event for the verification club.",
    date: "2026-07-01",
    time: "10:00 AM",
    venue: "Test Venue",
    entryFee: 100,
    upiId: "test@upi",
    coordinatorIds: [],
    createdAt: Date.now(),
    coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop"
  });
  console.log(`  Added event: ${eventRef.id}`);

  // Add a post
  const postRef = await addDoc(collection(db, "posts"), {
    clubId: clubId,
    clubName: clubName,
    content: "Welcome to the Test Verification Club! This is a seeded post.",
    likesCount: 10,
    createdAt: Date.now(),
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop"
  });
  console.log(`  Added post: ${postRef.id}`);
}

seed();
