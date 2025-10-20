import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { startDeviceStatusMonitoring, supabase } from "../utils/supabaseclient";

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scannedData) return; // Prevent scanning multiple times

    console.log("Raw QR data:", result.data); // Debug log

    try {
      const parsed = JSON.parse(result.data); // Expect JSON QR data
      if (parsed?.token) {
        setScannedData(parsed);  // Set QR data
        setIsScanning(false);    // Stop scanning
        console.log("Valid QR token found:", parsed.token);
      } else {
        showToast("Invalid QR", "This QR code does not contain a valid token.");
      }
    } catch (error) {
      console.error("QR parsing error:", error);
      showToast("Invalid QR", `Could not parse QR data: ${error.message}`);
    }
  };

  const showToast = (title: string, message: string) => {
    Toast.show({ type: "error", text1: title, text2: message });
  };

  const handleConnect = async () => {
    if (!scannedData?.token) return;

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showToast("Authentication Error", "You must be logged in to claim a device.");
        return;
      }

      console.log("Authenticated user ID:", user.id);
      console.log("Attempting to pair device with token:", scannedData.token);
      
      const trimmedToken = scannedData.token.trim();  // This should be "uuid-xyz"
      console.log("Trimmed token:", trimmedToken);

      // Set the session variable for the pair token
      await supabase.rpc('set_pair_token', { token: trimmedToken });

      // Check if device exists
      const { data: existingDevice, error: checkError } = await supabase
        .from("device")
        .select("*")
        .eq("pair_token", trimmedToken)
        .single();

      if (checkError) {
        console.error("Device lookup error:", checkError);
        showToast("Device Not Found", "No device found with this QR code. Please check the token or pairing status.");
        return;
      }

      console.log("Existing device data:", existingDevice);

      if (existingDevice.paired && existingDevice.user_id) {
        showToast("Device Already Paired", "This device is already claimed by another user.");
        return;
      }

      // Get or create a baby for this user
      const { data: babies, error: babyFetchError } = await supabase
        .from("baby")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (babyFetchError) {
        console.error("Baby fetch error:", babyFetchError);
        showToast("Error", "Failed to fetch baby profiles.");
        return;
      }

      let babyId: string;

      if (babies && babies.length > 0) {
        // Use the first baby found
        babyId = babies[0].baby_id;
        console.log("Using existing baby:", babyId);
      } else {
        // Create a default baby profile
        const { data: newBaby, error: babyCreateError } = await supabase
          .from("baby")
          .insert({
            user_id: user.id,
            name: "My Baby",
            gender: "prefer_not_to_say"
          })
          .select()
          .single();

        if (babyCreateError || !newBaby) {
          console.error("Baby creation error:", babyCreateError);
          showToast("Error", "Failed to create baby profile.");
          return;
        }

        babyId = newBaby.baby_id;
        console.log("Created new baby:", babyId);
      }

      // Update the device with the user's ID, baby ID, and set paired status
      console.log("Update payload:", {
        user_id: user.id,  // This should match the user_id from the baby table
        baby_id: babyId,   // This should be the valid baby ID retrieved
        paired: true,
        provisioned_at: new Date().toISOString(),
        status: "active",
      });

      const { data, error } = await supabase
        .from("device")
        .update({
          user_id: user.id,  // This should match the user_id from the baby table
          baby_id: babyId,   // This should be the valid baby ID retrieved
          paired: true,
          provisioned_at: new Date().toISOString(),
          status: "active",
        })
        .eq("pair_token", trimmedToken)  // Ensure this matches the token in the device table
        .select()
        .single();

        if (error) {
          console.error("Device update error:", error);
          showToast("Pairing Failed", `Failed to pair device: ${error.message}`);
          return;
        }

      console.log("Device paired successfully:", data);
      startDeviceStatusMonitoring(data.id);  // Add this line
      Toast.show({ 
        type: "success", 
        text1: "Success 🎉", 
        text2: `Device ${data.device_name} is now paired!` 
      });
            
      // Navigate back after a short delay to show the success message
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error) {
      console.error("Unexpected error during pairing:", error);
      showToast("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.scannerFallback}>
        <Text style={styles.scannerText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.scannerFallback}>
        <Text style={styles.scannerText}>No access to camera. Please enable permissions.</Text>
        <TouchableOpacity style={styles.smallButton} onPress={requestPermission}>
          <Text style={styles.smallButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.scannerContainer}>
      {isScanning ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={styles.overlayTop}>
            <Text style={styles.scanTitle}>Scan QR code</Text>
          </View>
        </>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Device QR Detected:</Text>
          <Text style={styles.qrValue}>Token: {scannedData?.token}</Text>
          {scannedData?.id && <Text style={styles.qrValue}>Device: {scannedData.id}</Text>}

          <TouchableOpacity style={styles.connectButton} onPress={handleConnect} disabled={loading}>
            <Text style={styles.connectButtonText}>{loading ? "Pairing..." : "Tap here to pair"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallButton, { marginTop: 16 }]}
            onPress={() => {
              setIsScanning(true);
              setScannedData(null);
            }}
          >
            <Text style={styles.smallButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.overlayBottom}>
        <TouchableOpacity style={styles.smallButton} onPress={() => router.back()}>
          <Text style={styles.smallButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: "black" },
  scannerFallback: {
    flex: 1, justifyContent: "center", alignItems: "center",
    padding: 24, backgroundColor: "#0E5A6F",
  },
  scannerText: { color: "white", fontSize: 16, marginBottom: 12 },
  overlayTop: { position: "absolute", top: 40, left: 0, right: 0, alignItems: "center" },
  overlayBottom: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  scanTitle: { color: "white", fontSize: 18, fontWeight: "600" },
  resultContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "#0E5A6F" },
  resultText: { fontSize: 16, color: "white", marginBottom: 8 },
  qrValue: { fontSize: 14, color: "#FFD700", marginBottom: 10, textAlign: "center" },
  connectButton: { backgroundColor: "#FFD700", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, marginTop: 10 },
  connectButtonText: { color: "#0E5A6F", fontSize: 16, fontWeight: "700" },
  smallButton: { backgroundColor: "white", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  smallButtonText: { color: "#0E5A6F", fontWeight: "700" },
});