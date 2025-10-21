import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // ✅ Load fonts here
  const [fontsLoaded] = useFonts({
    FredokaBold: require('../assets/fonts/Fredoka-VariableFont_wdth,wght.ttf'),
    SpicyRice: require('../assets/fonts/SpicyRice-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return null; // Or return a <SplashScreen />
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