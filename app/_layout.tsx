// @ts-nocheck
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { app, auth, db } from '../src/services/firebase';
import { useAuthStore, UserProfile } from '../src/store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { useNotifications } from '../src/hooks/use-notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, profile, isLoading, setUser, setProfile, setLoading } = useAuthStore();
  const segments = useSegments() as string[];
  const router = useRouter();

  // Register push notifications
  useNotifications();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // User authenticated but no profile exists, meaning they are in the signup flow
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // Not logged in -> redirect to login
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (user && !profile) {
      // Logged in but no profile -> redirect to complete signup
      if (segments[1] !== 'signup') router.replace('/(auth)/signup');
    } else if (user && profile) {
      // Fully logged in
      if (inAuthGroup) {
        // Redirect based on role
        if (profile.roles.includes('coordinator') || profile.roles.includes('admin')) {
          router.replace('/(coordinator)/home');
        } else {
          router.replace('/(student)/home');
        }
      }
    }
  }, [user, profile, isLoading, segments]);

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
      </Stack>
    </QueryClientProvider>
  );
}
