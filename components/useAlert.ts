import { Audio } from 'expo-av';
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
    1: true, // Temperature
    2: true, // Humidity
    3: true, // Sound
    4: true, // Motion
    5: true, // Weight
  });

  const motionTimer = useRef<NodeJS.Timeout | null>(null);
  const motionStartTime = useRef<number | null>(null);
  const soundTimer = useRef<NodeJS.Timeout | null>(null);
  const prevSensorSafety = useRef(sensorSafety);
  const lastAlertTimestampRef = useRef<number>(0);
  const COOLDOWN_MS = 10000;

  // Weight detection refs
  const previousWeight = useRef<number | null>(null);
  const weightHistory = useRef<number[]>([]);
  
  // Get weight thresholds from database or use defaults
  const WEIGHT_DROP_THRESHOLD = thresholds[5]?.min_value ?? 1.0; // kg - sudden drop detection
  const MAX_CHANGE_RATE = thresholds[5]?.max_value ?? 0.5; // kg per reading - rapid change detection

  const triggerAlert = useCallback((status: string) => {
    const now = Date.now();
    if (now - lastAlertTimestampRef.current < COOLDOWN_MS) {
      console.log('Alert suppressed due to cooldown.');
      return;
    }

    lastAlertTimestampRef.current = now;

    if (status === ALERT_STATUS.MODERATE || status === ALERT_STATUS.CRITICAL) {
      playAlertSound();
      setShowAlertPopup(true);
      setTimeout(() => setShowAlertPopup(false), 5000);
    }
  }, []);

  const updateAlertStatus = (sensorType: number, value: number) => {
    const threshold = thresholds[sensorType];
    if (!threshold) {
      console.warn(`No threshold defined for sensor ${sensorType}`);
      return;
    }

    let safe = true;
    if (sensorType === 1) {
      safe = value <= threshold.max; // Temperature
    } else if (sensorType === 2) {
      safe = value >= threshold.min && value <= threshold.max; // Humidity
    } else {
      safe = value >= threshold.min && value <= threshold.max;
    }

    setSensorSafety((prev) => {
      if (prev[sensorType] === safe) return prev;
      console.log(
        `[${new Date().toISOString()}] Sensor ${sensorType} safety changed to ${
          safe ? 'SAFE' : 'UNSAFE'
        }`
      );
      return { ...prev, [sensorType]: safe };
    });
  };

  useEffect(() => {
    return () => {
      if (motionTimer.current) clearTimeout(motionTimer.current);
      if (soundTimer.current) clearTimeout(soundTimer.current);
    };
  }, []);

  useEffect(() => {
    if (JSON.stringify(sensorSafety) !== JSON.stringify(prevSensorSafety.current)) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Sensor safety updated:`, sensorSafety);

      const unsafeCount = Object.values(sensorSafety).filter((safe) => !safe).length;
      console.log(`[${timestamp}] Unsafe sensor count: ${unsafeCount}`);

      let newStatus = ALERT_STATUS.SAFE;
      if (unsafeCount >= 3) newStatus = ALERT_STATUS.CRITICAL;
      else if (unsafeCount === 2) newStatus = ALERT_STATUS.MODERATE;
      else if (unsafeCount === 1) newStatus = ALERT_STATUS.MINOR;

      setAlertStatus(newStatus);
      setAlertColor(ALERT_COLORS[newStatus]);
      console.log(`[${timestamp}] Alert status changed to ${newStatus}`);
      triggerAlert(newStatus);

      if (newStatus === ALERT_STATUS.SAFE) lastAlertTimestampRef.current = 0;
      prevSensorSafety.current = sensorSafety;
    }
  }, [sensorSafety, triggerAlert]);

  const handleMotion = (value: number) => {
    // Get motion thresholds from database or use defaults
    const MOTION_THRESHOLD = thresholds[4]?.min_value ?? 1.5; // Motion intensity threshold
    const MOTION_DURATION_MS = (thresholds[4]?.max_value ?? 5) * 1000; // Duration in milliseconds
    
    if (value > MOTION_THRESHOLD) {
      if (!motionStartTime.current) {
        motionStartTime.current = Date.now();
        motionTimer.current = setTimeout(() => {
          if (Date.now() - (motionStartTime.current ?? 0) >= MOTION_DURATION_MS) {
            setSensorSafety((prev) => {
              if (!prev[4]) return prev;
              console.log(`[${new Date().toISOString()}] Motion changed: STABLE → TRIGGERED (threshold: ${MOTION_THRESHOLD}, duration: ${MOTION_DURATION_MS}ms)`);
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
        console.log(`[${new Date().toISOString()}] Motion changed: TRIGGERED → STABLE`);
        return { ...prev, 4: true };
      });
    }
  };

  const handleSound = useCallback(() => {
    setSensorSafety((prev) => {
      if (!prev[3]) return prev;
      console.log(`[${new Date().toISOString()}] Sound safety changed: SAFE → UNSAFE (Crying)`);
      return { ...prev, 3: false };
    });

    if (soundTimer.current) clearTimeout(soundTimer.current);

    soundTimer.current = setTimeout(() => {
      setSensorSafety((prev) => {
        if (prev[3]) return prev;
        console.log(`[${new Date().toISOString()}] Sound safety changed: UNSAFE → SAFE (Auto-reset)`);
        return { ...prev, 3: true };
      });
      soundTimer.current = null;
    }, 5000);
  }, []);

  const handleWeight = useCallback((value: number) => {
    let isUnsafe = false;
    let reason = '';

    // Check 1: Sudden Weight Drop
    if (previousWeight.current !== null) {
      const weightDrop = previousWeight.current - value;
      
      if (weightDrop > WEIGHT_DROP_THRESHOLD) {
        isUnsafe = true;
        reason = 'Sudden weight drop detected';
      }
    }

    // Check 2: Rapid Weight Changes
    if (weightHistory.current.length > 0) {
      const lastWeight = weightHistory.current[weightHistory.current.length - 1];
      const change = Math.abs(value - lastWeight);
      
      if (change > MAX_CHANGE_RATE) {
        isUnsafe = true;
        reason = reason ? `${reason} & Erratic readings` : 'Erratic weight readings';
      }
    }

    // Update weight history
    weightHistory.current.push(value);
    if (weightHistory.current.length > 5) weightHistory.current.shift();
    previousWeight.current = value;

    // Update sensor safety
    if (isUnsafe) {
      setSensorSafety((prev) => {
        if (!prev[5]) return prev;
        console.log(`[${new Date().toISOString()}] Weight safety changed: SAFE → UNSAFE (${reason})`);
        return { ...prev, 5: false };
      });
    } else {
      setSensorSafety((prev) => {
        if (prev[5]) return prev;
        console.log(`[${new Date().toISOString()}] Weight safety changed: UNSAFE → SAFE`);
        return { ...prev, 5: true };
      });
    }
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