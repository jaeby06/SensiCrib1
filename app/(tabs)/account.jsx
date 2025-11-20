import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../utils/supabaseclient';


export default function ProfileScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [babyHistory, setBabyHistory] = useState([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [fullName, setFullName] = useState(null);
  const [email, setEmail] = useState(null);
  const [phone, setPhone] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("Error fetching user:", userError);
        router.replace('/login');
        return;
      }
      setUser(userData.user);

      const { data: userInfo, error: userInfoError } = await supabase
        .from("users")
        .select("full_name, email, phone_number")
        .eq("user_id", userData.user.id)
        .single();

      if (userInfoError || !userInfo) {
        console.error("Error fetching user details:", userInfoError);
        return;
      }

      setFullName(userInfo.full_name || "User's Full Name");
      setEmail(userInfo.email || userData.user.email || "User's Email");
      setPhone(userInfo.phone_number || "User's Phone Number");
    };

    fetchUserInfo();
  }, []);

  const openHistoryModal = async () => {
    setHistoryVisible(true);

    const { data: babyData, error } = await supabase
      .from('baby')
      .select('baby_id')
      .eq('user_id', user?.id)
      .single();

    if (error || !babyData) {
      console.error('Error fetching baby ID:', error);
      return;
    }

    const { data: historyData, error: historyError } = await supabase
      .from('historical_data')
      .select('sensor_type_id, avg_value, status, created_at')
      .eq('baby_id', babyData.baby_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return;
    }

    const grouped = {};
    historyData.forEach((entry) => {
      const day = new Date(entry.created_at).toDateString();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(entry);
    });

    const groupedArray = Object.entries(grouped).map(([day, entries]) => ({
      day,
      entries,
    }));

    setBabyHistory(groupedArray);
    setCurrentDayIndex(0);
  };

  const handleUpdate = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        email: email,
        phone_number: phone,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Could not update profile.");
      return;
    }

    setModalVisible(false);
    Alert.alert("Success", "Profile Updated!");
  };

  const handleLogout = async () => {
    if (!user) {
      console.log("No user session found. Redirecting to login.");
      router.replace('/login');
      return;
    }

    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "There was an issue logging you out.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
            source={require('../../assets/avatar.png')}
          style={styles.avatar}
        />
      </View>
      <LinearGradient
        colors={['#E8F1F5', '#C1DFF0', '#0B4F6C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container2}
      >
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{fullName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone Number:</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.updateButtonText}>Update</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyButton}
        onPress={openHistoryModal}
      >
        <Text style={styles.historyButtonText}>View Baby History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
            />

            <TouchableOpacity style={styles.doneButton} onPress={handleUpdate}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={historyVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🗓️ Baby's Safety Summary</Text>

            <ScrollView style={{ width: '85%', height: 500 }}>
              {babyHistory.length === 0 ? (
                <Text>No history available.</Text>
              ) : (
                <>
                  <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 10 }}>
                    {babyHistory[currentDayIndex].day}
                  </Text>
                  {babyHistory[currentDayIndex].entries.map((entry, index) => {
                    const sensorInfo = {
                      1: { icon: '🌡️', name: 'Temperature', unit: '°C' },
                      2: { icon: '💧', name: 'Humidity', unit: '%' },
                      3: { icon: '🎵', name: 'Sound', unit: '' },
                      4: { icon: '🏃', name: 'Motion', unit: '' },
                      5: { icon: '⚖️', name: 'Weight', unit: 'g' },
                    };
                    
                    const sensor = sensorInfo[entry.sensor_type_id];
                    if (!sensor) return null; // Skip unknown sensors
                    
                    const displayStatus = 
                      entry.status === 'normal' 
                        ? '✅ Normal' 
                        : '⚠️ Triggered';

                    return (
                      <View key={index} style={{ marginBottom: 10 }}>
                        <Text>{sensor.icon} {sensor.name}</Text>
                        <Text>
                          {entry.avg_value}{sensor.unit} {displayStatus}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              {currentDayIndex > 0 && (
                <TouchableOpacity
                  onPress={() => setCurrentDayIndex((i) => i - 1)}
                >
                  <Text style={{ fontSize: 20 }}>⬅️</Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#666' }}>
                {currentDayIndex + 1} / {babyHistory.length}
              </Text>
              {currentDayIndex < babyHistory.length - 1 && (
                <TouchableOpacity
                  onPress={() => setCurrentDayIndex((i) => i + 1)}
                >
                  <Text style={{ fontSize: 20 }}>➡️</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.doneButton} onPress={() => setHistoryVisible(false)}>
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B3C5D',
    alignItems: 'center',
    paddingTop: 40,
  },
  header: {
    backgroundColor: '#0B3C5D',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 30,
  },
  container2: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    width: '100%',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderColor: '#fff',
  },
  card: {
    backgroundColor: '#0B3C5D',
    padding: 20,
    borderRadius: 12,
    width: '87%',
    marginBottom: 30,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  value: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  updateButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  historyButton: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: '#0B3C5D',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: 'red',
    paddingVertical: 14,
    paddingHorizontal: 55,
    borderRadius: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  doneButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});