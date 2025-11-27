# SensiCrib Backend Documentation

## Overview
SensiCrib uses Supabase as a Backend-as-a-Service (BaaS). The mobile application communicates directly with the PostgreSQL database using the `supabase-js` client. Real-time updates for sensor data are handled via Supabase Realtime subscriptions.

## 🗄️ Database Schema

### 1. `users` (Public Profile)
Stores user profile information linked to the secure Auth table.
* **user_id** (UUID, PK): References `auth.users`.
* **username** (Text): Unique username.
* **full_name** (Text): User's real name.
* **phone_number** (Text): Contact number.

### 2. `baby`
Stores the profile of the infant being monitored.
* **baby_id** (UUID, PK): Unique identifier.
* **user_id** (UUID, FK): The parent account managing this profile.
* **name** (Text): Baby's name.
* **gender** (Text): Male, Female, etc.
* **birth_date** (Date): DOB.

### 3. `device`
Represents the physical IoT hardware (The Crib).
* **id** / **device_id** (UUID, PK): Unique hardware ID.
* **pair_token** (Text): The unique token inside the QR code used for claiming the device.
* **user_id** (UUID, FK): The owner (set after pairing).
* **baby_id** (UUID, FK): The baby currently assigned to this crib.
* **paired** (Boolean): `true` if claimed by a user.
* **status** (Enum): `active`, `offline`, `error`.
* **last_seen** (Timestamp): Last heartbeat from hardware.

### 4. `sensor_data`
Time-series data stream from the hardware.
* **id** (BigInt, PK): Auto-increment.
* **device_id** (UUID, FK): Origin device.
* **sensor_type_id** (Int): ID mapping to sensor type.
    * `1`: Temperature
    * `2`: Humidity
    * `3`: Sound
    * `4`: Motion
    * `5`: Weight
* **value** (Float): The raw reading.
* **timestamp** (Timestamptz): When the reading occurred.

### 5. `thresholds`
Safety limits configured for alerts.
* **baby_id** (UUID, FK): The baby profile these settings apply to.
* **sensor_type_id** (Int): Target sensor.
* **min_value** (Float): Low limit (e.g., too cold).
* **max_value** (Float): High limit (e.g., fever heat).

---

## ⚡ Remote Procedure Calls (RPC)
These are custom SQL functions stored in Supabase, called by the app for secure operations.

### `get_user_email_by_username`
* **Purpose**: Allows login via username by resolving it to an email address securely on the server side.
* **Parameters**: `p_username` (String)
* **Returns**: Email address (String) or `null`.

### `set_pair_token`
* **Purpose**: Sets a session variable in the database during the QR scanning process. This is used by Row Level Security (RLS) policies to allow the user temporary permission to "claim" a device that matches the token.
* **Parameters**: `token` (String)

---

## 📡 Real-time Subscriptions
The app listens to specific database events to update the UI instantly without refreshing.

1.  **Sensor Data Stream**
    * **Channel**: `sensor-data`
    * **Filter**: `baby_id=eq.{currentBabyId}`
    * **Event**: `INSERT` on `sensor_data` table.
    * **Action**: Updates the dashboard gauges and triggers alerts if values exceed thresholds.

2.  **Device Status**
    * **Channel**: `device-{deviceId}`
    * **Filter**: `id=eq.{deviceId}`
    * **Event**: `UPDATE` on `device` table.
    * **Action**: Updates the connection icon (Online/Offline) in the app header.

3.  **Threshold Updates**
    * **Channel**: `threshold-updates`
    * **Filter**: `baby_id=eq.{currentBabyId}`
    * **Event**: `UPDATE` on `thresholds` table.
    * **Action**: Instantly applies new safety limits to the alert logic.
