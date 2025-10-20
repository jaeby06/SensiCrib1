/// <reference types="node" />
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseclient';

const SENSOR_KEYS = ['weight', 'temperature', 'soundLevel', 'movement'] as const;
type SensorKey = typeof SENSOR_KEYS[number];

interface SensorData {
  weight: string;
  temperature: string;
  soundLevel: string;
  movement: string;
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
    weight: '',
    temperature: '',
    soundLevel: '',
    movement: '',
  });

  const [babyId, setBabyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSafe, setIsSafe] = useState(true);
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [showAlertPopup, setShowAlertPopup] = useState(false);

  const lastSoundUpdate = useRef<number>(0);
  const lastWeightUpdate = useRef<number>(0);
  const lastAlertTime = useRef<number>(0);
  const sensorSafety = useRef<SensorSafety>({ 1: true, 3: true, 5: true });
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
    if (now < cancelCooldownUntil.current) return;
    if (now - lastAlertTime.current < 5000) return;

    lastAlertTime.current = now;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playAlertSound();
    setShowAlertPopup(true);

    if (alertTimer.current) clearTimeout(alertTimer.current);
    const timer = setTimeout(() => {
      setShowAlertPopup(false);
    }, 5000);
    alertTimer.current = timer;
  }, []);

  const cancelAlert = () => {
    setShowAlertPopup(false);
    setIsSafe(true);
    sensorSafety.current = { 1: true, 3: true, 5: true };
    cancelCooldownUntil.current = Date.now() + 60000;
  };

  const updateSafety = useCallback((sensorType: number, value: number) => {
    const threshold = thresholds[sensorType];
    if (!threshold) return;

    const safe = value >= threshold.min && value <= threshold.max;
    const previouslySafe = sensorSafety.current[sensorType];
    sensorSafety.current[sensorType] = safe;

    const allSafe = Object.values(sensorSafety.current).every(Boolean);
    setIsSafe(allSafe);

    if (!safe && previouslySafe) {
      triggerAlert();
    }

    if (allSafe) {
      setShowAlertPopup(false);
      if (alertTimer.current) clearTimeout(alertTimer.current);
    }
  }, [thresholds, triggerAlert]);

  useEffect(() => {
    const fetchBabyAndThresholds = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session || !session.user) throw new Error("User not authenticated");

        const userId = session.user.id;

        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (babyError || !babyData) throw new Error("Baby not found");

        const babyId = babyData.baby_id;
        setBabyId(babyId);

        const { data: thresholdData, error: thresholdError } = await supabase
          .from('thresholds')
          .select('sensor_type_id, min_value, max_value')
          .eq('baby_id', babyId);

        if (thresholdError) throw new Error(thresholdError.message);

        const mapped: Thresholds = {};
        thresholdData.forEach((t: { sensor_type_id: number; min_value: number; max_value: number }) => {
          mapped[t.sensor_type_id] = { min: t.min_value, max: t.max_value };
        });

        setThresholds(mapped);
      } catch (error) {
        console.error("Error loading baby or thresholds:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBabyAndThresholds();
  }, []);

  useEffect(() => {
    if (!babyId) return;

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
          console.log("📡 Incoming sensor payload:", payload);
          const entry = payload.new;
          if (!entry) {
            console.warn("⚠️ No payload.new received");
            return;
          }

          const value = parseFloat(entry.value);
          if (isNaN(value)) {
            console.warn("⚠️ Invalid sensor value:", entry.value);
            return;
          }

          const sensorType = entry.sensor_type_id;
          const now = Date.now();

          setSensorData(prev => {
            const updated = { ...prev };

            switch (sensorType) {
              case 1:
                updated.temperature = `${value}°C`;
                break;
              case 3:
                if (now - lastSoundUpdate.current > 1000) {
                  updated.soundLevel = `${value} dB`;
                  lastSoundUpdate.current = now;
                }
                break;
              case 4:
                updated.movement = value.toString();
                break;
              case 5:
                if (now - lastWeightUpdate.current > 2000) {
                  updated.weight = `${value} kg`;
                  lastWeightUpdate.current = now;
                }
                break;
            }

            return updated;
          });

          if (thresholds[sensorType]) {
            updateSafety(sensorType, value);
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
        {['Weight', 'Temperature', 'Sound Level', 'Movement'].map((label, index) => {
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