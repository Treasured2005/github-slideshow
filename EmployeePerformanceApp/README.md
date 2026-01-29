# Crew Performance Evaluator

A mobile app for roofing foremen to evaluate employee performance daily. Built with React Native and Expo for iOS and Android.

## Features

- **Local Authentication** — PIN/password login stored on-device
- **Employee Management** — Add, edit, remove crew members with photos
- **Daily Evaluations** — Rate employees on customizable categories (default: Safety, Quality, Productivity, Attendance, Teamwork, Initiative)
- **Customizable Rating Scale** — Default 1–5 (best), configurable to any range
- **Customizable Categories** — Rename, add, or remove rating categories
- **Smart Comments** — Prompted when rating differs from midpoint; standalone comments supported anytime
- **Duplicate Prevention** — One rating per employee per category per day, with update capability
- **Comment-First Workflow** — Previous day's comments shown before completing ratings
- **Reports** — On-screen reports with days rated, total, and average per category per employee
- **Flexible Periods** — Current/previous month, quarter, or year
- **PDF Export** — Generate and email reports to any address (e.g., HR)
- **Fully Offline** — All data stored locally via SQLite; no internet required
- **Timestamp Tracking** — All comments include date and time

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for testing)

### Install & Run

```bash
cd EmployeePerformanceApp
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Build for App Stores

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## App Structure

```
EmployeePerformanceApp/
├── App.js                          # Root navigation
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js          # Authentication
│   │   ├── HomeScreen.js           # Employee list & daily status
│   │   ├── AddEmployeeScreen.js    # Add/edit employee with photo
│   │   ├── EvaluationScreen.js     # Rate employee + comments
│   │   ├── ReportScreen.js         # View/export reports
│   │   └── SettingsScreen.js       # Categories, scale, foreman name
│   ├── storage/
│   │   └── database.js             # SQLite database layer
│   └── utils/
│       ├── dateUtils.js            # Date formatting & period calculation
│       └── pdfGenerator.js         # HTML report & PDF/email export
└── assets/                         # App icons & splash screen
```

## Report Contents

Each generated report includes:
- Foreman name
- Selected time period
- Report generation date
- Rating scale description
- Per employee:
  - Each category: days rated, total rating, average rating
  - All comments with date/time stamps
