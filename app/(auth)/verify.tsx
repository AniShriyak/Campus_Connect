import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { functions, auth } from '../../src/services/firebase';

export default function VerifyScreen() {
  const { email, isSignup, fullName, college } = useLocalSearchParams();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) { Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP'); return; }
    setIsLoading(true);
    try {
      const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');
      const response = await verifyOTPFunction({
        email,
        otp,
        fullName,
        college,
        isSignup: isSignup === 'true'
      });
      const data = response.data as { customToken: string };
      await signInWithCustomToken(auth, data.customToken);
      // Navigation is handled automatically by RootLayout's auth listener
    } catch (e: any) { Alert.alert('Error', e.message || 'Verification failed'); } finally { setIsLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>
      <TextInput style={styles.input} placeholder="000000" keyboardType="number-pad" maxLength={6} onChangeText={setOtp} value={otp} textAlign="center" />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  input: { height: 60, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 32, letterSpacing: 8, backgroundColor: '#f9f9f9', marginBottom: 24 },
  button: { height: 50, backgroundColor: '#6B4CE6', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
