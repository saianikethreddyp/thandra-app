# Thandra Self Drive Cars

A premium, production-ready React Native application for Thandra Self Drive Cars. This app includes a consumer-facing booking flow, a fully hidden administrative dashboard, and real-time Firestore synchronization.

## Features

- **Consumer Booking Flow:** Users can select a branch (Madhapur, Dilshuknagar, B.N reddy nagar, JNTU), enter trip details, and submit bookings.
- **Smart Contacts Integration:** Securely captures emergency contacts directly from the device.
- **Invisible Admin Panel:** A secret gateway hidden in the Splash Screen to access the admin dashboard.
- **Command Center:** Real-time Firebase sync, advanced search/filtering (branch, date, keyword), and booking management (view contacts, delete bookings).
- **Security Lockout:** 4-digit PIN protection that reads securely from Firestore, featuring a 4-attempt brute-force lockout.

## Prerequisites

Before running or deploying the app, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for App Store deployment)

## Setup & Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Firebase Configuration:**
   Ensure your Firebase configuration is correctly set up in `firebaseConfig.ts`. The app expects two collections in Firestore:
   - `bookings`: Used to store all car reservations.
   - `config`: Create a document here with ID `admin` and a field `pin` (string) to set your Admin Dashboard password.

3. **Start the Development Server:**
   ```bash
   npx expo start
   ```
   Scan the QR code with the Expo Go app on your physical device, or press `i` / `a` to open in an emulator.

## Accessing the Admin Panel

The Admin Panel is completely invisible to normal users. To access it:
1. Launch the app and view the initial Splash Screen.
2. **Press and hold** the top area of the poster (near the Thandra logo) for **2 seconds**.
3. Enter your 4-digit Admin PIN.

## Deployment (EAS Build)

The app's metadata (`app.json`) is fully preconfigured for Apple and Google, including the required Privacy Policy declarations for Contact access and premium app icons.

**To build for Android (Play Store):**
```bash
eas build -p android
```

**To build for iOS (App Store):**
```bash
eas build -p ios
```

---
*Built with ❤️ using React Native, Expo, and Firebase.*
