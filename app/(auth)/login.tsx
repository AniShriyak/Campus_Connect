// @ts-nocheck
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as z from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setProfile } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.log('[LOGIN_DIAGNOSTIC] 1. Starting login process for:', data.email);
    setIsLoading(true);
    try {
      console.log('[LOGIN_DIAGNOSTIC] 2. Calling signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('[LOGIN_DIAGNOSTIC] 3. signInWithEmailAndPassword success! user.uid:', result.user.uid);
      // Firebase auth state listener in _layout.tsx will handle the redirect
    } catch (error: any) {
      console.error('[LOGIN_DIAGNOSTIC] Error Details:', error.code, error.message);
      Alert.alert(
        'Login Failed',
        `Code: ${error.code}\nMessage: ${error.message || 'Please check your credentials and try again.'}\n\nTip: If it says "invalid-api-key", try restarting your Metro bundler.`
      );
    } finally {
      console.log('[LOGIN_DIAGNOSTIC] 4. Login function finally block reached.');
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (role: 'student' | 'coordinator') => {
    setIsLoading(true);
    try {
      const mockProfile = {
        id: role === 'student' ? 'mock-student-id' : 'mock-coordinator-id',
        fullName: role === 'student' ? 'Demo Student' : 'Demo Coordinator',
        email: role === 'student' ? 'student@college.ac.in' : 'coordinator@college.ac.in',
        college: 'Campus Connect University',
        roles: [role],
        interests: ['Robotics', 'Coding', 'Music'],
        joinedClubs: role === 'student' ? ['club-1', 'club-2'] : ['club-1'],
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

  const handleClearData = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await signOut(auth);
      if (typeof window !== 'undefined') {
        (window as any)._mockUser = false;
      }
      useAuthStore.getState().logout();
      Alert.alert('Success', 'All local mock data and sessions have been cleared!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to clear data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CampusConnect</Text>
      <Text style={styles.subtitle}>Welcome back! Log in to continue.</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email Address</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="e.g., john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>

        <View style={styles.devBypassContainer}>
          <Text style={styles.devBypassTitle}>Developer Bypass (Mock Mode)</Text>
          <Text style={styles.devBypassSubtitle}>Instant login bypass for local testing on Web/Expo Go.</Text>
          <View style={styles.devBypassButtons}>
            <TouchableOpacity style={[styles.devButton, { backgroundColor: '#FF3B30' }]} onPress={() => handleDevLogin('student')}>
              <Text style={styles.devButtonText}>Student Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devButton, { backgroundColor: '#6B4CE6' }]} onPress={() => handleDevLogin('coordinator')}>
              <Text style={styles.devButtonText}>Coordinator Mode</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.devButton, { backgroundColor: '#333', marginTop: 8, width: '100%' }]} onPress={handleClearData}>
            <Text style={styles.devButtonText}>Clear All Data & Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginBottom: 8,
  },
  button: {
    height: 50,
    backgroundColor: '#6B4CE6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#6B4CE6',
    fontSize: 14,
    fontWeight: '600',
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
