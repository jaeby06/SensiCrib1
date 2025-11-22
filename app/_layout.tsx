import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 1. Setup Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    FredokaBold: require('../assets/fonts/Fredoka-VariableFont_wdth,wght.ttf'),
    SpicyRice: require('../assets/fonts/SpicyRice-Regular.ttf'),
  });

  // 2. Configure Android Channel
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
      }
    };

    setupNotifications();
  }, []);

  // 3. Configure Audio & Start Background Loop
useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          // [CHANGE] Set this to 2 (Duck Others) instead of 1
          interruptionModeAndroid: 2, 
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio mode configured');

        // [TESTING] Set volume to 0.1 initially to CONFIRM it is working, then set back to 0
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/alert.mp3'),
          { isLooping: true, volume: 0 } 
        );
        await sound.playAsync();
        console.log('🔊 Background keep-alive started');

      } catch (error) {
        console.warn('⚠️ Audio configuration failed:', error);
      }
    };

    if (fontsLoaded) {
      configureAudio();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ title: 'Welcome', headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Register', headerShown: false }} />
        <Stack.Screen name="recovery" options={{ title: 'Password Recovery', headerShown: false }} />
        <Stack.Screen name="baby" options={{ title: 'Baby', headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Connect', headerShown: false }} />
        <Stack.Screen name="qr" options={{ title: 'Qr', headerShown: false }} />
        <Stack.Screen name="babyinfo" options={{ title: 'Baby Info', headerShown: false }} />
        <Stack.Screen name="about" options={{ title: 'About', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="auto" />
      <Toast />
    </ThemeProvider>
  );
}