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
    } else if (sensorType === 5) {
      safe = value >= threshold.min; // Weight
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
    if (value > 1.1) {
      if (!motionStartTime.current) {
        motionStartTime.current = Date.now();
        motionTimer.current = setTimeout(() => {
          if (Date.now() - (motionStartTime.current ?? 0) >= 5000) {
            setSensorSafety((prev) => {
              if (!prev[4]) return prev;
              console.log(`[${new Date().toISOString()}] Motion changed: STABLE → TRIGGERED`);
              return { ...prev, 4: false };
            });
          }
        }, 5000);
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
    resetAlertStatus,
    sensorSafety,
  };
};
