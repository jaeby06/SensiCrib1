import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { supabase } from '../utils/supabaseclient';

const BabyRegister = () => {
  const router = useRouter();
  const [babyName, setBabyName] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizeGender = (inputGender) => {
    const normalized = inputGender.trim().toLowerCase();
    if (['male', 'm', 'boy'].includes(normalized)) return 'male';
    if (['female', 'f', 'girl'].includes(normalized)) return 'female';
    if (['other', 'o', 'non-binary', 'nb'].includes(normalized)) return 'non-binary';
    if (['prefer not to say', 'prefer not to answer'].includes(normalized)) return 'prefer_not_to_say';
    return null;
  };

  const handleBabyRegister = async () => {
    if (!babyName.trim() || !gender.trim() || !birthdate) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all fields before saving.',
      });
      return;
    }

    const normalizedGender = normalizeGender(gender);
    if (!normalizedGender) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Gender',
        text2: 'Please enter: Male, Female, Other, or Prefer not to say.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Toast.show({
          type: 'error',
          text1: 'User Not Logged In',
          text2: 'Please log in to register a baby.',
        });
        setLoading(false);
        return;
      }

      const { error: insertErrorBaby } = await supabase.from('baby').insert([
        {
          user_id: user.id,
          name: babyName.trim(),
          gender: normalizedGender,
          birth_date: birthdate.toISOString().split('T')[0],
        },
      ]);

      if (insertErrorBaby) {
        let errorMsg = insertErrorBaby.message;
        if (errorMsg.includes('baby_gender')) errorMsg = 'Invalid gender.';
        else if (errorMsg.includes('row-level security')) errorMsg = 'Access denied.';
        else if (errorMsg.includes('foreign key')) errorMsg = 'User profile not found.';
        Toast.show({ type: 'error', text1: 'Failed to Register Baby', text2: errorMsg });
        setLoading(false);
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success 🎉',
        text2: 'Baby registered successfully!',
      });

      router.replace('/connect'); // ✅ Navigate immediately

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Something went wrong. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setBirthdate(selectedDate);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 30}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.h1}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.header}>
              <Text style={styles.logoText}>SensiCrib</Text>
              <Text style={styles.tagline}>Smart Care Starts Here.</Text>
              <Text variant="headlineMedium" style={styles.registerText}>
                Enter Baby's Info
              </Text>
            </View>

            <TextInput
              placeholder="Baby Name"
              mode="outlined"
              style={styles.input}
              value={babyName}
              theme={{ roundness: 30 }}
              onChangeText={setBabyName}
            />

            <TextInput
              placeholder="Gender"
              mode="outlined"
              style={styles.input}
              value={gender}
              theme={{ roundness: 30 }}
              onChangeText={setGender}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View pointerEvents="none">
                <TextInput
                  placeholder="Birthdate"
                  mode="outlined"
                  style={styles.input}
                  theme={{ roundness: 30 }}
                  value={birthdate ? birthdate.toISOString().split('T')[0] : ''}
                  editable={false}
                />
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={birthdate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            <Button
              mode="contained"
              style={styles.button}
              onPress={handleBabyRegister}
              labelStyle={{ color: '#000' }}
              loading={loading}
              disabled={loading}
            >
              Save
            </Button>

            <Toast />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, padding: 16, backgroundColor: '#0b4f6c' },
  scrollContainer: { alignItems: 'center', flex: 1, flexGrow: 1 },
  header: { alignItems: 'center' },
  registerText: { fontWeight: 'bold', color: '#fff', marginTop: 10 },
  input: { marginBottom: 16, width: 250, alignSelf: 'center' },
  button: { marginBottom: 5, width: 120, alignSelf: 'center', backgroundColor: '#fff' },
  h1: { alignItems: 'center', flexDirection: 'row' },
  logo: { width: 385, height: 289, marginBottom: -50 },
  logoText: { fontSize: 64, color: '#fff', fontFamily: 'SpicyRice' },
  tagline: { fontSize: 18, color: '#fff', marginTop: -15, fontStyle: 'italic' },
});

export default BabyRegister;