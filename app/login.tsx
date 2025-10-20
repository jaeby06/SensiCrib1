import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../utils/supabaseclient';

const Login = () => {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValid = username.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    const name = username.trim();
    if (!isValid) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please enter username and password' });
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      console.log("Searching for username:", name);

      // Use RPC function for secure, unauthenticated username-to-email lookup
      const { data: email, error: rpcError } = await supabase
        .rpc('get_user_email_by_username', { p_username: name });

      console.log("RPC Email:", email);
      console.log("RPC Error:", rpcError);

      if (rpcError || !email) {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: 'Username not found' });
        setLoading(false);
        return;
      }

      // Authenticate user with the fetched email and provided password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password,
      });

      if (error) {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: error.message });
        setLoading(false);
        return;
      }

      if (data?.user) {
        Toast.show({ type: 'success', text1: 'Welcome', text2: `Hello ${name}` });

        // Now that we're authenticated, check if there's a baby record for this user
        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', data.user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle zero rows gracefully

        console.log("Baby Data:", babyData);
        console.log("Baby Error:", babyError);

        // Handle actual errors (not just "no rows")
        if (babyError) {
          console.error('Error fetching baby data:', babyError);
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load profile data' });
          setLoading(false);
          return;
        }

        if (!babyData) {
          // No baby found, redirecting to /baby
          router.replace('/baby');
        } else {
          // Baby already exists, go directly to /connect with babyId
          console.log('Baby found, redirecting to /connect');
          router.replace(`/connect?babyId=${babyData.baby_id}`);
        }
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: 'Unknown response from server' });
      }
    } catch (err) {
      console.error('Login error:', err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 30}
      style={{ flex: 1 }}
    >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.h1}>
              <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>

            <View style={styles.header}>
              <Text style={styles.logoText}>SensiCrib</Text>
              <Text style={styles.tagline}>Smart Care Starts Here.</Text>
            </View>
            <TextInput
              placeholder="Username"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="sentences"
              returnKeyType="next"
              editable={!loading}
            />
            <TextInput
              placeholder="Password"
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              theme={{ roundness: 30 }}
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoCapitalize="none"
              returnKeyType="done"
              editable={!loading}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              mode="contained"
              style={styles.button}
              labelStyle={{ color: '#000' }}
              onPress={handleLogin}
              disabled={!isValid || loading}
            >
              {loading ? <ActivityIndicator color="#000" /> : 'Login'}
            </Button>

            <View style={styles.footer}>
              <Text style={styles.linkText} onPress={() => router.push('/recovery')}>
                Forgot Password?
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.linkText1}>Doesn't have an account? </Text>
              <Text style={styles.linkText} onPress={() => router.push('/register')}>
                Sign up
              </Text>
            </View>
            <Toast />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    backgroundColor: '#0b4f6c',
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexGrow: 1 
  },
  header: {
    alignItems: 'center',
    marginTop: -20,
  },
  input: {
    marginBottom: 16,
    width: '90%',
    alignSelf: 'center',
  },
  button: {
    width: 120,
    alignSelf: 'center',
    marginBottom: 5,
    backgroundColor: '#fffff0',
  },
  h1: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  linkText1: {
    color: '#fff',
  },
  linkText: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  logo: {
    width: 385,
    height: 289,
    marginBottom: -50,
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
    marginTop: -20,
    fontStyle: 'italic',
    marginBottom: 10,
  },
});

export default Login;