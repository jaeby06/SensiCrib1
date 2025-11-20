import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

export const ALERT_STATUS = {
  SAFE: 'SAFE',
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  CRITICAL: 'Critical',
};

const ALERT_COLORS = {
  [ALERT_STATUS.SAFE]: '#32CD32',
  [ALERT_STATUS.MINOR]: '#FFFF00',
  [ALERT_STATUS.MODERATE]: '#FFA500',
  [ALERT_STATUS.CRITICAL]: '#FF3B30',
};

const playAlertSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(require('../assets/alert.mp3'));
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
};

export const useAlert = (thresholds: any) => {
  const [alertStatus, setAlertStatus] = useState<string>(ALERT_STATUS.SAFE);
  const [alertColor, setAlertColor] = useState<string>(ALERT_COLORS[ALERT_STATUS.SAFE]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [sensorSafety, setSensorSafety] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true,
  });

  const motionTimer = useRef<NodeJS.Timeout | null>(null);
  const motionStartTime = useRef<number | null>(null);
  const soundTimer = useRef<NodeJS.Timeout | null>(null);
  const prevSensorSafety = useRef(sensorSafety);
  const lastAlertTimestampRef = useRef<number>(0);
  const COOLDOWN_MS = 5000;

  const previousWeight = useRef<number | null>(null);
  const weightHistory = useRef<number[]>([]);
  
  const WEIGHT_DROP_THRESHOLD = thresholds[5]?.min_value ?? 1.0;
  const MAX_CHANGE_RATE = thresholds[5]?.max_value ?? 0.5;

  const triggerAlert = useCallback(async (status: string) => {
    const now = Date.now();
    if (now - lastAlertTimestampRef.current < COOLDOWN_MS) {
      console.log('Alert suppressed due to cooldown.');
      return;
    }

    // Trigger for MODERATE (Single Priority) or CRITICAL (Multiple Priority)
    if (status === ALERT_STATUS.MODERATE || status === ALERT_STATUS.CRITICAL) {
      lastAlertTimestampRef.current = now;

      playAlertSound();
      setShowAlertPopup(true);
      setTimeout(() => setShowAlertPopup(false), 5000);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: status === ALERT_STATUS.CRITICAL ? "🚨 Critical SensiCrib Alert!" : "⚠️ SensiCrib Alert",
          body: status === ALERT_STATUS.CRITICAL 
            ? "Multiple sensors triggered! Check baby immediately." 
            : "Activity detected (Motion, Sound, or Weight change).",
          data: { status },
          sound: true,
        },
        trigger: null,
      });
    }
  }, []);

  const updateAlertStatus = (sensorType: number, value: number) => {
    const threshold = thresholds[sensorType];
    if (!threshold) return;

    let safe = true;
    if (sensorType === 1) safe = value <= threshold.max;
    else if (sensorType === 2) safe = value >= threshold.min && value <= threshold.max;
    else safe = value >= threshold.min && value <= threshold.max;

    setSensorSafety((prev) => {
      if (prev[sensorType] === safe) return prev;
      return { ...prev, [sensorType]: safe };
    });
  };

  useEffect(() => {
    return () => {
      if (motionTimer.current) clearTimeout(motionTimer.current);
      if (soundTimer.current) clearTimeout(soundTimer.current);
    };
  }, []);

  // [UPDATED LOGIC] Priority Sensors: Sound(3), Motion(4), Weight(5)
  useEffect(() => {
    if (JSON.stringify(sensorSafety) !== JSON.stringify(prevSensorSafety.current)) {
      const timestamp = new Date().toISOString();
      
      // 1. Identify Priority Sensors (Sound=3, Motion=4, Weight=5)
      const prioritySensors = [3, 4, 5];
      const priorityUnsafeCount = prioritySensors.filter(id => !sensorSafety[id]).length;

      // 2. Identify Environmental Sensors (Temp=1, Humidity=2)
      const envSensors = [1, 2];
      const envUnsafeCount = envSensors.filter(id => !sensorSafety[id]).length;

      let newStatus = ALERT_STATUS.SAFE;

      if (priorityUnsafeCount >= 2) {
         // If 2 or more priority sensors trigger (e.g. Weight + Sound), it's CRITICAL
         newStatus = ALERT_STATUS.CRITICAL;
      } else if (priorityUnsafeCount === 1) {
         // If exactly 1 priority sensor triggers (e.g. just Weight), it's MODERATE
         newStatus = ALERT_STATUS.MODERATE;
      } else if (envUnsafeCount > 0) {
         // If only temp/humidity trigger, it's MINOR
         newStatus = ALERT_STATUS.MINOR;
      }

      setAlertStatus(newStatus);
      setAlertColor(ALERT_COLORS[newStatus]);
      triggerAlert(newStatus);

      if (newStatus === ALERT_STATUS.SAFE) lastAlertTimestampRef.current = 0;
      prevSensorSafety.current = sensorSafety;
    }
  }, [sensorSafety, triggerAlert]);

  const handleMotion = (value: number) => {
    const MOTION_THRESHOLD = thresholds[4]?.min_value ?? 1.5;
    const MOTION_DURATION_MS = (thresholds[4]?.max_value ?? 5) * 1000;
    
    if (value > MOTION_THRESHOLD) {
      if (!motionStartTime.current) {
        motionStartTime.current = Date.now();
        motionTimer.current = setTimeout(() => {
          if (Date.now() - (motionStartTime.current ?? 0) >= MOTION_DURATION_MS) {
            setSensorSafety((prev) => {
              if (!prev[4]) return prev;
              return { ...prev, 4: false };
            });
          }
        }, MOTION_DURATION_MS);
      }
    } else {
      motionStartTime.current = null;
      if (motionTimer.current) clearTimeout(motionTimer.current);
      setSensorSafety((prev) => {
        if (prev[4]) return prev;
        return { ...prev, 4: true };
      });
    }
  };

  const handleSound = useCallback(() => {
    setSensorSafety((prev) => {
      if (!prev[3]) return prev;
      return { ...prev, 3: false };
    });
    if (soundTimer.current) clearTimeout(soundTimer.current);
    soundTimer.current = setTimeout(() => {
      setSensorSafety((prev) => {
        if (prev[3]) return prev;
        return { ...prev, 3: true };
      });
      soundTimer.current = null;
    }, 5000);
  }, []);

  const handleWeight = useCallback((value: number) => {
    let isUnsafe = false;
    if (previousWeight.current !== null) {
      if ((previousWeight.current - value) > WEIGHT_DROP_THRESHOLD) isUnsafe = true;
    }
    if (weightHistory.current.length > 0) {
      const lastWeight = weightHistory.current[weightHistory.current.length - 1];
      if (Math.abs(value - lastWeight) > MAX_CHANGE_RATE) isUnsafe = true;
    }
    weightHistory.current.push(value);
    if (weightHistory.current.length > 5) weightHistory.current.shift();
    previousWeight.current = value;

    setSensorSafety((prev) => {
      // If unsafe, set safe=false. If safe, set safe=true.
      const safe = !isUnsafe;
      if (prev[5] === safe) return prev;
      return { ...prev, 5: safe };
    });
  }, []);

  const resetAlertStatus = () => {
    setAlertStatus(ALERT_STATUS.SAFE);
    setAlertColor(ALERT_COLORS[ALERT_STATUS.SAFE]);
    setShowAlertPopup(false);
    lastAlertTimestampRef.current = 0;
  };

  return {
    alertStatus,
    alertColor,
    showAlertPopup,
    setShowAlertPopup,
    updateAlertStatus,
    handleMotion,
    handleSound,
    handleWeight,
    resetAlertStatus,
    sensorSafety,
  };
};