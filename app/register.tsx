import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !username || !fullName || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all required fields.",
      });
      return;
    }

    if (!termsAccepted) {
      Toast.show({
        type: "error",
        text1: "Terms and Conditions",
        text2: "Please read and accept the Terms and Conditions.",
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

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    Toast.show({
      type: "success",
      text1: "Terms Accepted",
      text2: "Thank you for accepting our Terms and Conditions.",
    });
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
              secureTextEntry={!showPassword}
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
              secureTextEntry={!showPassword}
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

            <View style={styles.termsContainer}>
              <Checkbox
                status={termsAccepted ? 'checked' : 'unchecked'}
                onPress={() => {
                  if (!termsAccepted) {
                    setShowTermsModal(true);
                  } else {
                    setTermsAccepted(false);
                  }
                }}
                color="#fffff0"
              />
              <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                <Text style={styles.termsText}>Read our Terms and Conditions</Text>
              </TouchableOpacity>
            </View>

            <Button
              mode="contained"
              style={styles.button}
              theme={{ roundness: 30 }}
              labelStyle={{ color: '#000' }}
              onPress={handleRegister}
              loading={loading}
              disabled={!termsAccepted || loading} // Disable if terms not accepted or if loading
            >
              Register
            </Button>

            <View style={styles.footer}>
              <Text style={styles.linkText1}>Already have an account? </Text>
              <Text style={styles.linkText} onPress={() => router.push("/login")}>
                Login
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              onScroll={({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                if (isCloseToBottom && !hasReadTerms) {
                  setHasReadTerms(true);
                }
              }}
              scrollEventThrottle={400}
            >
              <Text style={styles.termsTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.termsBody}>
                By using the SensiCrib mobile application (hereinafter referred to as "the App"), you agree to comply with and be bound by the following terms and conditions. If you do not agree to these terms, please do not use the App.
              </Text>

              <Text style={styles.termsTitle}>2. User Responsibilities</Text>
              <Text style={styles.termsBody}>
                You are responsible for all activities that occur under your account, including the security of your account credentials. You agree to immediately notify us of any unauthorized use of your account.
              </Text>

              <Text style={styles.termsTitle}>3. Privacy Policy</Text>
              <Text style={styles.termsBody}>
                Your use of the App is governed by our Privacy Policy. By using the App, you consent to the collection, use, and sharing of your personal data as outlined in the Privacy Policy.
              </Text>

              <Text style={styles.termsTitle}>4. Device Pairing and Use</Text>
              <Text style={styles.termsBody}>
                The App allows you to pair with devices for the purpose of monitoring and managing environmental data (e.g., temperature, movement). You agree to use the devices and the App in accordance with the provided instructions and not for any unlawful or unauthorized purpose.
              </Text>

              <Text style={styles.termsTitle}>5. Data Accuracy</Text>
              <Text style={styles.termsBody}>
                While the App aims to provide accurate and real-time data, we do not guarantee the accuracy or reliability of the information provided through the App. You are responsible for verifying any critical data before making decisions based on it.
              </Text>

              <Text style={styles.termsTitle}>6. Limitations of Liability</Text>
              <Text style={styles.termsBody}>
                In no event shall we, or any of our partners, be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use or inability to use the App, whether based on warranty, contract, tort, or any other legal theory, even if we have been advised of the possibility of such damages.
              </Text>

              <Text style={styles.termsTitle}>7. Modifications to Terms</Text>
              <Text style={styles.termsBody}>
                We reserve the right to modify or update these Terms and Conditions at any time. Any changes will be reflected in the updated version of these terms, and it is your responsibility to review them regularly. By continuing to use the App after any changes, you agree to be bound by the updated Terms and Conditions.
              </Text>

              <Text style={styles.termsTitle}>8. Termination of Access</Text>
              <Text style={styles.termsBody}>
                We may suspend or terminate your access to the App at any time, without notice, for conduct that we believe violates these Terms and Conditions or is harmful to other users or the App itself.
              </Text>

              <Text style={styles.termsTitle}>9. Governing Law</Text>
              <Text style={styles.termsBody}>
                These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which the App operates, without regard to its conflict of law principles.
              </Text>

              <Text style={styles.termsTitle}>10. Contact Information</Text>
              <Text style={styles.termsBody}>
                If you have any questions about these Terms and Conditions, please contact us at:
              </Text>
              <Text style={styles.termsBody}>• Email: support@sensicrib.com</Text>
              <Text style={styles.termsBody}>• Phone: +1 (123) 456-7890</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="contained"
                onPress={handleAcceptTerms}
                style={[styles.acceptButton, !hasReadTerms && styles.disabledButton]}
                disabled={!hasReadTerms}
                labelStyle={{ color: hasReadTerms ? '#000' : '#666' }}
              >
                Accept
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowTermsModal(false)}
                style={styles.declineButton}
                textColor="#0b4f6c"
              >
                Decline
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
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
    flexGrow: 1,
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
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: -8,
  },
  termsText: {
    color: "#fff",
    textDecorationLine: "underline",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0b4f6c",
  },
  closeButton: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
  },
  modalContent: {
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0b4f6c",
    marginTop: 12,
    marginBottom: 8,
  },
  termsBody: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 16,
  },
  acceptButton: {
    backgroundColor: "#fffff0",
    borderRadius: 30,
    flex: 1,
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  declineButton: {
    borderColor: "#0b4f6c",
    borderRadius: 30,
    flex: 1,
    marginLeft: 8,
  },
});

export default Register;
