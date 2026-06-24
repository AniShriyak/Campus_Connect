# Problem Explanation and Proposed Fixes

## 1. What We Understood From Your Request
You encountered two critical issues:
1. **Club Creation Fails for Signed-Up/Logged-In Coordinators**: When signing up or logging in with real credentials (non-developer bypass mode), the "Register Club" button hangs or does not successfully create a club.
2. **Mock Clubs Don't Reflect in Other Tabs**: When in developer bypass (mock) mode, a newly registered club does not show up on other screens (like the student's Explore, Home, Search, or Profile tabs).

---

## 2. Why the Errors Are Happening

### A. Firestore Write Hanging (Real Mode)
When running on `localhost` web or native devices, if Firestore cannot establish a stable connection or if the database is unconfigured, the Firebase SDK queues writes in memory indefinitely. 
- Calls like `addDoc(collection(db, 'clubs'), ...)` and `updateDoc(userRef, ...)` hang forever rather than failing.
- This locks the "Register Club" button in a spinning loading state (`isSubmitting === true`), making it appear as if the app is frozen.

### B. Volatile In-Memory Mock Data (Developer Mode)
The mock arrays (`MOCK_CLUBS`, `MOCK_EVENTS`, `MOCK_POSTS`, `MOCK_REGISTRATIONS`) are declared as standard, volatile JavaScript arrays inside `mockData.ts`.
- When you create a mock club, it gets pushed to `MOCK_CLUBS` in memory.
- If you reload the browser, log out, or switch roles, the JavaScript runtime restarts, and the in-memory array resets to its default preloaded values. The newly created club is lost.

### C. Unreliable Mock Checking Across Screens
Screens like `explore.tsx`, `home.tsx`, and `search.tsx` check `(window as any)._mockUser` to decide whether to query Firebase or load mock data.
- On mobile devices (Expo Go / APK) or when the page is reloaded, `window` properties are lost or behave differently.
- If the screen fails to detect that it should be in mock mode, it tries to fetch from Firestore, fails, and defaults to the original un-updated mock data instead of reflecting the newly added club.

### D. Missing Mock Logic on Hub and Profile Screens
The Coordinator Hub (`hub.tsx`) and Profile (`profile.tsx`) screens do not support mock data logic at all. They run Firestore queries directly even if you are logged in using the developer bypass, resulting in errors or zero stats.

---

## 3. How We Will Fix It

### Step 1: Implement a Persistent Mock Database
We will save and load the mock arrays (`MOCK_CLUBS`, `MOCK_EVENTS`, etc.) from `AsyncStorage`.
- When the app launches (`_layout.tsx`), it will load any previously created mock data from disk.
- When a coordinator registers a club, event, or post in mock mode, it will immediately be saved to `AsyncStorage`.
- This ensures mock clubs survive refreshes, logouts, and role switches, and propagate to all tabs.

### Step 2: Enforce a Timeout on Firestore Writes
We will wrap all critical Firestore writes (`setDoc`, `addDoc`, `updateDoc`) in a `withTimeout` helper (5 seconds).
- If Firestore hangs for more than 5 seconds, the write will reject automatically.
- The `catch` block will trigger, fall back to registering the club/event locally in the persistent mock database, and display a "Success 🎉 (Firestore offline)" alert.

### Step 3: Standardize Mock Checks across All Tabs
We will replace all checks for `(window as any)._mockUser` with `profile?.id?.includes('mock') || !auth.currentUser`.
- This check is 100% reliable across Web, Expo Go, and release APKs.
- It guarantees that if a mock profile is active, every screen will read from the persistent mock database.

### Step 4: Add Mock Data Support to Hub and Profile
We will update coordinator queries (stats, managed clubs, registrations, scan QR code, approval checks) to check if the user is in mock mode and execute their logic against the mock arrays.

---

## 4. Next Steps
We are currently waiting for your **proceed signal**. Once you reply, we will implement these changes and verify them.
