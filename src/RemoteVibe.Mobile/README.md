# RemoteVibe - Neon Glass Theme Demo

A React Native (Expo) mobile app demo for controlling and monitoring remote AI coding sessions. Built with the **Neon Glass** design theme -- dark backgrounds, glassmorphism panels, neon accent colors, and smooth animations.

## Design Theme

- **Dark background** (`#0a0a1a`) with subtle gradient mesh
- **Glassmorphism panels** using `expo-blur` with semi-transparent backgrounds
- **Neon accents**: Electric blue (`#00d4ff`), neon purple (`#a855f7`), hot pink (`#ec4899`)
- **Gradient borders** on cards via `expo-linear-gradient`
- **Glowing status indicators** with pulsing animations
- **Floating bottom tab bar** (phone) / **side rail** (tablet)
- **Floating Action Button** for creating new sessions

## Screens

1. **Sessions List** - Glass cards for each session with status indicators, search, 2-column grid on tablets
2. **Session Dashboard** - Chat conversation with AI, pending questions modal, command input bar. Split view on tablets.
3. **Settings** - Backend URL config, connection status with live stats, preferences, app info

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS) or Android Emulator, or the Expo Go app on a physical device

## Getting Started

```bash
# Navigate to the project directory
cd demos/01-react-native-neon-glass

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

Then:
- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go on your phone

## Project Structure

```
01-react-native-neon-glass/
├── App.tsx                          # Entry point
├── app.json                         # Expo config
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel config
└── src/
    ├── theme/
    │   └── colors.ts                # Design tokens (colors, spacing, typography)
    ├── data/
    │   └── mockData.ts              # Mock sessions, messages, questions
    ├── components/
    │   ├── GlassCard.tsx            # Reusable glassmorphism card
    │   ├── StatusBadge.tsx          # Animated status indicator chip
    │   ├── ChatBubble.tsx           # Chat message bubble (user/AI/system)
    │   ├── QuestionCard.tsx         # Interactive question card (multiple choice, yes/no)
    │   ├── CommandInput.tsx         # Text input with send button
    │   ├── SessionCard.tsx          # Session list item card
    │   ├── FloatingTabBar.tsx       # Custom tab bar (floating on phone, side rail on tablet)
    │   └── GlowingFAB.tsx          # Floating action button with glow animation
    ├── screens/
    │   ├── SessionsListScreen.tsx   # Home screen with session list
    │   ├── SessionDashboardScreen.tsx # Session detail with chat and questions
    │   └── SettingsScreen.tsx       # Settings and configuration
    └── navigation/
        └── AppNavigator.tsx         # React Navigation setup (tabs + stack)
```

## Tech Stack

- **Expo SDK 52** - React Native framework
- **React Navigation 7** - Navigation (bottom tabs + native stack)
- **expo-blur** - Glass blur effects
- **expo-linear-gradient** - Gradient backgrounds and borders
- **React Native Animated API** - Entrance animations, pulse effects, press feedback
- **TypeScript** - Full type safety

## Tablet Support

The app adapts to tablet-sized screens (width > 768px):
- Session list displays in a 2-column grid
- Session dashboard uses a split view: conversation (60%) + questions panel (40%)
- Bottom tab bar becomes a side rail navigation

## Notes

- All data is mocked inline -- no API calls are made
- This is a design/UI demo, not a production application
- The chat interface simulates responses when you send commands
