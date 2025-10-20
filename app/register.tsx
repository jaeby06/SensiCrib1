import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import Toast from "react-native-toast-message";
import { supabase } from "../utils/supabaseclient";

const Register = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  

  const handleRegister = async () => {
    if (!email || !password || !username || !fullName || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all required fields.",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "The passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            phone_number: phoneNumber,
          },
        },
      });

      if (error) {
        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: error.message,
        });
        setLoading(false);
        return;
      }

      if (!user) {
        Toast.show({
          type: "error",
          text1: "Unexpected Error",
          text2: "User was not created.",
        });
        setLoading(false);
        return;
      }

      // ✅ No manual insert — rely on trigger to populate public.users

      Toast.show({
        type: "success",
        text1: "Registration Successful 🎉",
        text2: "You can now use the app.",
      });

      router.replace("/baby");
    } catch (error) {
      console.error("Registration error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'height' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
          >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.logoText}>SensiCrib</Text>
              <Text style={styles.tagline}>Smart Care Starts Here.</Text>
              <Text variant="headlineMedium" style={styles.registerText}>
                Create Your Account
              </Text>
            </View>

            <TextInput
              placeholder="Full Name"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={fullName}
              onChangeText={setFullName}
            />

            <TextInput
              placeholder="Username"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              placeholder="Phone Number"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <TextInput
              placeholder="Email"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              placeholder="Password"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoCapitalize="none"
              returnKeyType="done"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }              
            />

            <TextInput
              placeholder="Confirm Password"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 30 }}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="password"
              autoCapitalize="none"
              returnKeyType="done"
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
              theme={{ roundness: 30 }}
              labelStyle={{ color: '#000' }}
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
            >
              Register
            </Button>

            <View style={styles.footer}>
              <Text style={styles.linkText1}>Already have an account? </Text>
              <Text style={styles.linkText} onPress={() => router.push("/login")}>
                Login
              </Text>
            </View>
            <Toast />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    padding: 16,
    backgroundColor: "#0b4f6c",
  },
  scrollContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexGrow: 1 
  },
  header: {
    alignItems: "center",
  },
  registerText: {
    fontWeight: "bold",
    color: "#fff",
  },
  input: {
    marginBottom: 16,
    width: 280,
    alignSelf: "center",
    overflow: "hidden",
  },
  button: {
    marginBottom: 10,
    backgroundColor: "#fffff0",
    width: 150,
    alignSelf: "center",
    borderRadius: 30,
    paddingVertical: 0,
  },
  h1: {
    alignItems: "center",
    flexDirection: "row",
  },
  logoText: {
    fontSize: 64,
    color: "#fff",
    textShadowRadius: 4,
    fontFamily: "SpicyRice",
  },
  tagline: {
    fontSize: 18,
    color: "#fff",
    marginTop: -15,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    marginTop: 20,
  },
  linkText1: {
    color: "#fff",
  },
  linkText: {
    color: "#fff",
    textDecorationLine: "underline",
  },
});

export default Register;