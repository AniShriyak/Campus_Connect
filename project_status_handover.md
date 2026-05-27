# CampusConnect Status & Handover Document

## Current Status (Paused)

The project initialization and backend structural setup have been successfully completed. We paused during the UI scaffolding phase to ensure a clean checkpoint for future execution.

### ✅ What Has Been Done

1. **Project Initialization (Phase 1)**
   - Initialized React Native Expo project using `expo-template-default` (Expo Router + TypeScript).
   - Core libraries successfully installed: `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `react-native-reanimated`, Expo camera/image tools, and `firebase`.

2. **Firebase Setup (Phase 2)**
   - Generated `src/services/firebase.ts` with correct configuration for Project ID `campusconnect-e5b5d`.
   - Setup `firestore.rules` containing robust Role-Based Access Control (RBAC) separating Student, Coordinator, and Admin logic.

3. **Core App Architecture & Auth Scaffolding (Phase 3 - Partial)**
   - Created the Zustand global auth store (`src/store/useAuthStore.ts`) tracking `user`, `profile`, and `roles`.
   - Setup the Root Layout routing logic (`app/_layout.tsx`) that enforces authentication and role-based redirects.
   - Scaffolded the base Authentication screens (`app/(auth)/login.tsx`, `signup.tsx`, `verify.tsx`) with College Email (`.ac.in`) Zod validation and React Hook Form.
   - Scaffolded the foundational tab layouts for both roles:
     - Student Tabs: `app/(student)/_layout.tsx`, `home.tsx`
     - Coordinator Tabs: `app/(coordinator)/_layout.tsx`, `home.tsx`

---

## 🎯 Plan of Action (Next Steps)

When resuming, start from here to avoid any confusion or repetition.

### 1. Complete Remaining UI Scaffolding
- **Student Screens**: `explore.tsx`, `search.tsx`, `profile.tsx` inside `app/(student)/`.
- **Coordinator Screens**: `create.tsx`, `hub.tsx`, `profile.tsx` inside `app/(coordinator)/`.

### 2. Custom Auth Flow Integration
- Link the UI's "Send OTP" logic to a backend mechanism.
- *Requirement*: Create a custom Firebase Cloud Function to generate a 6-digit OTP, send it to the `.ac.in` email (via Nodemailer or equivalent), and verify it upon submission (handling the 10 min TTL and lockout rules).

### 3. Feature Implementations
- **Clubs & Feed**: Build the infinite scroll feed utilizing React Query for fetching posts. Create "Join Club" and "Create Post" views.
- **Events & Payments (UPI)**: Build the Event Details view. Add logic for users to upload UPI proof (using `expo-image-picker`) and upload it to Firebase Storage under `/paymentProofs`.
- **QR Attendance**: Generate a deterministic JSON payload into a QR code upon event confirmation. Implement the `expo-camera` scanner in the Coordinator Hub to validate attendance.

### 4. Cloud Functions & Polish
- Write a Cloud Function using `pdfkit` to generate PDF certificates upon successful event attendance.
- Implement Firebase Cloud Messaging (FCM) notifications.
- Apply micro-animations and final polish to the UI.

> [!TIP]
> When executing the next UI steps, consider executing UI scaffolding via local scripts or batch operations to prevent IDE hook timeouts (the "Step was canceled by user" issue).
