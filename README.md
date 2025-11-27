# SensiCrib 🍼  
**Smart Care Starts Here.**

SensiCrib is a smart baby monitoring application built with React Native and Expo. It pairs with a dedicated hardware crib device to provide real-time monitoring of a baby's environment and health metrics. By integrating sensors for temperature, humidity, motion, weight, and sound, SensiCrib ensures parents have peace of mind through instant alerts and live status updates.

## 📱 Features

* **Secure Authentication**: User registration and login system linked to baby profiles.
* **Baby Profile Management**: Create and manage unique profiles for your baby (Name, Gender, Birthdate).
* **Device Pairing**: Seamlessly pair with SensiCrib hardware using **QR Code Scanning**.
* **Real-Time Monitoring**:
    * 🌡️ **Temperature & Humidity**: Ensure the room climate is safe.
    * 🔊 **Crying Detection**: Instant alerts when sound levels indicate crying.
    * ⚖️ **Weight Monitoring**: Track baby's weight directly from the crib.
    * 🏃 **Motion Detection**: Monitor movement levels (Stable vs. Active).
* **Smart Alerts**: Visual and auditory alerts when sensor readings cross safe thresholds.
* **Device Health**: Monitors device connectivity status (Active, Offline, Error).

## 🛠 Tech Stack

* **Frontend**: React Native, Expo (SDK 54), Expo Router
* **UI Framework**: React Native Paper
* **Backend / Database**: Supabase (PostgreSQL, Auth, Realtime)
* **Hardware Integration**: ESP32/IoT device communicating via Supabase Realtime (Inferred)

## 🚀 Getting Started

### Prerequisites
* Node.js installed
* Expo Go app on your physical device or an Android/iOS Simulator

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/jaeby06/sensicrib1.git](https://github.com/jaeby06/sensicrib1.git)
    cd sensicrib1
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment**
    Ensure `utils/supabaseclient.js` contains your valid Supabase URL and Anon Key.

4.  **Run the App**
    ```bash
    npx expo start
    ```

## 📂 Project Structure

* `app/`: Main application screens and routing (Expo Router).
    * `(tabs)/`: Main dashboard screens (Home, Account, Explore).
    * `auth/`: Login, Register, and Recovery screens.
    * `baby.tsx`: Baby registration logic.
    * `qr.tsx`: QR code scanner for device provisioning.
* `components/`: Reusable UI components (Alerts, Gradients, Themed Views).
* `utils/`: Supabase client configuration and helper functions.
* `assets/`: Images, fonts, and sounds.

## 🤝 Authors
* **Capstone Team SensiCrib**
