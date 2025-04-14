# InfluConnect Mobile App

A React Native mobile application for the InfluConnect platform, allowing influencers, users, and admins to connect through chat, calls, and profile interactions.

## Features

### Influencer Interface
- Dashboard with earnings display and statistics
- Profile link sharing functionality
- Real-time chat with users
- Audio and video call support
- Call history and missed call management
- Notification system

### User Interface
- Browse and discover influencers
- Chat with influencers
- Book calls with influencers
- Wallet management for payments
- Profile customization

### Admin Interface
- User management
- Influencer verification
- Transaction monitoring
- Platform statistics and analytics
- Content moderation

## Tech Stack

- React Native
- Expo
- React Navigation
- WebSockets for real-time communication
- WebRTC for audio/video calls
- AsyncStorage for local data persistence
- Expo Vector Icons

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/influconnect-mobile.git
cd influconnect-mobile
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Start the development server
```bash
npx expo start
```

4. Run on a device or simulator
- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go app on your physical device

## Project Structure

```
InfluConnect/
├── src/
│   ├── api/              # API interactions
│   ├── assets/           # Images, fonts, etc.
│   ├── components/       # Reusable UI components
│   ├── contexts/         # Context providers (auth, socket, etc.)
│   ├── navigation/       # Navigation setup
│   ├── screens/
│   │   ├── auth/         # Login, registration screens
│   │   ├── influencer/   # Influencer-specific screens
│   │   ├── admin/        # Admin-specific screens
│   │   └── user/         # User-specific screens
│   └── utils/            # Helper functions
└── App.js                # Root component
```

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
API_URL=https://api.influconnect.com
SOCKET_URL=wss://api.influconnect.com/ws
```

## Building for Production

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```

## License

This project is proprietary and confidential.

## Contact

For any inquiries, please contact [support@influconnect.com](mailto:support@influconnect.com).