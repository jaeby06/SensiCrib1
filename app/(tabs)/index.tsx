/// <reference types="node" />
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseclient';

// Updated the order of sensor keys
const SENSOR_KEYS = ['temperature', 'humidity', 'soundLevel', 'soundPitch', 'weight', 'motion'] as const;
type SensorKey = typeof SENSOR_KEYS[number];

interface SensorData {
  temperature: string;
  humidity: string;
  soundLevel: string;
  soundPitch: string;
  weight: string;
  motion: string; // Updated from 'movement' to 'motion'
}

interface Threshold {
  min: number;
  max: number;
}

interface Thresholds {
  [key: number]: Threshold;
}

interface SensorSafety {
  [key: number]: boolean;
}

export default function HomeScreen() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: '',
    humidity: '',
    soundLevel: '',
    soundPitch: '',
    weight: '',
    motion: '', // Updated from 'movement' to 'motion'
  });

  const [babyId, setBabyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSafe, setIsSafe] = useState(true);
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [showAlertPopup, setShowAlertPopup] = useState(false);

  const lastSoundUpdate = useRef<number>(0);
  const lastWeightUpdate = useRef<number>(0);
  const lastAlertTime = useRef<number>(0);
  const sensorSafety = useRef<SensorSafety>({});
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelCooldownUntil = useRef<number>(0);

  const playAlertSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alert.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  };

  const triggerAlert = useCallback(() => {
    const now = Date.now();
    console.log("🚨 triggerAlert called:", {
      now,
      cancelCooldownUntil: cancelCooldownUntil.current,
      lastAlertTime: lastAlertTime.current,
      timeSinceLastAlert: now - lastAlertTime.current,
      inCooldown: now < cancelCooldownUntil.current,
      tooSoon: now - lastAlertTime.current < 5000,
    });

    if (now < cancelCooldownUntil.current) {
      console.log("⏸️ Alert BLOCKED - in cancel cooldown");
      return;
    }
    if (now - lastAlertTime.current < 5000) {
      console.log("⏸️ Alert BLOCKED - too soon since last alert");
      return;
    }

    console.log("✅✅✅ ALERT ACTUALLY TRIGGERED! ✅✅✅");
    lastAlertTime.current = now;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playAlertSound();
    setShowAlertPopup(true);

    if (alertTimer.current) clearTimeout(alertTimer.current);
    const timer = setTimeout(() => {
      console.log("⏰ Auto-closing alert popup");
      setShowAlertPopup(false);
    }, 5000);
    alertTimer.current = timer;
  }, []);

  const cancelAlert = () => {
    console.log("🛑 Alert cancelled by user - 60s cooldown started");
    setShowAlertPopup(false);
    setIsSafe(true);
    Object.keys(sensorSafety.current).forEach(key => {
      sensorSafety.current[parseInt(key)] = true;
    });
    cancelCooldownUntil.current = Date.now() + 60000;
    console.log("Cooldown until:", new Date(cancelCooldownUntil.current).toLocaleTimeString());
  };

  const updateSafety = useCallback((sensorType: number, value: number) => {
    const threshold = thresholds[sensorType];
    
    console.log("=" .repeat(60));
    console.log("🔍 updateSafety called:");
    console.log("  Sensor Type:", sensorType);
    console.log("  Value:", value);
    console.log("  Threshold:", threshold);
    
    if (!threshold) {
      console.error("❌ NO THRESHOLD FOUND for sensor type:", sensorType);
      console.log("  Available thresholds:", Object.keys(thresholds));
      console.log("=" .repeat(60));
      return;
    }

    const safe = value >= threshold.min && value <= threshold.max;
    const previouslySafe = sensorSafety.current[sensorType];

    console.log("  Is Safe?:", safe);
    console.log("  Min:", threshold.min, "Max:", threshold.max);
    console.log("  Value >= Min?:", value >= threshold.min);
    console.log("  Value <= Max?:", value <= threshold.max);
    console.log("  Previous Safety State:", previouslySafe);

    sensorSafety.current[sensorType] = safe;

    // Only check sensors that have reported data
    const reportedSensors = Object.keys(sensorSafety.current).map(Number);
    const allSafe = reportedSensors.every(key => sensorSafety.current[key] === true);
    
    console.log("  All Sensors Safe?:", allSafe);
    console.log("  Reported Sensors:", reportedSensors);
    console.log("  Safety States:", JSON.stringify(sensorSafety.current));
    
    setIsSafe(allSafe);

    // Trigger alert if this sensor is now unsafe
    const shouldTrigger = !safe && previouslySafe !== false;
    console.log("  Should Trigger Alert?:", shouldTrigger);
    console.log("  (!safe):", !safe);
    console.log("  (previouslySafe !== false):", previouslySafe !== false);
    
    if (shouldTrigger) {
      console.log("🚨🚨🚨 CALLING triggerAlert() 🚨🚨🚨");
      triggerAlert();
    } else {
      console.log("  ❌ Alert NOT triggered because:");
      if (safe) console.log("    - Value IS within safe range");
      if (!safe && previouslySafe === false) console.log("    - Sensor was already marked unsafe");
    }

    if (allSafe) {
      console.log("  ✅ All safe - clearing any active alerts");
      setShowAlertPopup(false);
      if (alertTimer.current) clearTimeout(alertTimer.current);
    }
    
    console.log("=" .repeat(60));
  }, [thresholds, triggerAlert]);

  useEffect(() => {
    const fetchBabyAndThresholds = async () => {
      try {
        console.log("🔄 Fetching baby and thresholds...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session || !session.user) throw new Error("User not authenticated");

        const userId = session.user.id;
        console.log("👤 User ID:", userId);

        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (babyError || !babyData) throw new Error("Baby not found");

        const babyId = babyData.baby_id;
        setBabyId(babyId);
        console.log("👶 Baby ID:", babyId);

        const { data: thresholdData, error: thresholdError } = await supabase
          .from('thresholds')
          .select('sensor_type_id, min_value, max_value')
          .eq('baby_id', babyId);

        if (thresholdError) throw new Error(thresholdError.message);

        console.log("📊 Raw threshold data from DB:", thresholdData);

        const mapped: Thresholds = {};
        thresholdData.forEach((t: { sensor_type_id: number; min_value: number; max_value: number }) => {
          mapped[t.sensor_type_id] = { min: t.min_value, max: t.max_value };
          console.log(`  Sensor ${t.sensor_type_id}: ${t.min_value} - ${t.max_value}`);
        });

        setThresholds(mapped);
        console.log("✅ Thresholds loaded successfully:", mapped);
      } catch (error) {
        console.error("❌ Error loading baby or thresholds:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBabyAndThresholds();
  }, []);

  useEffect(() => {
    if (!babyId) return;

    console.log("📡 Setting up threshold realtime listener for baby:", babyId);

    const thresholdChannel = supabase
      .channel('thresholds-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'thresholds',
          filter: `baby_id=eq.${babyId}`,
        },
        (payload) => {
          const t = payload.new;
          console.log("📊 Threshold updated in realtime:", t);
          setThresholds(prev => ({
            ...prev,
            [t.sensor_type_id]: { min: t.min_value, max: t.max_value }
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(thresholdChannel);
    };
  }, [babyId]);

  useEffect(() => {
    if (!babyId) return;

    console.log("📡 Setting up sensor data realtime listener for baby:", babyId);

    const channel = supabase
      .channel('sensor-data')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: `baby_id=eq.${babyId}`,
        },
        (payload) => {
          console.log("\n📡📡📡 NEW SENSOR DATA 📡📡📡");
          console.log("Full payload:", payload);
          
          const entry = payload.new;
          if (!entry) {
            console.warn("⚠️ No payload.new received");
            return;
          }

          console.log("Entry:", entry);
          console.log("Sensor Type ID:", entry.sensor_type_id);
          console.log("Value (raw):", entry.value);

          const value = parseFloat(entry.value);
          if (isNaN(value)) {
            console.warn("⚠️ Invalid sensor value:", entry.value);
            return;
          }

          console.log("Value (parsed):", value);

          const sensorType = entry.sensor_type_id;
          const now = Date.now();

          setSensorData(prev => {
            const updated = { ...prev };

            switch (sensorType) {
              case 1:
                console.log("📊 Updating temperature:", value);
                updated.temperature = `${value}°C`;
                break;
              case 2: // Humidity sensor
                console.log("📊 Updating humidity:", value);
                updated.humidity = `${value}%`; // Update humidity
                break;
              case 3:
                if (now - lastSoundUpdate.current > 1000) {
                  console.log("📊 Updating sound level:", value);
                  updated.soundLevel = `${value} dB`;
                  lastSoundUpdate.current = now;
                } else {
                  console.log("⏭️ Skipping sound update (throttled)");
                }
                break;
              case 4:
                console.log("📊 Updating motion:", value); // Updated from movement to motion
                updated.motion = value.toString();
                break;
              case 5:
                if (now - lastWeightUpdate.current > 2000) {
                  console.log("📊 Updating weight:", value);
                  updated.weight = `${value} kg`;
                  lastWeightUpdate.current = now;
                } else {
                  console.log("⏭️ Skipping weight update (throttled)");
                }
                break;
              default:
                console.warn("⚠️ Unknown sensor type:", sensorType);
            }

            return updated;
          });

          console.log("🔍 Checking if threshold exists for sensor type:", sensorType);
          console.log("Available thresholds:", Object.keys(thresholds));
          console.log("Threshold for this sensor:", thresholds[sensorType]);

          if (thresholds[sensorType]) {
            console.log("✅ Threshold found, calling updateSafety");
            updateSafety(sensorType, value);
          } else {
            console.error("❌ NO THRESHOLD for sensor type:", sensorType);
            console.log("This is likely why alerts aren't triggering!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (alertTimer.current) clearTimeout(alertTimer.current);
    };
  }, [babyId, thresholds, updateSafety]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#32CD32" />
        <Text>Logging in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.banner, isSafe ? styles.safeBanner : styles.alertBanner]}>
        <Text style={styles.bannerText}>{isSafe ? 'SAFE' : 'ALERT'}</Text>
      </View>

      <View style={styles.statusContainer}>
        {['Temperature', 'Humidity', 'Sound Level', 'Motion', 'Weight'].map((label, index) => {
          const key = SENSOR_KEYS[index];
          return (
            <View style={styles.row} key={label}>
              <View style={styles.labelBox}>
                <Text style={styles.labelText}>{label}</Text>
              </View>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{sensorData[key]}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={showAlertPopup} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <Text style={styles.popupText}>🚨 Alert active for 5 seconds</Text>
            <TouchableOpacity style={styles.popupButton} onPress={cancelAlert}>
              <Text style={styles.popupButtonText}>Cancel Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 30,
  },
  safeBanner: {
    backgroundColor: '#32CD32',
  },
  alertBanner: {
    backgroundColor: '#FF3B30',
  },
  bannerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusContainer: {
    width: '80%',
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelBox: {
    backgroundColor: '#0B3C5D',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  labelText: {
    color: '#fff',
    fontWeight: '600',
  },
  valueBox: {
    backgroundColor: '#32CD32',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  valueText: {
    color: '#fff',
    fontWeight: '600',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupText: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  popupButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  popupButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
