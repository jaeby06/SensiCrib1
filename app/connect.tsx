import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../utils/supabaseclient";

let debounceTimer: NodeJS.Timeout | null = null;

export default function PairDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{ [key: string]: string }>({});
  const [fallbackSelected, setFallbackSelected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.babyId) {
      setBabyId(params.babyId as string);
    }
  }, [params.babyId]);

  useEffect(() => {
    const fetchDevices = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from("device")
        .select("*")
        .eq("user_id", user.id)
        .eq("paired", true);

      if (!error && data) {
        setDevices(data);
        const connectedDevice = data.find(device => device.paired === true);
        if (connectedDevice) {
          setConnectedDeviceId(connectedDevice.device_id);
        }
      }
    };

    fetchDevices();
  }, []);

  const fetchTemperatureData = async (deviceId: string) => {
    const { data, error } = await supabase
      .from("sensor_data")
      .select("value, timestamp")
      .eq("sensor_type_id", 1)
      .eq("device_id", deviceId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.value;
  };

  const evaluateDeviceStatus = async (deviceId: string): Promise<string> => {
    const temperature = await fetchTemperatureData(deviceId);
    return temperature === null ? "inactive" : "active";
  };

  const updateStatus = (deviceId: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      evaluateDeviceStatus(deviceId).then((status) => {
        setDeviceStatus((prev) => ({
          ...prev,
          [deviceId]: status,
        }));
      });
    }, 1000);
  };

  useEffect(() => {
    const subscription = supabase
      .channel("device-status-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "device",
        },
        (payload) => {
          const deviceId = payload.new.device_id;
          if (
            payload.old.device_id === payload.new.device_id &&
            payload.old.status === payload.new.status
          ) {
            return;
          }
          updateStatus(deviceId);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const connectToDevice = (device: any) => {
    setConnectedDeviceId(device.device_id);
    setFallbackSelected(false);
    setErrorMessage(null);
  };

  const handleFallbackConfirm = async () => {
    setFallbackSelected(true);
    setConnectedDeviceId("fallback");
    setErrorMessage(null);

    await supabase.from("fallback_logs").insert([
      {
        user_id: userId,
        baby_id: babyId,
        timestamp: new Date().toISOString(),
        reason: "Manual fallback selected from PairDeviceScreen",
      },
    ]);
  };

  const handleContinue = async () => {
    if (!connectedDeviceId) {
      setErrorMessage("Pair a device!");
      return;
    }

    if (!babyId) {
      setErrorMessage("Baby info missing. Please restart pairing.");
      return;
    }

    if (!userId) {
      setErrorMessage("User not authenticated.");
      return;
    }

    setErrorMessage(null);

    if (connectedDeviceId === "fallback") {
      router.push(`/babyinfo?babyId=${babyId}&deviceId=fallback`);
      return;
    }

    const { data, error } = await supabase
      .from("device")
      .select("*")
      .eq("device_id", connectedDeviceId)
      .eq("user_id", userId);

    if (error || !data?.length) {
      console.warn("Device fetch error or not found, proceeding anyway");
      router.push(`/babyinfo?babyId=${babyId}&deviceId=${connectedDeviceId}`);
      return;
    }

    const device = data[0];

    if (device.baby_id) {
      router.push(`/babyinfo?babyId=${device.baby_id}&deviceId=${connectedDeviceId}`);
    } else {
      const { error: updateError } = await supabase
        .from("device")
        .update({ baby_id: babyId, paired: true })
        .eq("device_id", connectedDeviceId);

      if (updateError) {
        console.warn("Device update failed:", updateError);
      }

      router.push(`/babyinfo?babyId=${babyId}&deviceId=${connectedDeviceId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>SensiCrib</Text>
        <Text style={styles.subtitle}>Smart Care Starts Here.</Text>

        <Text style={styles.sectionTitle}>Your Devices</Text>

          {devices.length === 0 && (
            <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/qr")}>
              <Text style={styles.scanButtonText}>Scan to Add Device</Text>
            </TouchableOpacity>
          )}

        <View style={styles.foundBox}>
          {devices.length === 0 ? (
            <TouchableOpacity
              style={[
                styles.foundLabel,
                fallbackSelected && { backgroundColor: "#b2ebf2", borderRadius: 6, padding: 6 },
              ]}
              onPress={() =>
                Alert.alert(
                  "Proceed Without Device?",
                  "No device is paired. Monitoring may be limited. Do you want to continue?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Continue", onPress: handleFallbackConfirm },
                  ]
                )
              }
            >
              <Text>No devices paired yet. Tap to continue anyway.</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.device_id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.deviceRow} onPress={() => connectToDevice(item)}>
                  <Text style={styles.deviceText}>{item.device_name}</Text>
                  {connectedDeviceId === item.device_id && (
                    <Text style={styles.connectStatus}>✅ Connected</Text>
                  )}
                  <Text style={styles.deviceStatus}>
                    {deviceStatus[item.device_id] || "Offline"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={{ flex: 1 }} />

          {connectedDeviceId && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          )}

        {errorMessage && (
          <Text style={{ color: "red", marginTop: 8 }}>{errorMessage}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E5A6F" },
  inner: { paddingHorizontal: 24, paddingTop: 30, flex: 1, alignItems: "center" },
  logo: {
    fontSize: 64,
    color: "#fff",
    textShadowRadius: 4,
    fontFamily: "SpicyRice",
  },
  subtitle: { fontSize: 18, color: "#fff", marginTop: -10, fontStyle: "italic" },
  sectionTitle: { color: "white", fontSize: 20, marginBottom: 16, marginTop: 10 },
  scanButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 28,
    marginBottom: 16,
  },
  scanButtonText: {
    color: "#0E5A6F",
    fontWeight: "700",
    fontSize: 16,
  },
  foundBox: {
    marginTop: 8,
    backgroundColor: "#dff3f5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 18,
    width: "100%",
  },
  foundLabel: {
    color: "#083f45",
    fontWeight: "600",
    textAlign: "center",
  },
  deviceRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "white",
    borderRadius: 8,
    marginVertical: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceText: {
    color: "#0E5A6F",
    fontWeight: "600",
    flex: 1,
  },
  connectStatus: {
    color: "green",
    marginLeft: 10,
    fontWeight: "600",
  },
  deviceStatus: {
    color: "gray",
    marginLeft: 10,
    fontStyle: "italic",
  },
  continueButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 28,
    minWidth: 180,
    alignItems: "center",
    marginBottom: 50,
  },
  continueText: {
    color: "#0E5A6F",
    fontWeight: "700",
    fontSize: 16,
  },
});