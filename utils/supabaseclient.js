import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tnpzibxbwoertwcpuvdy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRucHppYnhid29lcnR3Y3B1dmR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTIyNTAsImV4cCI6MjA3NDk4ODI1MH0.KA4i1tAMe4A8pXQKHrKdWUH_fi8QHkp7hIV_Mu_ksGY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Subscribe to device status changes
export const subscribeToDeviceStatus = (deviceId, onStatusChange) => {
  return supabase
    .channel(`device-${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'device',
        filter: `id=eq.${deviceId}`
      },
      (payload) => {
        console.log('Device status changed:', payload);
        onStatusChange?.(payload.new);
      }
    )
    .subscribe();
};

// Function to check device status and update if offline
export const startDeviceStatusMonitoring = async (deviceId, offlineThresholdSeconds = 30) => {
  // Initial check
  checkDeviceStatus(deviceId, offlineThresholdSeconds);
  
  // Set up periodic checking every 10 seconds
  setInterval(() => checkDeviceStatus(deviceId, offlineThresholdSeconds), 10000);
};

const checkDeviceStatus = async (deviceId, offlineThresholdSeconds) => {
  try {
    const { data: device, error } = await supabase
      .from('device')
      .select('last_seen, status')
      .eq('id', deviceId)
      .single();

    if (error) throw error;

    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffSeconds = (now - lastSeen) / 1000;

    // If device hasn't updated in threshold period and isn't already marked offline
    if (diffSeconds > offlineThresholdSeconds && device.status !== 'offline') {
      await supabase
        .from('device')
        .update({ status: 'offline' })
        .eq('id', deviceId);
      
      console.log(`Device ${deviceId} marked as offline`);
    }
  } catch (error) {
    console.error('Error checking device status:', error);
  }
};