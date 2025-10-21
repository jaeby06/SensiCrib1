import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const UserInstructions = () => {
  const router = useRouter();
  // State to control the visibility of each modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // Handle showing the modal for the tapped instruction
  const handleShowModal = (index: number) => {
    setActiveSection(index);
    setModalVisible(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setModalVisible(false);
    setActiveSection(null);
  };

  // Content for each section to be shown in modal
  const sectionContent = [
    [
      'Step 1: Connect to the ESP Device\'s Wi-Fi',
      '1. Turn on the Sensicrib device. The device will broadcast a Wi-Fi network (e.g., SensiCrib Device).',
      '2. On your phone, go to your Wi-Fi settings and find the ESP device\'s network (e.g., SensiCrib Device).',
      '3. Tap on the ESP device\'s network to connect.',
      '4. Enter the password for the device (e.g., sensicrib123) to establish the connection.',
      
      'Step 2: Access the Web Portal',
      '1. Once connected to the ESP device\'s Wi-Fi, open your browser.',
      '2. The web portal should automatically load, or you can enter the device\'s IP (usually `192.168.4.1`).',
      
      'Step 3: Connect to Your Home Wi-Fi',
      '1. In the web portal, tap Connect to Wi-Fi.',
      '2. Select your home Wi-Fi network and input your Wi-Fi password.',
      '3. Tap Connect to connect the device to your Wi-Fi network.',
      
      'Step 4: Log In',
      '1. After connecting to Wi-Fi in the web portal Open the app and log in or create an account to Sensicrib.'
    ],
    [
      'Step 1: Create an Account',
      '1. Open the app and tap Sign Up.',
      '2. Enter your details: Full Name, Username, Email, Password, Phone Number.',
      '3. Tap Register to complete the registration process.',
      
      'Step 2: Log In',
      '1. If you already have an account, tap Login.',
      '2. Enter your Username and Password.',
      '3. Tap Login to access the app.',
      
      'Note: You must create an account and log in before setting up the baby profile or pairing a device.'
    ],
    [
      'Step 1: Set Up Your Baby Profile',
      '1. Once logged in, you\'ll be prompted to Add Baby Information.',
      '2. Enter the following details: Baby\'s Name, Gender (Male, Female, Prefer not to say), Birthdate.',
      '3. Tap Save to complete the profile setup.',
      
      'Note: You can only have one baby profile. No additional baby profiles can be added at this time.'
    ],
    [
      'Step 1: Prepare the Device',
      '1. Ensure the Sensicrib device is powered on and connected to Wi-Fi through its built-in web portal.',
      '2. The device will display a QR code for pairing.',
      
      'Step 2: Scan the QR Code',
      '1. Open the app and go to the Device Pairing section.',
      '2. Tap Scan QR Code and use your phone\'s camera to scan the code displayed on the device.',
      
      'Step 3: Complete Pairing',
      '1. Once scanned, the device will pair automatically and you will be redirected to a confirmation screen.',
      
      'Note: Pairing can only be done after creating an account and setting up a baby profile.'
    ],
    [
      'Step 1: View Temperature Data',
      '1. After pairing the device, monitor the temperature via the main dashboard.',
      
      'Step 2: Adjust Temperature Thresholds',
      '1. Go to Settings and navigate to **Temperature Threshold**.',
      '2. Adjust the min and max temperature settings using sliders.',
      '3. Tap Update to save your changes.',
      
      'Step 3: Receive Alerts',
      '1. The app will notify you when the temperature goes outside the threshold.'
    ],
    [
      'Step 1: Adjust Sound Sensitivity',
      '1. Navigate to Settings and select Sound Sensitivity.',
      '2. Use the slider to adjust the sensitivity level for the sound sensor.',
      '3. Tap Update to save the changes.',
      
      'Step 2: Adjust Weight Range',
      '1. In Settings, find the Weight Range setting.',
      '2. Use the slider to adjust the weight range and tap Update to save.'
    ],
    [
      'Step 1: Alerts for Sensor Thresholds',
      '1. The app will trigger an alert if any sensor reading exceeds the threshold.',
      
      'Step 2: In-App Notifications',
      '1. Alerts will appear in the app with sound and haptic feedback for attention.'
    ],
    [
      'Maintaining Device Connectivity:',
      '- Ensure the device is connected to a stable Wi-Fi network.',
      '- If there are connection issues, try pairing the device again.',
      
      'Troubleshooting Alerts:',
      '- Check sensor values and adjust thresholds if necessary.',
      '- Verify that the device is properly connected to Wi-Fi.'
    ]
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.h1}>
                    <Image
                      source={require('../assets/logo.png')}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
        <Text style={styles.header}>Sensicrib Mobile App - User Instructions</Text>

        {/* Section Titles */}
        {['1. Setting Up the ESP Device', '2. Account Creation & Login', '3. Baby Profile Setup', 
          '4. Pairing a Device', '5. Temperature Monitoring & Alerts', '6. Setting Sensor Thresholds', 
          '7. Notifications & Alerts', '8. Tips & Best Practices'].map((title, index) => (
          <TouchableOpacity key={index} style={styles.sectionHeader} onPress={() => handleShowModal(index)}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </TouchableOpacity>
        ))}

        {/* Modal for instructions */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Instruction Steps</Text>
              {sectionContent[activeSection || 0].map((step, idx) => (
                <Text key={idx} style={styles.modalText}>{step}</Text>
              ))}
              <Button 
                mode="contained"
                style={styles.buttonclose}
                labelStyle={{ color: '#000' }}
                onPress={handleCloseModal}>
                Close
              </Button>
            </View>
          </View>
        </Modal>

        {/* Redirect to Login Button */}
        <View>
           <Button
            mode="contained"
            style={styles.button}
            labelStyle={{ color: '#000' }}
            onPress={() => router.push('/login')}
          >
            Go to Login
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b4f6c',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
    h1: {
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: -50,
    marginTop: -85,
  },
  header: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    color: '#000',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#0b4f6c',
  },
    buttonclose: {
    width: 160,
    alignSelf: 'center',
    backgroundColor: '#fffff0',
    borderColor: '#000',
    borderWidth: 1,
  },
  button: {
    marginTop: 20,
    width: 160,
    alignSelf: 'center',
    backgroundColor: '#fffff0',
  },
});

export default UserInstructions;
