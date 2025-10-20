import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { supabase } from '../utils/supabaseclient';

const Recovery = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handlePasswordReset = async () => {
    setMessage('');
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (resetError) {
        setError('Failed to send reset link. Please try again.');
        return;
      }

      setMessage('A password reset link has been sent to your email.');
      setCooldown(30); // Start 30-second cooldown
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>SensiCrib</Text>
        <Text style={styles.tagline}>Smart Care Starts Here.</Text>
        <Text variant="headlineMedium" style={styles.recoveryText}>Reset Your Password</Text>
      </View>

      <TextInput
        placeholder="Email"
        mode="outlined"
        style={styles.input}
        theme={{ roundness: 30 }}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <Button
        mode="contained"
        style={styles.button}
        labelStyle={{ color: '#000' }}
        onPress={handlePasswordReset}
        disabled={cooldown > 0}
      >
        {cooldown > 0 ? `Try again for ${cooldown}s` : 'Send Password Reset Link'}
      </Button>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0b4f6c',
  },
  header: {
    alignItems: 'center',
    marginTop: -20,
  },
  recoveryText: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 23,
    marginTop: 10,
  },
  input: {
    marginTop: 5,
    marginBottom: 10,
    width: 300,
    alignSelf: 'center',
  },
  button: {
    marginBottom: 16,
    width: 200,
    alignSelf: 'center',
    backgroundColor: '#fffff0',
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
  },
  linkText: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 64,
    color: '#fff',
    textShadowRadius: 4,
    fontFamily: 'SpicyRice',
  },
  tagline: {
    fontSize: 18,
    color: '#fff',
    marginTop: -15,
    fontStyle: 'italic',
  },
});

export default Recovery;