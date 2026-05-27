// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/services/firebase';

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
  
  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({ 
    resolver: zodResolver(signupSchema) 
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Save profile to firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: data.email,
        fullName: data.fullName,
        college: data.college,
        roles: ['student'],
        createdAt: new Date().toISOString()
      });
      
      // Firebase auth state listener in _layout.tsx will handle the redirect to home
    } catch (e: any) { 
      Alert.alert('Signup Error', e.message || 'Failed to create account.'); 
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

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24, textAlign: 'center' },
  formContainer: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 4 },
  errorText: { color: '#ff3b30', fontSize: 12, marginBottom: 8 },
  button: { height: 50, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center', padding: 8 },
  linkText: { color: '#007AFF', fontSize: 14, fontWeight: '500' }
});