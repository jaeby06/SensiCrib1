import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GradientBackground from '../../components/ui/WhiteBlueGradient';
import { useAlert } from '../../components/useAlert';
import { supabase } from '../../utils/supabaseclient';

const SENSOR_KEYS = ['temperature', 'humidity', 'soundStatus', 'soundPitch', 'weight', 'motion'] as const;

export default function HomeScreen() {
  const [sensorData, setSensorData] = useState({
    temperature: '',
    humidity: '',
    soundStatus: 'Normal',
    soundPitch: '',
    weight: '',
    motion: 'Stable',
  });
  const [rawValues, setRawValues] = useState<Record<number, number | null>>({});
  const [thresholds, setThresholds] = useState<Record<number, any>>({});
  const [babyId, setBabyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensorUpdateTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const {
    alertStatus,
    alertColor,
    showAlertPopup,
    setShowAlertPopup,
    updateAlertStatus,
    handleMotion,
    handleSound,
    handleWeight,
    sensorSafety,
  } = useAlert(thresholds);

  const getColorForSensor = (sensorType: number) => {
    const raw = rawValues[sensorType];
    const threshold = thresholds[sensorType];
    
    // For weight, use sensorSafety instead of threshold
    if (sensorType === 5) {
      return sensorSafety[5] ? '#32CD32' : '#FF3B30';
    }
    
    if (raw == null || !threshold) return '#32CD32';

    switch (sensorType) {
      case 1:
        return raw > threshold.max ? '#FF3B30' : '#32CD32';
      case 2:
        return raw < threshold.min || raw > threshold.max ? '#FF3B30' : '#32CD32';
      default:
        return '#32CD32';
    }
  };

  const cancelAlert = () => {
    setShowAlertPopup(false);
    setSensorData(prev => ({ ...prev, motion: 'Stable', soundStatus: 'Normal' }));
  };

  useEffect(() => {
    const fetchBabyAndThresholds = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session || !session.user) throw new Error('User not authenticated');

        const userId = session.user.id;
        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (babyError || !babyData) throw new Error('Baby not found');

        const babyId = babyData.baby_id;
        setBabyId(babyId);

        const { data: thresholdData, error: thresholdError } = await supabase
          .from('thresholds')
          .select('sensor_type_id, min_value, max_value')
          .eq('baby_id', babyId);

        if (thresholdError) throw new Error(thresholdError.message);

        const mapped: Record<number, any> = {};
        thresholdData.forEach(t => {
          mapped[t.sensor_type_id] = { min: t.min_value, max: t.max_value };
        });

        setThresholds(mapped);
      } catch (error) {
        console.error('❌ Error loading baby or thresholds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBabyAndThresholds();
  }, []);

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
        payload => {
          const entry = payload.new;
          if (!entry) return;

          const sensorType = entry.sensor_type_id;
          const raw = parseFloat(entry.value);
          if (isNaN(raw)) return;

          console.log(`[${new Date().toISOString()}] Sensor ${sensorType} received: ${raw}`);

          if (sensorUpdateTimers.current[sensorType]) {
            clearTimeout(sensorUpdateTimers.current[sensorType]);
          }

          sensorUpdateTimers.current[sensorType] = setTimeout(() => {
            setRawValues(prev => {
              if (prev[sensorType] !== raw) {
                return { ...prev, [sensorType]: raw };
              }
              return prev;
            });

            setSensorData(prev => {
              const updated = { ...prev };
              switch (sensorType) {
                case 1:
                  updated.temperature = `${raw}°C`;
                  break;
                case 2:
                  updated.humidity = `${raw}%`;
                  break;
                case 3:
                  updated.soundStatus = 'Crying';
                  handleSound();
                  break;
                case 4:
                  // Use motion threshold from database or default to 1.5
                  const motionThreshold = thresholds[4]?.min_value ?? 1.5;
                  updated.motion = raw > motionThreshold ? 'Triggered' : 'Stable';
                  handleMotion(raw);
                  break;
                case 5:
                  updated.weight = `${raw} kg`;
                  handleWeight(raw); // Call the new handleWeight function
                  break;
                default:
                  console.warn('⚠️ Unknown sensor type:', sensorType);
              }
              return updated;
            });

            // Only check thresholds for temperature (1) and humidity (2)
            if (thresholds[sensorType]) {
              if (sensorType === 1 || sensorType === 2) {
                updateAlertStatus(sensorType, raw);
              }
            }
          }, 200);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(sensorUpdateTimers.current).forEach(clearTimeout);
    };
  }, [babyId, thresholds, updateAlertStatus, handleMotion, handleSound, handleWeight]);

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#32CD32" />
          <Text>Logging in...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.banner, { backgroundColor: alertColor }]}>
          <Text style={styles.bannerText}>{alertStatus}</Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.row}>
            <View style={styles.labelBox}><Text style={styles.labelText}>Temperature</Text></View>
            <View style={[styles.valueBox, { backgroundColor: getColorForSensor(1) }]}>
              <Text style={styles.valueText}>{sensorData.temperature || '—'}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.labelBox}><Text style={styles.labelText}>Humidity</Text></View>
            <View style={[styles.valueBox, { backgroundColor: getColorForSensor(2) }]}>
              <Text style={styles.valueText}>{sensorData.humidity || '—'}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.labelBox}><Text style={styles.labelText}>Sound</Text></View>
            <View
              style={[
                styles.valueBox,
                !sensorSafety[3] ? styles.alertValue : styles.safeValue,
              ]}
            >
              <Text style={styles.valueText}>{!sensorSafety[3] ? 'Crying' : 'Normal'}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.labelBox}><Text style={styles.labelText}>Motion</Text></View>
            <View
              style={[
                styles.valueBox,
                sensorData.motion === 'Triggered' ? styles.alertValue : styles.safeValue,
              ]}
            >
              <Text style={styles.valueText}>{sensorData.motion}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.labelBox}><Text style={styles.labelText}>Weight</Text></View>
            <View style={[styles.valueBox, { backgroundColor: getColorForSensor(5) }]}>
              <Text style={styles.valueText}>{sensorData.weight || '—'}</Text>
            </View>
          </View>
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 30,
  },
  bannerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusContainer: {
    width: '85%',
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
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  valueText: {
    color: '#fff',
    fontWeight: '600',
  },
  alertValue: {
    backgroundColor: '#FF3B30',
  },
  safeValue: {
    backgroundColor: '#32CD32',
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