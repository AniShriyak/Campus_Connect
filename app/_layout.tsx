import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNotifications } from '../src/hooks/use-notifications';
import { auth, db } from '../src/services/firebase';
import { useAuthStore, initializeActiveRole } from '../src/store/useAuthStore';
import { UserProfile } from '../src/types';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, profile, activeRole, isLoading, setUser, setProfile, setLoading } = useAuthStore();
  const segments = useSegments() as string[];
  const router = useRouter();

  // Register push notifications
  useNotifications();

  useEffect(() => {
    let active = true;
    let unsubscribeFn: (() => void) | null = null;
    
    const initAuth = async () => {
      await initializeActiveRole(); // Load saved role preference

      unsubscribeFn = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[LAYOUT_DIAGNOSTIC] onAuthStateChanged fired. User:', firebaseUser ? firebaseUser.uid : 'null');
        if (!active) return;

        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            console.log(`[LAYOUT_DIAGNOSTIC] Fetching users/${firebaseUser.uid} ...`);
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            console.log(`[LAYOUT_DIAGNOSTIC] userDoc exists:`, userDoc.exists());
            if (userDoc.exists() && active) {
              const data = userDoc.data();
              console.log(`[LAYOUT_DIAGNOSTIC] Hydrating profile. Roles:`, data.roles);
              setProfile({ id: firebaseUser.uid, ...data } as UserProfile);
            } else if (active) {
              console.log(`[LAYOUT_DIAGNOSTIC] Profile not found. Setting profile to null.`);
              setProfile(null);
            }
          } catch (error) {
            console.error("[LAYOUT_DIAGNOSTIC] Error fetching user profile:", error);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        if (active) setLoading(false);
      });
    };

    initAuth();

    return () => {
      active = false;
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    console.log(`[LAYOUT_DIAGNOSTIC] Routing check - user: ${!!user}, profile: ${!!profile}, activeRole: ${activeRole}, current segment: ${segments[0]}`);

    if (!user) {
      // Not logged in -> redirect to login
      if (!inAuthGroup) {
        console.log(`[LAYOUT_DIAGNOSTIC] Redirecting to /(auth)/login`);
        router.replace('/(auth)/login');
      }
    } else if (user && !profile) {
      // Logged in but no profile -> redirect to complete signup
      if (segments[1] !== 'signup') {
        console.log(`[LAYOUT_DIAGNOSTIC] Redirecting to /(auth)/signup (No profile)`);
        router.replace('/(auth)/signup');
      }
    } else if (user && profile) {
      // Fully logged in
      if (inAuthGroup || segments[0] === '(student)' || segments[0] === '(coordinator)') {
        // Enforce active role navigation if user lands on wrong layout or just logged in
        if (activeRole === 'coordinator') {
          if (segments[0] !== '(coordinator)') {
             console.log(`[LAYOUT_DIAGNOSTIC] Enforcing coordinator layout. Redirecting...`);
             router.replace('/(coordinator)/' as any);
          }
        } else {
          if (segments[0] !== '(student)') {
             console.log(`[LAYOUT_DIAGNOSTIC] Enforcing student layout. Redirecting...`);
             router.replace('/(student)/explore' as any);
          }
        }
      }
    }
  }, [user, profile, activeRole, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="(coordinator)" options={{ headerShown: false }} />
        <Stack.Screen name="club/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ticket/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
