import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors'; // Import this
import { supabase } from '../utils/supabaseclient';

const Landing = () => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        return;
      }

      if (session?.user) {
        // Check if baby record exists
        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (babyError) {
          console.error('Baby check error:', babyError);
          return;
        }

        if (babyData) {
          router.replace(`/connect?babyId=${babyData.baby_id}`);
        } else {
          router.replace('/baby');
        }
      }
    };

    checkSession();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 30}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.h1}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.logoText}>SensiCrib</Text>
            <Text style={styles.tagline}>Smart Care Starts Here.</Text>
          </View>

          <Button
            mode="contained"
            style={styles.button}
            labelStyle={{ color: '#000' }}
            onPress={() => router.push('/login')}
          >
            Login
          </Button>

          <Button
            mode="outlined"
            style={[styles.button, { marginTop: 10 }]}
            labelStyle={{ color: '#000' }}
            onPress={() => router.push('/register')}
          >
            Sign Up
          </Button>

          <View style={styles.footer}>
            <Text style={styles.linkText} onPress={() => router.push('/about')}>
              How to use SensiCrib
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    backgroundColor: Colors.sensiBlue, // Replaced '#0b4f6c'
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: -20,
  },
  button: {
    width: 160,
    alignSelf: 'center',
    backgroundColor: Colors.sensiCream, // Replaced '#fffff0'
  },
  h1: {
    alignItems: 'center',
  },
  footer: {
    marginTop: 20,
  },
  linkText: {
    color: '#fff',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  logo: {
    width: '100%',        // Use percentage instead of fixed 385
    aspectRatio: 1.33,   // Maintain the width/height ratio (385/289 ≈ 1.33)
    height: undefined,   // Let aspect ratio calculate the height
    marginBottom: -50,
    resizeMode: 'contain', // Ensure it doesn't get cut off
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
    marginBottom: 30,
  },
});

export default Landing;