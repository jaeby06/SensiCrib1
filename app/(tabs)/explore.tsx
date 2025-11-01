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
  { sensor_type_id: 3, min_value: 0, max_value: 70 },      // Sound (dB)
  { sensor_type_id: 4, min_value: 0, max_value: 100 },     // Motion (not adjustable in UI)
  { sensor_type_id: 5, min_value: 0, max_value: 5.0 },     // Weight (kg)
  { sensor_type_id: 6, min_value: 100, max_value: 500 },   // Sound Pitch (Hz)
];

export default function ThresholdScreen() {
  const [maxTemp, setMaxTemp] = useState(28.0);
  const [minTemp, setMinTemp] = useState(26.0);
  const [maxHumidity, setMaxHumidity] = useState(60.0);
  const [minHumidity, setMinHumidity] = useState(40.0);
  const [soundSensitivity, setSoundSensitivity] = useState(70);
  const [weightRange, setWeightRange] = useState(5.0);
  const [maxPitch, setMaxPitch] = useState(500);
  const [minPitch, setMinPitch] = useState(100);
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
              setSoundSensitivity(t.max_value);
              break;
            case 5:
              setWeightRange(t.max_value);
              break;
            case 6:
              setMinPitch(t.min_value);
              setMaxPitch(t.max_value);
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
              setSoundSensitivity(t.max_value);
              break;
            case 5:
              setWeightRange(t.max_value);
              break;
            case 6:
              setMinPitch(t.min_value);
              setMaxPitch(t.max_value);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [babyId]);

const handleSave = async () => {
  try {
    if (!babyId) throw new Error("Baby ID not loaded");

    const thresholds = [
      { sensor_type_id: 1, min_value: minTemp, max_value: maxTemp },
      { sensor_type_id: 2, min_value: minHumidity, max_value: maxHumidity },
      { sensor_type_id: 3, min_value: 0, max_value: soundSensitivity },
      { sensor_type_id: 5, min_value: 0, max_value: weightRange }, // Max weight is now 50
      { sensor_type_id: 6, min_value: minPitch, max_value: maxPitch },
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
        { onConflict: 'baby_id,sensor_type_id' } // Use both baby_id and sensor_type_id for conflict resolution
      );

    if (insertError) throw new Error(insertError.message);

    Alert.alert(
      "✅ Thresholds Saved",
      `Max Temp: ${maxTemp}°C\nMin Temp: ${minTemp}°C\nMax Humidity: ${maxHumidity}%\nMin Humidity: ${minHumidity}%\nSound Sensitivity: ${soundSensitivity} dB\nWeight Range: ${weightRange} kg\nPitch Range: ${minPitch}-${maxPitch} Hz`
    );
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

          {/* Sound Sensitivity */}
          <View style={styles.row}>
            <Text style={styles.label}>Sound Sensitivity</Text>
            <Text style={styles.value}>{soundSensitivity} dB</Text>
          </View>
          <ProgressBar
            progress={soundSensitivity / 100}
            color={getColor(soundSensitivity, 0, 100)}
            style={styles.progress}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={soundSensitivity}
            onValueChange={setSoundSensitivity}
            minimumTrackTintColor={getColor(soundSensitivity, 0, 100)}
            maximumTrackTintColor="#ccc"
          />

          {/* Max Pitch */}
          <View style={styles.row}>
            <Text style={styles.label}>Max Pitch</Text>
            <Text style={styles.value}>{maxPitch} Hz</Text>
          </View>
          <ProgressBar
            progress={maxPitch / 1000}
            color={getColor(maxPitch, 0, 1000)}
            style={styles.progress}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1000}
            step={10}
            value={maxPitch}
            onValueChange={setMaxPitch}
            minimumTrackTintColor={getColor(maxPitch, 0, 1000)}
            maximumTrackTintColor="#ccc"
          />

          {/* Min Pitch */}
          <View style={styles.row}>
            <Text style={styles.label}>Min Pitch</Text>
            <Text style={styles.value}>{minPitch} Hz</Text>
          </View>
          <ProgressBar
            progress={minPitch / 1000}
            color={getColor(minPitch, 0, 1000)}
            style={styles.progress}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1000}
            step={10}
            value={minPitch}
            onValueChange={setMinPitch}
            minimumTrackTintColor={getColor(minPitch, 0, 1000)}
            maximumTrackTintColor="#ccc"
          />

          {/* Weight */}
          <View style={styles.row}>
            <Text style={styles.label}>Weight Range</Text>
            <Text style={styles.value}>{weightRange.toFixed(1)} kg</Text>
          </View>
          <ProgressBar
            progress={weightRange / 50} // Adjusted for max 50kg
            color={getColor(weightRange, 0, 50)}
            style={styles.progress}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={50} // Updated to 50kg
            step={0.1}
            value={weightRange}
            onValueChange={setWeightRange}
            minimumTrackTintColor={getColor(weightRange, 0, 50)}
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
