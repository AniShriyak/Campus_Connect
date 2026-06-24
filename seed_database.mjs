import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "campusconnect-e5b5d.firebaseapp.com",
  projectId: "campusconnect-e5b5d",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "campusconnect-e5b5d.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDatabase() {
  console.log("Starting database seeding process...");

  // 1. Create the Test Verification Club
  const clubRef = await addDoc(collection(db, "clubs"), {
    name: "Test Verification Club",
    description: "A seeded club for testing end-to-end verification and event registration flows.",
    category: "Technical",
    memberCount: 5,
    coordinatorIds: ["mock-coordinator-id"],
    createdAt: Date.now()
  });
  const clubId = clubRef.id;
  console.log(`✅ Created Test Verification Club (ID: ${clubId})`);

  // 2. Add Two Announcements (Posts)
  const post1 = await addDoc(collection(db, "posts"), {
    clubId: clubId,
    clubName: "Test Verification Club",
    content: "Welcome to the Test Verification Club! We're excited to have you here.",
    likesCount: 12,
    createdAt: Date.now() - 86400000 * 2 // 2 days ago
  });
  
  const post2 = await addDoc(collection(db, "posts"), {
    clubId: clubId,
    clubName: "Test Verification Club",
    content: "Our new upcoming event is live! Check it out and register now.",
    likesCount: 5,
    createdAt: Date.now() - 3600000 // 1 hour ago
  });
  console.log(`✅ Added 2 Announcements (IDs: ${post1.id}, ${post2.id})`);

  // 3. Add One Past Event
  const pastEvent = await addDoc(collection(db, "events"), {
    clubId: clubId,
    clubName: "Test Verification Club",
    title: "Past Verification Seminar",
    description: "This event already happened. Used for testing past event UI.",
    date: "2023-01-15",
    time: "10:00 AM",
    venue: "Main Hall A",
    entryFee: 0,
    upiId: "testclub@upi",
    coordinatorIds: ["mock-coordinator-id"],
    createdAt: Date.now() - 86400000 * 30
  });
  console.log(`✅ Added Past Event (ID: ${pastEvent.id})`);

  // 4. Add One Current Event
  const currentEvent = await addDoc(collection(db, "events"), {
    clubId: clubId,
    clubName: "Test Verification Club",
    title: "Upcoming Verification Hackathon",
    description: "Join us for a 24-hour verification challenge! Bring your laptops.",
    date: "2026-12-15",
    time: "09:00 AM",
    venue: "Innovation Center",
    entryFee: 150,
    upiId: "testclub@upi",
    coordinatorIds: ["mock-coordinator-id"],
    createdAt: Date.now()
  });
  console.log(`✅ Added Current Event (ID: ${currentEvent.id})`);

  // 5. Add a Sample Registration for the current event
  const userId = "mock-student-id"; // Corresponds to the dev bypass student login
  const registrationId = `${currentEvent.id}_${userId}`;
  await setDoc(doc(db, "registrations", registrationId), {
    eventId: currentEvent.id,
    eventTitle: "Upcoming Verification Hackathon",
    clubId: clubId,
    clubName: "Test Verification Club",
    userId: userId,
    userName: "Demo Student",
    userEmail: "student@college.ac.in",
    fee: 150,
    status: "approved",
    createdAt: Date.now(),
    qrPayload: JSON.stringify({ registrationId, eventId: currentEvent.id, userId })
  });
  console.log(`✅ Added Sample Registration (ID: ${registrationId}) for Demo Student`);

  // 6. Ensure Membership exists for the coordinator and the student
  await setDoc(doc(db, "memberships", `mock-coordinator-id_${clubId}`), {
    userId: "mock-coordinator-id",
    clubId: clubId,
    joinedAt: Date.now()
  });
  
  await setDoc(doc(db, "memberships", `${userId}_${clubId}`), {
    userId: userId,
    clubId: clubId,
    joinedAt: Date.now()
  });
  console.log(`✅ Added Memberships for Coordinator and Student`);

  console.log("🎉 Seeding completed successfully!");
  process.exit(0);
}

seedDatabase().catch(console.error);
