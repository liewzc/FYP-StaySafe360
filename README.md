好的 👍 我帮你写一个 StaySafe360 的 README.md，参考你给的 LiveShield 模板，但内容换成你项目的特性。

⸻

StaySafe360

StaySafe360 is a cross-platform mobile application built with React Native + Expo that empowers individuals in Singapore to prepare for and respond to disasters and medical emergencies.

It combines localized hazard guides, first aid training, gamified quizzes, achievements, and emergency tools into one cohesive, offline-first platform.

⸻

✨ Features
	•	Quizzes & Learning
	•	Disaster preparedness, local hazards, and everyday first-aid quizzes
	•	Tiered sublevels (I–IV) with increasing difficulty
	•	Explanations and answer reviews to reinforce knowledge
	•	Streak tracking and achievement unlocking for consistency
	•	Gamification
	•	Badge & achievement system (First Quiz, Knowledge Seeker, Preparedness Novice, etc.)
	•	Progress dashboard with icons, animations, and completion bars
	•	Share results with friends for motivation
	•	Knowledge Hub
	•	Disaster Knowledge: floods, haze, lightning, heatwaves, coastal flooding
	•	First Aid Guides: CPR, choking, burns, fractures, bleeding control
	•	Resource Hub: curated official sources (NEA, PUB, SCDF) + in-app browser
	•	CPR Training: built-in metronome + instructional videos
	•	Emergency Tools
	•	SOS quick-dial: 999 (Police), 995 (Ambulance), 1777 (Civil Defence)
	•	Loud emergency siren with vibration feedback
	•	Interactive disaster preparedness checklist
	•	Weather Map: rainfall, PM2.5, humidity, wind layers
	•	Accessibility & Inclusivity
	•	WCAG-compliant contrast and ≥44dp touch targets
	•	Dynamic text scaling & screen-reader support
	•	Simple language & localized Singapore context
	•	Offline-first storage for use without internet
	•	Data & Storage
	•	Local persistence with AsyncStorage (results, achievements, bookmarks, preferences)
	•	External APIs: NEA & PUB (air quality, rainfall, water levels, forecasts)
	•	Offline caching with expiration rules

⸻

🏗 Architecture

Data Layer
	•	Local: AsyncStorage (progress, achievements, bookmarks, preferences)
	•	Static JSON: quizzes, checklists, hazard & first-aid content
	•	External APIs: NEA, PUB environmental data

Logic Layer
	•	Containers: orchestrate data + side effects (e.g., HomeContainer, ResultContainer, AchievementGalleryContainer)
	•	Utilities: quiz engine, achievements, bookmarks, API helpers
	•	Services: local storage, notifications, audio/haptic feedback

Presentation Layer
	•	Screens: Home, Knowledge, Quiz Hub, Results, Profile/Settings
	•	Components: buttons, progress bars, cards, achievement badges, modals
	•	Navigation: Tab + Stack via React Navigation

⸻

📂 Project Structure (simplified)

/screens
  /quiz
  /knowledge
  /results
  /profile
/logic
/utils
/assets
App.js


⸻

🚀 Run Locally

⚠️ SDK Version Notice:
This project was built and tested using Expo SDK 52.
Please ensure your Expo Go app is updated to SDK 52:
👉 https://expo.dev/go?sdkVersion=52&platform=android

Steps
	1.	Install Dependencies

npm install

	2.	Start the Development Server

npm start

This launches the Expo Developer Tools. You can run the app on:
	•	Android Emulator
	•	iOS Simulator
	•	Physical device: scan QR code with Expo Go (SDK 52)

	3.	Run Tests

npm test


⸻

🧪 Testing Notes
	•	Uses Jest + React Native Testing Library
	•	Includes unit, component, and integration tests
	•	Run npm test to execute all test suites

⸻

📚 Credits / Acknowledgments
	•	NEA & PUB – for official Singapore environmental APIs
	•	Supabase – for optional authentication support (early prototype)
	•	Expo – for cross-platform development, notifications, AV, haptics
	•	Open-source resources – for first aid and disaster education references