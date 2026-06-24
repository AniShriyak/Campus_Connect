import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU",
  authDomain: "campusconnect-e5b5d.firebaseapp.com",
  projectId: "campusconnect-e5b5d",
  storageBucket: "campusconnect-e5b5d.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTests() {
  const results = {
    "1. Can u read Firestore?": "Pending",
    "2. Can u create a users document?": "Pending",
    "3. Can u create a clubs document?": "Pending",
    "4. Can u query clubs?": "Pending",
    "5. Are Firestore security rules allowing writes?": "Pending"
  };

  try {
    // 1. Read Firestore
    try {
      const clubsSnap = await getDocs(collection(db, "clubs"));
      results["1. Can u read Firestore?"] = "YES - Found " + clubsSnap.size + " clubs.";
    } catch (e) {
      results["1. Can u read Firestore?"] = "NO - " + e.message;
    }

    // 2. Create users document
    try {
      const testUserId = "test-verification-user-" + Date.now();
      await setDoc(doc(db, "users", testUserId), {
        email: "test@example.com",
        roles: ["student"],
        createdAt: Date.now()
      });
      results["2. Can u create a users document?"] = "YES";
    } catch (e) {
      results["2. Can u create a users document?"] = "NO - " + e.message;
    }

    // 3. Create clubs document
    try {
      const docRef = await addDoc(collection(db, "clubs"), {
        name: "Test Verification Club",
        category: "Tech",
        createdAt: Date.now()
      });
      results["3. Can u create a clubs document?"] = "YES - ID: " + docRef.id;
    } catch (e) {
      results["3. Can u create a clubs document?"] = "NO - " + e.message;
    }

    // 4. Query clubs
    try {
      const snap = await getDocs(collection(db, "clubs"));
      results["4. Can u query clubs?"] = "YES - " + snap.docs.length + " clubs retrieved.";
    } catch (e) {
      results["4. Can u query clubs?"] = "NO - " + e.message;
    }

    // 5. Check if writes allowed
    if (results["2. Can u create a users document?"].startsWith("YES") && results["3. Can u create a clubs document?"].startsWith("YES")) {
      results["5. Are Firestore security rules allowing writes?"] = "YES - Writes succeeded without permission denied errors.";
    } else {
      results["5. Are Firestore security rules allowing writes?"] = "NO - Writes failed. You may need to update Firestore security rules.";
    }

  } catch (error) {
    console.error("Global Test Error:", error);
  } finally {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }
}

runTests();
