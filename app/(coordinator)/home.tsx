import { View, Text, StyleSheet } from 'react-native';

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
});