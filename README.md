# Ayati 💕 — Our Love Story

A private, romantic Progressive Web App (PWA) handcrafted exclusively for **Ali & Aya**. Built with a dark glassmorphic iOS aesthetic, real-time dual-device synchronization, lock-screen Apple Web Push notifications, offline caching, and interactive romantic relationship tools.

---

## ✨ Features Overview

### 🔐 1. Private Dual-PIN Authentication
- **Tailored Profiles**: Independent login portals for **Ali 💙** and **Aya 💗**.
- **Default PINs**:
  - Ali: `1111`
  - Aya: `2222`
- **Dynamic Theming**: The app automatically tunes its ambient neon glow and accents depending on who is logged in.
- **PIN Customization**: Change your PIN anytime in `⚙️ Settings`.

---

### 💌 2. Love Letters & Time-Locked Capsules
- Write and send private love letters with unread badge indicators.
- **Time Capsule Mode**: Set an optional **"🔒 Lock until Date"** (e.g. anniversary or birthday).
- Sealed letters appear blurred with a countdown lock badge and shake playfully when tapped before the unlock date.

---

### 🎙️ 3. Voice Memos (Cross-Platform Audio Recording)
- Record voice notes directly from your iPhone (iOS Safari) or Android/Desktop with a single tap.
- Live recording timer with pulsing visualizer.
- Custom frosted-glass audio player with real-time waveform progress bar and play/pause controls.
- Automatically handles native audio container encoding (`MP4/AAC` on iOS, `WebM` on Android/PC).

---

### ❓ 4. Daily Couple Questions (Daily Q&A)
- 20+ rotating, thought-provoking questions that change automatically each day.
- **Secret Reveal Mechanism**:
  - Each partner writes their answer privately.
  - Answers remain locked until **both** partners have responded, then reveal side-by-side with celebratory confetti!
  - Past answered questions are saved in a browseable relationship journal.

---

### 🔔 5. Real-Time Lock-Screen Push Notifications
- **Serverless Backend (`api/push.js`)**: Powered by Vercel Serverless Functions and RFC 8292 VAPID encryption.
- **Apple APNs Delivery**: Sends instant push notifications to your iPhone lock screen even when the phone is asleep or the app is completely closed.
- **Triggered on**:
  - 💖 *"I Miss You!"* button taps
  - 💌 New Love Letters
  - 🎙️ Voice Memos
  - 💕 Sweet Words
  - ❓ Question of the Day responses

---

### ⏳ 6. Relationship Anniversary & Milestones
- **Anniversary Counter**: Real-time live counter tracking days, hours, minutes, and seconds since **July 5, 2026** (`05/07/2026`).
- **Milestone Countdown**: Track upcoming birthdays, trips, and special dates with auto-calculating day counters.

---

### 📸 7. Memories & Polaroid Lightbox
- Upload cherished couple photos with dates and captions.
- Fullscreen photo lightbox with automated ambient slideshow mode.

---

### 😊 8. Daily Mood Tracker & Check-in
- Check in your daily emotional mood with romantic emojis (💖, 🥰, 😊, 😴, 🥺, etc.).
- The dashboard highlights your partner's current mood in real time.
- View monthly mood history for both Ali and Aya.

---

### 📝 9. Shared Couple Bucket List
- Add shared dreams, goals, and adventures to achieve together.
- Tap to mark goals complete with sound effects and confetti celebrations.

---

### 🎵 10. Background Music & iOS Sound FX
- **Soundtrack**: *Indila — Love Story* plays smoothly in the background.
- **Web Audio SoundFX**: Tactile keypad clicks, sweet bubble-pop sounds for love bursts, and melodic chimes on goal completions.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Pure Semantic HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+) |
| **PWA & Offline** | Service Worker (`sw.js`) with Cache-First & Stale-While-Revalidate strategy |
| **Storage & Sync** | Hybrid: **localStorage** (Instant offline fallback) + **Firebase Firestore** (Real-time cloud sync) |
| **Backend & Push** | **Vercel Serverless Functions** (`/api/push.js`) + **Web Push (VAPID / Apple APNs)** |
| **Styling** | Apple Control Center Glassmorphism (`-webkit-backdrop-filter`), Spring Physics, Safe Area Insets (`env(safe-area-inset-top)`) |
| **Typography** | Playfair Display (Serif Headlines), Inter (Body UI), Dancing Script (Love Letter Signatures) |

---

## 📁 File Structure

```
├── api/
│   └── push.js              # Vercel Serverless API for VAPID Web Push (Apple APNs)
├── app.js                   # Core application logic, routing, audio, & animations
├── firebase-config.js       # Hybrid DataStore (localStorage + Firestore real-time sync)
├── index.html               # Main SPA HTML structure & iOS PWA meta tags
├── manifest.json            # Web App Manifest for mobile installation
├── package.json             # Backend dependencies (web-push)
├── style.css                # CSS design system, glassmorphic tokens, & responsive layouts
├── sw.js                    # Service Worker caching & background push notifications
└── vercel.json              # Clean URLs and Vercel routing configuration
```

---

## 📲 How to Install as an App on iPhone (iOS)

1. Open **[fatimti.vercel.app](https://fatimti.vercel.app/)** in **Safari** on your iPhone.
2. Tap the **Share button** (square with an up arrow at the bottom).
3. Scroll down and tap **"Add to Home Screen"** (**Ajouter sur l'écran d'accueil**).
4. Tap **Add** in the top-right corner.
5. Launch **Ayati** directly from your Home Screen — it will run full-screen without any browser address bars!
6. Tap **⚙️ Settings** → **"🔔 Turn On Notifications"** to enable lock-screen alerts.

---

## 🚀 Deployment & Local Development

### Deploy to Vercel
Pushing any changes to the `main` branch automatically triggers a deployment on Vercel:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

### Local Testing
Simply open `index.html` in any modern web browser or serve it with any static server:

```bash
# Using Python
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

---

## 🔒 Security & Privacy
- **Client-Side Passcode Protection**: Restricts interface access behind 4-digit PIN authentication.
- **Secure Web Push**: All push notification payloads are encrypted via VAPID standard RFC 8292.
- **Private Data Layer**: Data is isolated to your Firestore collection and locally synced to each device.

---

*Handcrafted with ❤️ for Ali & Aya.*
