// @ts-nocheck
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as z from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  college: z.string().min(2, 'College name required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'coordinator'>('student');

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      college: '',
      email: '',
      password: '',
    }
  });

  const { setProfile, setUser } = useAuthStore();

  const handleDevSignup = async (devRole: 'student' | 'coordinator') => {
    setIsLoading(true);
    try {
      const mockProfile = {
        id: devRole === 'student' ? 'mock-student-id' : 'mock-coordinator-id',
        fullName: devRole === 'student' ? 'Demo Student' : 'Demo Coordinator',
        email: devRole === 'student' ? 'student@college.ac.in' : 'coordinator@college.ac.in',
        college: 'Campus Connect University',
        roles: [devRole],
        interests: ['Robotics', 'Coding', 'Music'],
        joinedClubs: devRole === 'student' ? ['club-1', 'club-2'] : ['club-1'],
        createdAt: Date.now()
      };
      
      await AsyncStorage.setItem('@mock_profile', JSON.stringify(mockProfile));
      
      if (typeof window !== 'undefined') {
        (window as any)._mockUser = true;
      }
      
      setUser({ uid: mockProfile.id, email: mockProfile.email } as any);
      setProfile(mockProfile);
    } catch (err) {
      Alert.alert('Bypass Failed', 'Could not save mock session.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      let uid;
      if (auth.currentUser && auth.currentUser.email === data.email) {
        uid = auth.currentUser.uid;
      } else {
        if (auth.currentUser) {
          await signOut(auth);
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        uid = userCredential.user.uid;
      }

      const profileData = {
        email: data.email,
        fullName: data.fullName,
        college: data.college,
        roles: [role],
        interests: [],
        joinedClubs: [],
        createdAt: Date.now()
      };

      // Save profile to firestore
      await setDoc(doc(db, 'users', uid), profileData);

      // Update global store to trigger navigation
      setProfile({ id: uid, ...profileData });

    } catch (e: any) {
      console.error('Signup Error Details:', e.code, e.message);
      Alert.alert(
        'Signup Error',
        `Code: ${e.code}\nMessage: ${e.message || 'Failed to create account.'}\n\nTip: If it says "invalid-api-key", try restarting your Metro bundler.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Join CampusConnect</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Full Name</Text>
        <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="e.g., John Doe" onChangeText={onChange} value={value} />
        )} />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName?.message as string}</Text>}

        <Text style={styles.label}>College Name</Text>
        <Controller control={control} name="college" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="e.g., MIT, Stanford" onChangeText={onChange} value={value} />
        )} />
        {errors.college && <Text style={styles.errorText}>{errors.college?.message as string}</Text>}

        <Text style={styles.label}>Email Address</Text>
        <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="e.g., john@example.com" keyboardType="email-address" autoCapitalize="none" onChangeText={onChange} value={value} />
        )} />
        {errors.email && <Text style={styles.errorText}>{errors.email?.message as string}</Text>}

        <Text style={styles.label}>Password</Text>
        <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="Enter a secure password" secureTextEntry autoCapitalize="none" onChangeText={onChange} value={value} />
        )} />
        {errors.password && <Text style={styles.errorText}>{errors.password?.message as string}</Text>}

        <Text style={styles.label}>Register As</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'student' && styles.roleActive]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'coordinator' && styles.roleActive]}
            onPress={() => setRole('coordinator')}
          >
            <Text style={[styles.roleText, role === 'coordinator' && styles.roleTextActive]}>Coordinator</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={async () => {
          if (auth.currentUser) await signOut(auth);
          router.push('/(auth)/login');
        }}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>

        <View style={styles.devBypassContainer}>
          <Text style={styles.devBypassTitle}>Developer Bypass (Mock Mode)</Text>
          <Text style={styles.devBypassSubtitle}>Instant signup bypass for local testing on Web/Expo Go.</Text>
          <View style={styles.devBypassButtons}>
            <TouchableOpacity style={[styles.devButton, { backgroundColor: '#FF3B30' }]} onPress={() => handleDevSignup('student')}>
              <Text style={styles.devButtonText}>Student Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devButton, { backgroundColor: '#6B4CE6' }]} onPress={() => handleDevSignup('coordinator')}>
              <Text style={styles.devButtonText}>Coordinator Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F5F3FF', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24, textAlign: 'center' },
  formContainer: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#fff', marginBottom: 4 },
  errorText: { color: '#ff3b30', fontSize: 12, marginBottom: 8 },
  button: { height: 50, backgroundColor: '#6B4CE6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center', padding: 8 },
  linkText: { color: '#6B4CE6', fontSize: 14, fontWeight: '600' },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F2',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#636366',
  },
  roleTextActive: {
    color: '#6B4CE6',
  },
  devBypassContainer: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  devBypassTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  devBypassSubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  devBypassButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  devButton: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
