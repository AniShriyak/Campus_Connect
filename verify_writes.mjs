import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU",
  authDomain: "campusconnect-e5b5d.firebaseapp.com",
  projectId: "campusconnect-e5b5d",
  storageBucket: "campusconnect-e5b5d.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runTests() {
  const results = {
    "1. Auth": "Pending",
    "2. Write User Profile": "Pending",
    "3. Write Club": "Pending",
    "4. Write Membership": "Pending",
    "5. Write Registration": "Pending"
  };

  try {
    const testEmail = "test" + Date.now() + "@college.ac.in";
    const testPass = "password123";
    let user;
    try {
      const cred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
      user = cred.user;
      results["1. Auth"] = "YES - uid: " + user.uid;
    } catch(e) {
      results["1. Auth"] = "NO - " + e.message;
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        email: testEmail,
        roles: ["student"],
        createdAt: Date.now()
      });
      results["2. Write User Profile"] = "YES";
    } catch(e) {
      results["2. Write User Profile"] = "NO - " + e.message;
    }

    let clubId;
    try {
      // To create club we need coordinator role
      // Temporarily give coordinator role directly via setDoc
      await setDoc(doc(db, "users", user.uid), {
        email: testEmail,
        roles: ["student", "coordinator"],
        createdAt: Date.now()
      }, { merge: true });

      const clubRef = await addDoc(collection(db, "clubs"), {
        name: "Test Club",
        coordinatorIds: [user.uid],
        createdAt: Date.now()
      });
      clubId = clubRef.id;
      results["3. Write Club"] = "YES";
    } catch(e) {
      results["3. Write Club"] = "NO - " + e.message;
    }

    try {
      if(clubId) {
         // Create membership
         await setDoc(doc(db, "memberships", `${user.uid}_${clubId}`), {
            userId: user.uid,
            clubId: clubId,
            joinedAt: Date.now()
         });
         results["4. Write Membership"] = "YES";
      } else {
         results["4. Write Membership"] = "Skipped - no club created";
      }
    } catch(e) {
      results["4. Write Membership"] = "NO - " + e.message;
    }

    try {
       await setDoc(doc(db, "registrations", `event_${user.uid}`), {
         eventId: "event",
         userId: user.uid,
         status: "pending",
         createdAt: Date.now()
       });
       results["5. Write Registration"] = "YES";
    } catch(e) {
       results["5. Write Registration"] = "NO - " + e.message;
    }

  } finally {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }
}

runTests();
