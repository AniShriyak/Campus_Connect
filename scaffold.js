const fs = require('fs');
const path = require('path');

const files = {
  'app/index.tsx': `import { Redirect } from 'expo-router';\n\nexport default function Index() {\n  return <Redirect href="/(auth)/login" />;\n}\n`,
  'app/(auth)/signup.tsx': `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').regex(/^[^\s@]+@[^\s@]+\\.ac\\.in$/, 'Only .ac.in emails allowed'),
  college: z.string().min(2, 'College name required'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push({ pathname: '/(auth)/verify', params: { email: data.email, isSignup: 'true', fullName: data.fullName, college: data.college } });
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setIsLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join CampusConnect</Text>
      <View style={styles.formContainer}>
        <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="Full Name" onChangeText={onChange} value={value} />
        )} />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}

        <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="student@college.ac.in" keyboardType="email-address" autoCapitalize="none" onChangeText={onChange} value={value} />
        )} />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        <Controller control={control} name="college" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="College Name" onChangeText={onChange} value={value} />
        )} />
        {errors.college && <Text style={styles.errorText}>{errors.college.message}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24, textAlign: 'center' },
  formContainer: { width: '100%' },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 4 },
  errorText: { color: '#ff3b30', fontSize: 12, marginBottom: 12 },
  button: { height: 50, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center', padding: 8 },
  linkText: { color: '#007AFF', fontSize: 14, fontWeight: '500' }
});`,
  'app/(auth)/verify.tsx': `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function VerifyScreen() {
  const { email, isSignup, fullName, college } = useLocalSearchParams();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) { Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP'); return; }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mocking successful login routing
      if (isSignup === 'true') {
         router.replace('/(student)/home');
      } else {
         router.replace('/(student)/home');
      }
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setIsLoading(false); }
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
  button: { height: 50, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});`,
  'app/(student)/_layout.tsx': `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({color}) => <Ionicons name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({color}) => <Ionicons name="compass" size={24} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({color}) => <Ionicons name="search" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({color}) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}`,
  'app/(student)/home.tsx': `import { View, Text, StyleSheet } from 'react-native';

export default function StudentHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Feed</Text>
      <Text style={styles.subtitle}>Discover posts from joined clubs.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 }
});`,
  'app/(coordinator)/_layout.tsx': `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CoordinatorLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FF3B30' }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({color}) => <Ionicons name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: ({color}) => <Ionicons name="add-circle" size={24} color={color} /> }} />
      <Tabs.Screen name="hub" options={{ title: 'Hub', tabBarIcon: ({color}) => <Ionicons name="chatbubbles" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({color}) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}`,
  'app/(coordinator)/home.tsx': `import { View, Text, StyleSheet } from 'react-native';

export default function CoordinatorHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coordinator Dashboard</Text>
      <Text style={styles.subtitle}>Manage your clubs and events here.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 }
});`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log('Created: ' + filePath);
}
