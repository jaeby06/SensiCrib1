import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import GradientBackground from '../../components/ui/WhiteBlueGradient';
import { supabase } from '../../utils/supabaseclient';

// Default thresholds for babies 0-2 years old in the Philippines
const DEFAULT_THRESHOLDS = [
  { sensor_type_id: 1, min_value: 26.0, max_value: 28.0 }, // Temperature (°C)
  { sensor_type_id: 2, min_value: 40.0, max_value: 60.0 }, // Humidity (%)
  { sensor_type_id: 3, min_value: 3, max_value: 0.70 },    // Cry: min=consecutive, max=confidence
  { sensor_type_id: 4, min_value: 1.5, max_value: 5 },     // Motion: min=threshold, max=duration(seconds)
  { sensor_type_id: 5, min_value: 1.0, max_value: 0.5 },   // Weight: min=drop threshold, max=rapid change
];

export default function ThresholdScreen() {
  const [maxTemp, setMaxTemp] = useState(28.0);
  const [minTemp, setMinTemp] = useState(26.0);
  const [maxHumidity, setMaxHumidity] = useState(60.0);
  const [minHumidity, setMinHumidity] = useState(40.0);
  const [crySensitivity, setCrySensitivity] = useState(0.70); // CRY_THRESHOLD (0.50-0.95)
  const [cryConfirmation, setCryConfirmation] = useState(3);   // CONSECUTIVE_DETECTIONS (1-5)
  const [motionThreshold, setMotionThreshold] = useState(1.5); // Motion intensity (1.0-3.0)
  const [motionDuration, setMotionDuration] = useState(5);     // Duration in seconds (1-10)
  const [weightDropThreshold, setWeightDropThreshold] = useState(1.0); // kg - sudden drop detection
  const [weightChangeRate, setWeightChangeRate] = useState(0.5); // kg - rapid change detection
  const [babyId, setBabyId] = useState(null);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("User not authenticated");

        const userId = session.user.id;

        const { data: babyData, error: babyError } = await supabase
          .from('baby')
          .select('baby_id')
          .eq('user_id', userId)
          .single();

        if (babyError || !babyData) throw new Error("Baby not found");

        const babyId = babyData.baby_id;
        setBabyId(babyId);

        // Check if thresholds exist
        const { data: existingThresholds, error: checkError } = await supabase
          .from('thresholds')
          .select('sensor_type_id')
          .eq('baby_id', babyId);

        if (checkError) throw new Error(checkError.message);

        // If no thresholds exist, initialize them
        if (!existingThresholds || existingThresholds.length === 0) {
          const { error: insertError } = await supabase
            .from('thresholds')
            .insert(
              DEFAULT_THRESHOLDS.map(t => ({
                baby_id: babyId,
                sensor_type_id: t.sensor_type_id,
                min_value: t.min_value,
                max_value: t.max_value,
              }))
            );

          if (insertError) throw new Error(insertError.message);
        }

        // Fetch thresholds
        const { data: thresholds, error: thresholdError } = await supabase
          .from('thresholds')
          .select('sensor_type_id, min_value, max_value')
          .eq('baby_id', babyId);

        if (thresholdError) throw new Error(thresholdError.message);

        thresholds.forEach((t) => {
          switch (t.sensor_type_id) {
            case 1:
              setMinTemp(t.min_value);
              setMaxTemp(t.max_value);
              break;
            case 2:
              setMinHumidity(t.min_value);
              setMaxHumidity(t.max_value);
              break;
            case 3:
              setCryConfirmation(t.min_value);  // min = consecutive count
              setCrySensitivity(t.max_value);   // max = confidence threshold
              break;
            case 4:
              setMotionThreshold(t.min_value);  // min = motion threshold
              setMotionDuration(t.max_value);   // max = duration in seconds
              break;
            case 5:
              setWeightDropThreshold(t.min_value); // min = drop threshold
              setWeightChangeRate(t.max_value);    // max = rapid change rate
              break;
          }
        });
      } catch (error) {
        console.error("Error loading thresholds:", error);
        Alert.alert("Error", "Failed to load thresholds.");
      }
    };

    fetchThresholds();
  }, []);

  useEffect(() => {
    if (!babyId) return;

    const channel = supabase
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
          console.log('Threshold updated:', t);

          switch (t.sensor_type_id) {
            case 1:
              setMinTemp(t.min_value);
              setMaxTemp(t.max_value);
              break;
            case 2:
              setMinHumidity(t.min_value);
              setMaxHumidity(t.max_value);
              break;
            case 3:
              setCryConfirmation(t.min_value);
              setCrySensitivity(t.max_value);
              break;
            case 4:
              setMotionThreshold(t.min_value);
              setMotionDuration(t.max_value);
              break;
            case 5:
              setWeightDropThreshold(t.min_value);
              setWeightChangeRate(t.max_value);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [babyId]);

  const getSafetyWarnings = () => {
    const warnings = [];

    // Temperature warnings
    if (maxTemp > 30) {
      warnings.push("⚠️ Temperature range may cause overheating risk");
    }
    if (minTemp < 22) {
      warnings.push("⚠️ Temperature range may be too cold for baby");
    }

    // Humidity warnings
    if (maxHumidity > 70 || minHumidity < 30) {
      warnings.push("⚠️ Extreme humidity can affect baby's comfort and breathing");
    }

    // Cry sensitivity warnings
    if (crySensitivity > 0.85) {
      warnings.push("⚠️ High sound threshold may miss distress cries");
    }

    // Motion warnings
    if (motionThreshold > 2.5) {
      warnings.push("⚠️ Motion sensitivity too low – risk of missing falls");
    }

    // Weight warnings
    if (weightDropThreshold < 0.5 || weightChangeRate < 0.2) {
      warnings.push("⚠️ Weight threshold unsafe – may cause false alerts");
    }

    return warnings;
  };

  const saveThresholds = async () => {
    const thresholds = [
      { sensor_type_id: 1, min_value: minTemp, max_value: maxTemp },
      { sensor_type_id: 2, min_value: minHumidity, max_value: maxHumidity },
      { sensor_type_id: 3, min_value: cryConfirmation, max_value: crySensitivity },
      { sensor_type_id: 4, min_value: motionThreshold, max_value: motionDuration },
      { sensor_type_id: 5, min_value: weightDropThreshold, max_value: weightChangeRate },
    ];

    console.log("Saving thresholds:", thresholds);
    
    const { error: insertError } = await supabase
      .from('thresholds')
      .upsert(
        thresholds.map(t => ({
          baby_id: babyId,
          sensor_type_id: t.sensor_type_id,
          min_value: t.min_value,
          max_value: t.max_value,
        })),
        { onConflict: 'baby_id,sensor_type_id' }
      );

    if (insertError) throw new Error(insertError.message);

    Alert.alert(
      "✅ Thresholds Saved",
      `Max Temp: ${maxTemp}°C\nMin Temp: ${minTemp}°C\nMax Humidity: ${maxHumidity}%\nMin Humidity: ${minHumidity}%\nCry Sensitivity: ${(crySensitivity * 100).toFixed(0)}%\nCry Confirmation: ${cryConfirmation} times\nMotion Threshold: ${motionThreshold.toFixed(1)}\nMotion Duration: ${motionDuration}s\nWeight Drop Alert: ${weightDropThreshold} kg\nWeight Change Alert: ${weightChangeRate} kg`
    );
  };

  const handleSave = async () => {
    try {
      if (!babyId) throw new Error("Baby ID not loaded");

      // Check for safety warnings
      const warnings = getSafetyWarnings();
      if (warnings.length > 0) {
        Alert.alert(
          "⚠️ Safety Warning",
          warnings.join("\n\n") + "\n\nDo you want to continue?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Save Anyway", 
              style: "destructive",
              onPress: () => saveThresholds()
            }
          ]
        );
        return;
      }

      await saveThresholds();
    } catch (error) {
      console.error("Error saving thresholds:", error);
      Alert.alert("❌ Save Failed", "Could not save thresholds. Please try again.");
    }
  };

  const getColor = (value: number, min: number, max: number) => {
    const mid = (min + max) / 2;
    return value >= mid ? 'red' : 'green';
  };

  return (
    <GradientBackground>  
      <View style={styles.container}>
        <TouchableOpacity style={styles.adjustButton}>
          <Text style={styles.adjustButtonText}>Adjust Sensor Threshold</Text>
        </TouchableOpacity>

        <View style={styles.cardWrapper}>
          <ScrollView style={styles.card} showsVerticalScrollIndicator={true}>
            {/* Max Temperature */}
            <View style={styles.row}>
              <Text style={styles.label}>Max Temperature</Text>
              <Text style={styles.value}>{maxTemp.toFixed(1)} °C</Text>
            </View>
            <ProgressBar
              progress={maxTemp / 40}
              color={getColor(maxTemp, 20, 40)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={20}
              maximumValue={40}
              step={0.1}
              value={maxTemp}
              onValueChange={setMaxTemp}
              minimumTrackTintColor={getColor(maxTemp, 20, 40)}
              maximumTrackTintColor="#ccc"
            />

            {/* Min Temperature */}
            <View style={styles.row}>
              <Text style={styles.label}>Min Temperature</Text>
              <Text style={styles.value}>{minTemp.toFixed(1)} °C</Text>
            </View>
            <ProgressBar
              progress={minTemp / 40}
              color={getColor(minTemp, 10, 30)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={30}
              step={0.1}
              value={minTemp}
              onValueChange={setMinTemp}
              minimumTrackTintColor={getColor(minTemp, 10, 30)}
              maximumTrackTintColor="#ccc"
            />

            {/* Max Humidity */}
            <View style={styles.row}>
              <Text style={styles.label}>Max Humidity</Text>
              <Text style={styles.value}>{maxHumidity.toFixed(1)} %</Text>
            </View>
            <ProgressBar
              progress={maxHumidity / 100}
              color={getColor(maxHumidity, 0, 100)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={0.1}
              value={maxHumidity}
              onValueChange={setMaxHumidity}
              minimumTrackTintColor={getColor(maxHumidity, 0, 100)}
              maximumTrackTintColor="#ccc"
            />

            {/* Min Humidity */}
            <View style={styles.row}>
              <Text style={styles.label}>Min Humidity</Text>
              <Text style={styles.value}>{minHumidity.toFixed(1)} %</Text>
            </View>
            <ProgressBar
              progress={minHumidity / 100}
              color={getColor(minHumidity, 0, 100)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={0.1}
              value={minHumidity}
              onValueChange={setMinHumidity}
              minimumTrackTintColor={getColor(minHumidity, 0, 100)}
              maximumTrackTintColor="#ccc"
            />

            {/* Cry Sensitivity (Confidence Threshold) */}
            <View style={styles.row}>
              <Text style={styles.label}>Cry Sensitivity</Text>
              <Text style={styles.value}>{(crySensitivity * 100).toFixed(0)}%</Text>
            </View>
            <Text style={styles.helpText}>
              Lower = More sensitive (detects easier) | Higher = Less sensitive
            </Text>
            <ProgressBar
              progress={(crySensitivity - 0.5) / 0.45} // Normalize 0.50-0.95 to 0-1
              color={getColor(crySensitivity, 0.50, 0.95)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={0.50}
              maximumValue={0.95}
              step={0.05}
              value={crySensitivity}
              onValueChange={setCrySensitivity}
              minimumTrackTintColor={getColor(crySensitivity, 0.50, 0.95)}
              maximumTrackTintColor="#ccc"
            />

            {/* Cry Confirmation (Consecutive Detections) */}
            <View style={styles.row}>
              <Text style={styles.label}>Cry Confirmation</Text>
              <Text style={styles.value}>{cryConfirmation} times</Text>
            </View>
            <Text style={styles.helpText}>
              How many consecutive detections before alert (1-5)
            </Text>
            <ProgressBar
              progress={cryConfirmation / 5}
              color={getColor(cryConfirmation, 1, 5)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={cryConfirmation}
              onValueChange={setCryConfirmation}
              minimumTrackTintColor={getColor(cryConfirmation, 1, 5)}
              maximumTrackTintColor="#ccc"
            />

            {/* Motion Threshold */}
            <View style={styles.row}>
              <Text style={styles.label}>Motion Sensitivity</Text>
              <Text style={styles.value}>{motionThreshold.toFixed(1)}</Text>
            </View>
            <Text style={styles.helpText}>
              Lower = More sensitive (detects smaller movements) | Higher = Less sensitive
            </Text>
            <ProgressBar
              progress={(motionThreshold - 1.0) / 2.0} // Normalize 1.0-3.0 to 0-1
              color={getColor(motionThreshold, 1.0, 3.0)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={1.0}
              maximumValue={3.0}
              step={0.1}
              value={motionThreshold}
              onValueChange={setMotionThreshold}
              minimumTrackTintColor={getColor(motionThreshold, 1.0, 3.0)}
              maximumTrackTintColor="#ccc"
            />

            {/* Motion Duration */}
            <View style={styles.row}>
              <Text style={styles.label}>Motion Duration</Text>
              <Text style={styles.value}>{motionDuration}s</Text>
            </View>
            <Text style={styles.helpText}>
              How long motion must persist before alert (1-10 seconds)
            </Text>
            <ProgressBar
              progress={motionDuration / 10}
              color={getColor(motionDuration, 1, 10)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={motionDuration}
              onValueChange={setMotionDuration}
              minimumTrackTintColor={getColor(motionDuration, 1, 10)}
              maximumTrackTintColor="#ccc"
            />

            {/* Weight Drop Threshold */}
            <View style={styles.row}>
              <Text style={styles.label}>Weight Drop Alert</Text>
              <Text style={styles.value}>{weightDropThreshold.toFixed(1)} kg</Text>
            </View>
            <Text style={styles.helpText}>
              Alert when weight suddenly drops by this amount (baby removed)
            </Text>
            <ProgressBar
              progress={weightDropThreshold / 5}
              color={getColor(weightDropThreshold, 0.1, 5.0)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={5.0}
              step={0.1}
              value={weightDropThreshold}
              onValueChange={setWeightDropThreshold}
              minimumTrackTintColor={getColor(weightDropThreshold, 0.1, 5.0)}
              maximumTrackTintColor="#ccc"
            />

            {/* Weight Change Rate */}
            <View style={styles.row}>
              <Text style={styles.label}>Weight Change Alert</Text>
              <Text style={styles.value}>{weightChangeRate.toFixed(1)} kg</Text>
            </View>
            <Text style={styles.helpText}>
              Alert when rapid weight changes detected (sensor issue or movement)
            </Text>
            <ProgressBar
              progress={weightChangeRate / 2}
              color={getColor(weightChangeRate, 0.1, 2.0)}
              style={styles.progress}
            />
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={2.0}
              step={0.1}
              value={weightChangeRate}
              onValueChange={setWeightChangeRate}
              minimumTrackTintColor={getColor(weightChangeRate, 0.1, 2.0)}
              maximumTrackTintColor="#ccc"
            />
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
  adjustButton: {
    backgroundColor: '#0B3C5D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  adjustButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cardWrapper: {
    width: '100%',
    height: 475,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0B3C5D',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#fff',
    fontSize: 14,
  },
  value: {
    color: '#fff',
    fontWeight: '600',
  },
  helpText: {
    color: '#A0C4E0',
    fontSize: 11,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  progress: {
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
    alignItems: 'center',
    bottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});