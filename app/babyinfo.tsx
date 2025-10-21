import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { subscribeToDeviceStatus, supabase } from "../utils/supabaseclient";

type DeviceStatus = "active" | "error" | "offline";

const BabyInfo = () => {
  const { deviceId, babyId } = useLocalSearchParams();
  const router = useRouter();

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("pending");
  const [dots, setDots] = useState("");
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [finalTimeoutReached, setFinalTimeoutReached] = useState(false);
  const [lastTemperatureTimestamp, setLastTemperatureTimestamp] = useState<Date | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("Parent");
  const [baby, setBaby] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!babyId || !deviceId) {
      console.error("Missing babyId or deviceId, redirecting...");
      router.replace("/connect");
    }
  }, [babyId, deviceId, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, [deviceStatus]);

  const fetchTemperatureData = async () => {
    const { data, error } = await supabase
      .from("sensor_data")
      .select("value, timestamp")
      .eq("sensor_type_id", 1)
      .eq("device_id", deviceId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching temperature data:", error);
      setTemperature(null);
      setLastTemperatureTimestamp(null);
      return;
    }

    console.log("✅ Temperature fetched:", data.value, "at", data.timestamp);
    setTemperature(data.value);
    setLastTemperatureTimestamp(new Date(data.timestamp));
  };

  const evaluateDeviceStatus = (
    temperature: number | null,
    timestamp: Date | null
  ): DeviceStatus => {
    if (temperature === null || timestamp === null) {
      console.log("❌ No temperature data — marking device as error");
      return "error";
    }

    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = diffMs / 1000 / 60;

    if (diffMinutes > 1) {
      console.log("📴 Temperature data is stale:", diffMinutes.toFixed(2), "min old");
      return "offline";
    }

    return "active";
  };
  
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Auth error:", userError);
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("username, full_name")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Error fetching user details:", profileError);
        // Continue even if profile fetch fails
      }

      setUser(user);
      setUsername(profile?.full_name || profile?.username || "Parent");
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchBabyData = async () => {
      if (!user) return;

      // Use babyId from params if available, otherwise fetch by user_id
      let query = supabase
        .from("baby")
        .select("name, gender, birth_date");

      if (babyId) {
        query = query.eq("baby_id", babyId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data: babyData, error: babyError } = await query.single();

      if (babyError) {
        console.error("❌ Error fetching baby details:", babyError);
        console.error("Error details:", {
          message: babyError.message,
          code: babyError.code,
          details: babyError.details,
          hint: babyError.hint
        });
        return;
      }

      if (babyData) {
        console.log("✅ Baby data fetched successfully:", babyData);
        setBaby(babyData);
      }
    };

    fetchBabyData();
  }, [user, babyId]);

  useEffect(() => {
    if (!deviceId) return;

    const subscription = subscribeToDeviceStatus(deviceId, () => {
      fetchTemperatureData();
    });

    fetchTemperatureData();

    const polling = setInterval(() => {
      fetchTemperatureData();
    }, 5000);

    const timer = setTimeout(() => {
      console.log("⏳ Timeout reached");
      setTimeoutReached(true);
    }, 10000);

    const finalTimeout = setTimeout(() => {
      console.log("⏰ Final timeout reached");
      setFinalTimeoutReached(true);
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(polling);
      clearTimeout(timer);
      clearTimeout(finalTimeout);
    };
  }, [deviceId]);

  useEffect(() => {
    if (!timeoutReached) return;

    const evaluatedStatus = evaluateDeviceStatus(temperature, lastTemperatureTimestamp);
    setDeviceStatus(evaluatedStatus);
  }, [temperature, lastTemperatureTimestamp, timeoutReached]);

  useEffect(() => {
    if (!timeoutReached || deviceStatus === "pending") return;

    console.log("🚀 Evaluated device status:", deviceStatus);

    if (deviceStatus === "active") {
      router.replace("/(tabs)");
    } else if (deviceStatus === "error" || deviceStatus === "offline") {
      console.log("⏳ Showing error/offline message for 5 seconds before redirecting...");
      setTimeout(() => {
        router.replace(`/connect?babyId=${babyId}`);
      }, 5000);
    } else {
      router.replace(`/connect?babyId=${babyId}`);
    }
  }, [deviceStatus, timeoutReached]);

  useEffect(() => {
    if (finalTimeoutReached && deviceStatus !== "active") {
      console.log("🔒 Final fallback to login due to inactive status");
      router.replace("/login");
    }
  }, [finalTimeoutReached, deviceStatus, router]);

  const statusColors: Record<DeviceStatus, string> = {
    active: "#4CAF50",
    error: "#F44336",
    offline: "#F44336",
  };

  const renderStatusText = () => {
    switch (deviceStatus) {
      case "active":
        return `✅ Monitoring in progress${dots}`;
      case "error":
        return `❌ Error: Check device${dots}`;
      case "offline":
        return `🔴 Device offline${dots}`;
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Welcome to SensiCrib!</Text>
      <Text style={styles.subtitle}>Hello, {username}!</Text>

      {baby && (
        <View style={styles.card}>
          <Text style={styles.label}>
            Baby's Name: <Text style={styles.value}>{baby.name}</Text>
          </Text>
          <Text style={styles.label}>
            Gender: <Text style={styles.value}>{baby.gender}</Text>
          </Text>
          <Text style={styles.label}>
            Birthday: <Text style={styles.value}>{baby.birth_date}</Text>
          </Text>
        </View>
      )}
      <View style={[styles.statusContainer, { backgroundColor: statusColors[deviceStatus] }]}>
        {deviceStatus === "pending" ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.statusText}>{renderStatusText()}</Text>
          </>
        ) : (
          <View>
            <Text style={styles.statusText}>{renderStatusText()}</Text>
            {deviceStatus === "error" && (
              <Text style={styles.statusDetail}>
                No temperature data was found. Please check the device connection.
              </Text>
            )}
            {deviceStatus === "offline" && (
              <Text style={styles.statusDetail}>
                Device is offline. Last temperature reading is over 1 minute old.
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b4f6c",
    padding: 20,
  },
  logo: {
    width: 385,
    height: 289,
    marginBottom: -50,
  },
  title: {
    fontSize: 32,
    color: "#fff",
    textShadowRadius: 4,
    fontFamily: "SpicyRice",
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
    fontFamily: "SpicyRice",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    marginBottom: 20,
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  value: {
    fontWeight: "normal",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    opacity: 0.9,
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  statusDetail: {
  color: "#fff",
  fontSize: 14,
  marginTop: 4,
  fontStyle: "italic",
},

});

export default BabyInfo;