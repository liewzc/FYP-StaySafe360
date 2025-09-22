```markdown
# StaySafe360

StaySafe360 is a cross-platform mobile application built with **React Native + Expo** that empowers individuals in Singapore to prepare for and respond to disasters and medical emergencies.

It combines localized hazard guides, first aid training, gamified quizzes, achievements, and emergency tools into one cohesive, **offline-first** platform.

---

## ✨ Features

### Quizzes & Learning
- Disaster preparedness, local hazards, and everyday first-aid quizzes  
- Tiered sublevels (I–IV) with increasing difficulty  
- Explanations and answer reviews to reinforce knowledge  
- Streak tracking and achievement unlocking for consistency  

### Gamification
- Badge & achievement system (First Quiz, Knowledge Seeker, Preparedness Novice, etc.)  
- Progress dashboard with icons, animations, and completion bars  
- Share results with friends for motivation  

### Knowledge Hub
- **Disaster Knowledge**: floods, haze, lightning, heatwaves, coastal flooding  
- **First Aid Guides**: CPR, choking, burns, fractures, bleeding control  
- **Resource Hub**: curated official sources (NEA, PUB, SCDF) + in-app browser  
- **CPR Training**: built-in metronome + instructional videos  

### Emergency Tools
- SOS quick-dial: **999 (Police), 995 (Ambulance), 1777 (Non-emergency ambulance)**  
- Loud emergency siren with vibration feedback  
- Interactive disaster preparedness checklist  
- Weather Map: rainfall, PM2.5, humidity, wind layers  

### Accessibility & Inclusivity
- WCAG-compliant contrast and ≥44dp touch targets  
- Dynamic text scaling & screen-reader support  
- Simple language & localized Singapore context  
- Offline-first storage for use without internet  

### Data & Storage
- Local persistence with **AsyncStorage** (results, achievements, bookmarks, preferences)  
- External APIs: **NEA & PUB** (air quality, rainfall, water levels, forecasts)  
- Offline caching with expiration rules  

---

## 🏗 Architecture

### Data Layer
- Local: AsyncStorage (progress, achievements, bookmarks, preferences)  
- Static JSON: quizzes, checklists, hazard & first-aid content  
- External APIs: NEA, PUB environmental data  

### Logic Layer
- Containers: orchestrate data + side effects (e.g., HomeContainer, ResultContainer, AchievementGalleryContainer)  
- Utilities: quiz engine, achievements, bookmarks, API helpers  
- Services: local storage, notifications, audio/haptic feedback  

### Presentation Layer
- Screens: Home, Knowledge, Quiz Hub, Results, Profile/Settings  
- Components: buttons, progress bars, cards, achievement badges, modals  
- Navigation: Tab + Stack via React Navigation  

---

## 📂 Project Structure (simplified)

```

/screens
/quiz
/knowledge
/results
/profile
/logic
/utils
/assets
App.js

````

---

## 🚀 Run Locally

**SDK Version Notice**  
This project was built and tested with **Expo SDK 52**.  
Please ensure your **Expo Go** app supports SDK 52:  
[Expo Go v52](https://expo.dev/go?sdkVersion=52&platform=android)

### Steps

#### 1. Create `.env` File
Create a file named **`.env`** in the project root and add:

```env
# Replace with your own key; do NOT commit real secrets
EXPO_PUBLIC_OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
EXPO_PUBLIC_OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
````

> **Notes**
>
> * Keys prefixed with `EXPO_PUBLIC_` are automatically exposed in Expo.
> * Do **not** commit real secrets to version control. For production, consider **EAS Secrets**.
> * Restart the dev server after adding or changing `.env`.

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Start the Development Server

```bash
npm start
```

This launches the **Expo Developer Tools**. You can run the app on:

* Android Emulator
* iOS Simulator
* Physical device: scan the QR code with **Expo Go (SDK 52)**

#### 4. Run Tests

```bash
npm test
```

---

## 🧪 Testing Notes

* Jest + React Native Testing Library
* Includes unit, component, and integration tests
* Run `npm test` to execute all test suites

---

## 🔑 Environment Variables (Reference)

If you need to use additional variables later, keep them in `.env` with the `EXPO_PUBLIC_` prefix if they must be accessible on the client.
For sensitive server-only values, avoid exposing them in the client bundle and consider a backend proxy or EAS Secrets.

---

## 📚 Credits / Acknowledgments

* **NEA & PUB** – official Singapore environmental APIs
* **Supabase** – optional authentication support (early prototype)
* **Expo** – cross-platform development, notifications, AV, haptics
* **Open-source resources** – first aid & disaster education references
