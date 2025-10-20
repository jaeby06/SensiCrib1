import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <Link href="/login" dismissTo style={styles.link}>
        <ThemedText type="link">Go to Login</ThemedText>
      </Link>
      <Link href="/register" dismissTo style={styles.link}>
        <ThemedText type="link">Go to Signup</ThemedText>
      </Link>
      <Link href="/recovery" dismissTo style={styles.link}>
        <ThemedText type="link">Go to Recovery</ThemedText>
      </Link>
      <Link href="/baby" dismissTo style={styles.link}>
        <ThemedText type="link">Go to Baby</ThemedText>
      </Link>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});