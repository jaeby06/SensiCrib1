import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const UserInstructions = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Sensicrib Mobile App - User Instructions</Text>

        {/* 1. Setting Up the ESP Device */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Setting Up the ESP Device</Text>
          <Text style={styles.text}>Step 1: Connect to the ESP Device's Wi-Fi</Text>
          <Text style={styles.text}>
            1. Turn on the Sensicrib device. The device will broadcast a Wi-Fi network (e.g., **SensiCrib Device**).
          </Text>
          <Text style={styles.text}>
            2. On your phone, go to your Wi-Fi settings and find the ESP device's network (e.g., **SensiCrib Device**).
          </Text>
          <Text style={styles.text}>3. Tap on the ESP device's network to connect.</Text>
          <Text style={styles.text}>4. Enter the password for the device (e.g., **sensicrib123**) to establish the connection.</Text>

          <Text style={styles.text}>Step 2: Access the Web Portal</Text>
          <Text style={styles.text}>1. Once connected to the ESP device's Wi-Fi, open your browser.</Text>
          <Text style={styles.text}>2. The web portal should automatically load, or you can enter the device's IP (usually `192.168.4.1`).</Text>

          <Text style={styles.text}>Step 3: Connect to Your Home Wi-Fi</Text>
          <Text style={styles.text}>1. In the web portal, tap **Connect to Wi-Fi**.</Text>
          <Text style={styles.text}>2. Select your home Wi-Fi network and input your Wi-Fi password.</Text>
          <Text style={styles.text}>3. Tap **Connect** to connect the device to your Wi-Fi network.</Text>

          <Text style={styles.text}>Step 4: Log In</Text>
          <Text style={styles.text}>1. After connecting to Wi-Fi, the web portal will prompt you to log in to your Sensicrib account.</Text>
        </View>

        {/* 2. Account Creation & Login */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Account Creation & Login</Text>
          <Text style={styles.text}>Step 1: Create an Account</Text>
          <Text style={styles.text}>1. Open the app and tap **Sign Up**.</Text>
          <Text style={styles.text}>2. Enter your details: Full Name, Username, Email, Password, Phone Number.</Text>
          <Text style={styles.text}>3. Tap **Register** to complete the registration process.</Text>

          <Text style={styles.text}>Step 2: Log In</Text>
          <Text style={styles.text}>1. If you already have an account, tap **Login**.</Text>
          <Text style={styles.text}>2. Enter your **Username** and **Password**.</Text>
          <Text style={styles.text}>3. Tap **Login** to access the app.</Text>

          <Text style={styles.text}>*Note: You must create an account and log in before setting up the baby profile or pairing a device.*</Text>
        </View>

        {/* 3. Baby Profile Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Baby Profile Setup</Text>
          <Text style={styles.text}>Step 1: Set Up Your Baby Profile</Text>
          <Text style={styles.text}>1. Once logged in, you'll be prompted to **Add Baby Information**.</Text>
          <Text style={styles.text}>2. Enter the following details: Baby's Name, Gender (Male, Female, Prefer not to say), Birthdate.</Text>
          <Text style={styles.text}>3. Tap **Save** to complete the profile setup.</Text>

          <Text style={styles.text}>*Note: You can only have one baby profile. No additional baby profiles can be added at this time.*</Text>
        </View>

        {/* 4. Pairing a Device */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Pairing a Device</Text>
          <Text style={styles.text}>Step 1: Prepare the Device</Text>
          <Text style={styles.text}>1. Ensure the **Sensicrib device** is powered on and connected to Wi-Fi through its built-in web portal.</Text>
          <Text style={styles.text}>2. The device will display a **QR code** for pairing.</Text>

          <Text style={styles.text}>Step 2: Scan the QR Code</Text>
          <Text style={styles.text}>1. Open the app and go to the **Device Pairing** section.</Text>
          <Text style={styles.text}>2. Tap **Scan QR Code** and use your phone's camera to scan the code displayed on the device.</Text>

          <Text style={styles.text}>Step 3: Complete Pairing</Text>
          <Text style={styles.text}>1. Once scanned, the device will pair automatically and you will be redirected to a confirmation screen.</Text>

          <Text style={styles.text}>*Note: Pairing can only be done after creating an account and setting up a baby profile.*</Text>
        </View>

        {/* 5. Temperature Monitoring & Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Temperature Monitoring & Alerts</Text>
          <Text style={styles.text}>Step 1: View Temperature Data</Text>
          <Text style={styles.text}>1. After pairing the device, monitor the temperature via the main dashboard.</Text>

          <Text style={styles.text}>Step 2: Adjust Temperature Thresholds</Text>
          <Text style={styles.text}>1. Go to **Settings** and navigate to **Temperature Threshold**.</Text>
          <Text style={styles.text}>2. Adjust the **min** and **max** temperature settings using sliders.</Text>
          <Text style={styles.text}>3. Tap **Update** to save your changes.</Text>

          <Text style={styles.text}>Step 3: Receive Alerts</Text>
          <Text style={styles.text}>1. The app will notify you when the temperature goes outside the threshold.</Text>
        </View>

        {/* 6. Setting Sensor Thresholds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Setting Sensor Thresholds</Text>
          <Text style={styles.text}>Step 1: Adjust Sound Sensitivity</Text>
          <Text style={styles.text}>1. Navigate to **Settings** and select **Sound Sensitivity**.</Text>
          <Text style={styles.text}>2. Use the **slider** to adjust the sensitivity level for the sound sensor.</Text>
          <Text style={styles.text}>3. Tap **Update** to save the changes.</Text>

          <Text style={styles.text}>Step 2: Adjust Weight Range</Text>
          <Text style={styles.text}>1. In **Settings**, find the **Weight Range** setting.</Text>
          <Text style={styles.text}>2. Use the **slider** to adjust the weight range and tap **Update** to save.</Text>
        </View>

        {/* 7. Notifications & Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Notifications & Alerts</Text>
          <Text style={styles.text}>Step 1: Alerts for Sensor Thresholds</Text>
          <Text style={styles.text}>1. The app will trigger an alert if any sensor reading exceeds the threshold.</Text>

          <Text style={styles.text}>Step 2: In-App Notifications</Text>
          <Text style={styles.text}>1. Alerts will appear in the app with sound and haptic feedback for attention.</Text>
        </View>

        {/* 8. Tips & Best Practices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Tips & Best Practices</Text>
          <Text style={styles.text}>Maintaining Device Connectivity:</Text>
          <Text style={styles.text}>- Ensure the device is connected to a stable Wi-Fi network.</Text>

          <Text style={styles.text}>Troubleshooting Alerts:</Text>
          <Text style={styles.text}>- Check sensor values and adjust thresholds if necessary.</Text>
        </View>

        <Text style={styles.footer}>For more information, visit our support page or contact us.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b4f6c',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  footer: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default UserInstructions;
