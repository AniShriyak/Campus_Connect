# Diagnostic & Root-Cause Analysis Report

This report presents the findings of our diagnostic investigation into the club creation and mock data synchronization issues.

---

## 1. Phase 1: Diagnostic Investigation

### A. Root-Cause of Club Creation & Signup Hanging (Real Firebase Mode)
We wrote a diagnostic script (`scratch_diagnose.js`) to connect to your real Firebase project (`campusconnect-e5b5d`) and fetch collections using the credentials from your `.env` file. 

The connection returned the following error from Google:
> **PERMISSION_DENIED**: Cloud Firestore API has not been used in project `campusconnect-e5b5d` before or it is disabled. Enable it by visiting `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=campusconnect-e5b5d` then retry.

#### The Chain of Failure:
1. **Disabled API**: The Cloud Firestore API is not enabled in your Google Cloud / Firebase Project Console.
2. **Infinite Offline Queue**: Because the backend connection is rejected by Google, the Firebase SDK operates in offline mode.
3. **Promise Hangs**: By design, Firebase Firestore JS SDK queues write operations (`setDoc` on signup, `addDoc` on club creation) locally and wait indefinitely for a successful connection to commit the changes. The promise returned by `setDoc` or `addDoc` never resolves or rejects.
4. **Spinner Locks**: The UI state `isSubmitting` is set to `true`, but because the write promise never resolves/rejects, the code never enters the `catch` block or the `finally` block. The button remains disabled with a spinning loader forever.

### B. Firestore State Verification
1. **Is the document being created?** No, no documents can be created because the API is disabled on the server.
2. **Is it created partially?** No.
3. **Does the write fail?** It fails at the network level, but the client SDK does not raise an exception; it queues it silently.
4. **Does it remain pending?** Yes, it remains pending in the SDK's offline cache queue indefinitely.
5. **Evidence**:
   ```
   [2026-05-30T02:52:35.674Z]  @firebase/firestore: Firestore (12.13.0): GrpcConnection RPC 'Listen' stream 0x257118d4 error. Code: 7 Message: 7 PERMISSION_DENIED: Cloud Firestore API has not been used in project campusconnect-e5b5d before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=campusconnect-e5b5d
   ```

### C. Authentication State Verification
- **Is the user authenticated?** Yes. Firebase Authentication (Auth) is enabled and works correctly (credentials verify and return a valid user UID).
- **Is UID available?** Yes, `auth.currentUser.uid` is populated.
- **Is profile/role information available?** No. Because `setDoc` hung during signup, the coordinator's user document `/users/{uid}` was never written to Firestore. Thus, when logging in, the layout fetches a non-existent user profile, resulting in `profile` being `null`. This prevents the rules from validating coordinator access.

### D. Firestore Rules Inspection
In `firestore.rules`:
```javascript
function isCoordinator() {
  return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['coordinator', 'admin']);
}
```
- **Current rules allow write?** Yes, if the user has a document in the `/users` collection with the role `coordinator`.
- **Why it would fail even if API is enabled**: Since signup cannot write to `/users/{uid}`, the profile document is missing. When the security rule runs `get(...)` on the missing user document, it fails, so `isCoordinator()` returns false.

### E. Collection Names Verification
All screens write and read from identical collections:
- `clubs`: `/clubs` (consistent across all files)
- `users`: `/users` (consistent across all files)
- `events`: `/events` (consistent across all files)
- `posts`: `/posts` (consistent across all files)
- `registrations`: `/registrations` (consistent across all files)
There are no mismatches (e.g. no `clubs_v2` or `clubData`).

### F. Query Filters Verification
We audited all query filters:
- `explore.tsx`: No filters (fetches all clubs and events).
- `home.tsx`: Filters by joined clubs (`where('clubId', 'in', joinedClubs)`).
- `create.tsx` (managed clubs): Filters by coordinator ID (`where('coordinatorIds', 'array-contains', profile?.id)`).
There are no hidden/approval status checks blocking newly created clubs.

### G. Image Upload Dependency
- **Club Creation**: No Firebase Storage dependency exists for creating a club. The local banner and logo URIs are saved directly to Firestore.
- **Event Registration**: Storage upload is required for paid events (screenshot proof). If offline, this will also hang.

### H. State Refresh Logic
React Query invalidates the following keys on club creation:
- `['clubs']`
- `['managedClubs', profile?.id]`
Normally, this triggers an immediate refresh. Because the write hangs, this code is never reached.

---

## 2. Phase 2: Mock Mode Audit

### A. Current Mock System Analysis
- **Storage**: All mock data is stored in **in-memory JS arrays** (`MOCK_CLUBS`, `MOCK_EVENTS`, etc.) in `src/services/mockData.ts`.
- **Persistence**: None. Refreshing the browser or logging out and logging back in wipes all changes.

### B. Mock User Detection Audit
Fragile checks exist in the codebase:
- `(window as any)._mockUser` is checked in `search.tsx`, `home.tsx`, and `explore.tsx`.
- **Failures**: `window` properties do not survive page refreshes and are unreliable/undefined on native platforms (iOS/Android Hermit runtime).

### C. Screen Support Audit
Below is the status of each screen regarding mock mode support:

| Screen | File Path | Current Status |
| :--- | :--- | :--- |
| **Home** | `app/(student)/home.tsx` | Partial (Checks `_mockUser`, falls back to mock on query error) |
| **Explore** | `app/(student)/explore.tsx` | Partial (Checks `_mockUser`, falls back to mock on query error) |
| **Search** | `app/(student)/search.tsx` | Partial (Checks `_mockUser`, falls back to mock on query error) |
| **Student Profile** | `app/(student)/profile.tsx` | Good (Checks `profile?.id?.includes('mock')`) |
| **Event Details** | `app/(student)/event-details.tsx` | **Fails** (Queries Firestore only for event details; has no mock fallback for event lookup) |
| **Coordinator Profile** | `app/(coordinator)/profile.tsx` | **Fails** (Queries Firestore only; has no mock fallback for stats) |
| **Coordinator Hub** | `app/(coordinator)/hub.tsx` | **Fails** (Queries Firestore only; registrations and QR scanner have no mock logic) |
| **Club Registration** | `app/(coordinator)/create.tsx` | Good (Checks `profile?.id?.includes('mock')` and writes to memory) |

---

## 3. Phase 3: Proposed Fixes (Pending Your Signal)

If you give the **proceed signal**, we will implement the following changes:

1. **Persistent Mock Database**:
   - Save and load `MOCK_CLUBS`, `MOCK_EVENTS`, `MOCK_POSTS`, and `MOCK_REGISTRATIONS` using `AsyncStorage`.
   - Initialize them on app startup.
2. **Unified Mock Detection Helper**:
   - Create a central helper `isMockUser(profile, auth)` and replace all fragile `window._mockUser` checks in `explore.tsx`, `home.tsx`, `search.tsx`, and others.
3. **Firestore Write Timeout Wrapper**:
   - Wrap Firestore writes (`addDoc`, `setDoc`, `updateDoc`) with a 5-second timeout.
   - If they timeout, catch the error, write to the persistent local mock database, and notify the user with a local success popup instead of letting the spinner spin forever.
4. **Hub and Profile Screen Updates**:
   - Update `event-details.tsx`, `profile.tsx`, and `hub.tsx` to fully support mock data for statistics, scans, and registrations.
