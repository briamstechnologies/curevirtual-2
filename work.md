Project Title: CureVirtual Mobile App – Full System Integration & Production Completion

Objective:
Upgrade and finalize the CureVirtual React Native (Expo) mobile application to achieve COMPLETE feature parity, data synchronization, and behavioral consistency with the existing React Vite Web Application, based on the unified monorepo architecture.

The mobile app must operate as a fully functional client of the Node.js/Express backend and Supabase system, identical to the web platform.

---

System Architecture Awareness (MANDATORY):

- Monorepo Structure:
  - Root: Node.js/Express Backend (API Layer)
  - /src: React Web App (Reference Behavior)
  - /mobile: React Native App (Target Implementation)

- Backend:
  - Express.js APIs (controllers/, routes/)
  - Prisma ORM (PostgreSQL via Supabase)
  - JWT-based authentication via Supabase Auth
  - Service-role backend enforcement (NO direct client DB logic)

- Mobile Stack:
  - React Native (Expo)
  - React Navigation (Drawer + Tabs + Stack)
  - AsyncStorage (JWT persistence)
  - Axios (API layer)
  - Socket.io (real-time features)

---

Core Requirements:

1. FULL API INTEGRATION (CRITICAL)
- Connect all mobile screens to backend APIs (NO mock or dummy data)
- Ensure JWT token flow:
  - Store token in AsyncStorage
  - Attach token in Axios interceptors
  - Auto-refresh or re-auth if needed
- Fix profile data issues:
  - Correct mapping (authUser vs profile.user structure)
  - Ensure all fields render properly (name, email, role, etc.)

---

2. ROLE-BASED FEATURE EXECUTION
- Dynamically render features based on ROLE:
  - Patient
  - Doctor
  - Pharmacy
  - Admin
  - Support
- Ensure DASHBOARD_CONFIGS[role] works correctly
- Every button must route correctly using:
  navigation.navigate(target, { screen: screenName })

---

3. DASHBOARD FUNCTIONALITY FIX
Fix ALL non-working modules:

- Messages → Connect to /messages/inbox API + socket.io
- Video Call → Connect to /videocall/list + roomName logic (WebRTC/Zego)
- Reports → Fetch from backend
- Earnings → Wallet API integration
- Packages → Subscription API

Ensure:
- No dead clicks
- Proper loading states
- Navigation works correctly

---

4. REAL-TIME FEATURES (IMPORTANT)
- Integrate socket.io properly:
  - Messaging (live updates)
  - Notifications
- Ensure mobile listens to backend socket events
- Sync with web app real-time behavior

---

5. CHATBOT (AI ASSISTANT)
- Implement floating chatbot (bottom-right FAB)
- Connect to: /api/chatbot (Google Gemini integration)
- Features:
  - Open/close animation
  - Chat UI
  - API-based responses
- Must behave EXACTLY like web app chatbot

---

6. VIDEO CONSULTATION FIX
- Fix or rebuild VideoCallScreen:
  - Use roomName from backend
  - Integrate ZegoCloud or WebRTC layer
- Ensure:
  - Join session
  - Leave session
  - Stable connection

---

7. NAVIGATION SYSTEM VALIDATION
- Fix Drawer + Tab + Stack integration
- Ensure:
  - No broken routes
  - No undefined screens
  - Proper deep navigation support

---

8. THEME & DESIGN SYSTEM SYNC
- Match EXACT values from:
  theme/designSystem.js

Fix:
- brandGreen: #008f11
- brandBlue: #006aff
- brandOrange: #ff7b00
- Backgrounds and cards
- Shadows and radius

Ensure:
- 100% visual parity with web Tailwind design

---

9. BUTTON & EVENT HANDLING FIX
- Fix ALL non-responsive buttons:
  - Logout
  - Dashboard actions
  - Forms
- Ensure:
  - Proper onPress binding
  - Navigation triggers
  - API calls executed

Logout Flow:
- Clear AsyncStorage
- Reset navigation stack
- Redirect to Login

---

10. STATE MANAGEMENT CORRECTION
- Ensure global state consistency:
  - Auth state
  - User profile
  - Role-based rendering
- Use Context / Zustand / Redux properly

---

11. ERROR HANDLING & UX
- Add:
  - Loaders (ActivityIndicator / skeleton)
  - Error messages (Toast/snackbar)
  - Empty states

---

12. CODEBASE REFACTORING
- Clean and standardize structure:
  /components
  /screens
  /navigation
  /services/api
  /hooks
  /store

- Remove:
  - Dummy screens
  - Unused code
  - Broken logic

---

Execution Strategy (IMPORTANT):

Step 1: Fix Authentication + Token Flow  
Step 2: Fix API integration (profile, dashboard)  
Step 3: Fix navigation & button handlers  
Step 4: Enable all modules (messages, video, reports, etc.)  
Step 5: Integrate real-time (socket.io)  
Step 6: Fix UI/theme mismatches  
Step 7: Add chatbot  
Step 8: Final testing (end-to-end user flow)

---

Final Output Requirements:

- Fully functional React Native app
- 100% feature parity with web app
- Real-time features working
- All buttons responsive
- Clean architecture
- Production-ready code

Project Title: CureVirtual Mobile App – Core Systems Implementation (Auth, API, Realtime, Chatbot, Video)

Objective:
Generate and fix core infrastructure of the CureVirtual React Native (Expo) mobile application to make it fully functional and production-ready, strictly aligned with the existing Node.js/Express + Supabase backend.

---

SYSTEM CONTEXT (MANDATORY UNDERSTANDING):

- Backend: Express.js + Prisma + Supabase (JWT Auth)
- Mobile: React Native (Expo)
- Auth: JWT stored in AsyncStorage
- API: Axios
- Realtime: socket.io
- AI Chatbot: /api/chatbot (Google Gemini)
- Video Calls: ZegoCloud / WebRTC (room-based)

---

TASK 1: AXIOS INTERCEPTOR + AUTH FLOW

Generate a complete API layer:

1. Axios instance:
   - Base URL config
   - Request interceptor → attach JWT from AsyncStorage
   - Response interceptor → handle 401 (auto logout)

2. Auth Flow:
   - Login API integration
   - Store token in AsyncStorage
   - Fetch current user (/auth/me)
   - Logout:
     - Clear storage
     - Reset navigation

3. Ensure:
   - Token persists after app reload
   - User state globally available

---

TASK 2: SOCKET.IO (REAL-TIME SETUP)

Fix and implement mobile socket connection:

1. Create socket service:
   - Connect to backend socket server
   - Pass JWT token in auth headers

2. Handle events:
   - "connect"
   - "disconnect"
   - "message"
   - "notification"

3. Integrate with:
   - Messages screen (real-time updates)
   - Notifications

4. Ensure:
   - Auto reconnect
   - Clean disconnect on logout

---

TASK 3: CHATBOT FAB (FLOATING BUTTON)

Build a production-level chatbot UI:

1. Floating Button:
   - Bottom-right corner
   - Circular FAB
   - Matches web UI style

2. On click:
   - Open chat modal / panel

3. Chat UI:
   - User messages (right)
   - Bot messages (left)
   - Scrollable conversation

4. API Integration:
   - POST to /api/chatbot
   - Show loading indicator
   - Render response

5. Features:
   - Open/close animation
   - Maintain chat history (state)

---

TASK 4: VIDEO CALL DEBUG (ZEGO / WEBRTC)

Fix or generate VideoCall system:

1. Fetch available sessions:
   - GET /videocall/list

2. Join Call:
   - Receive roomName from backend
   - Initialize ZegoCloud / WebRTC

3. Required Features:
   - Join room
   - Leave room
   - Mute/unmute
   - Camera toggle

4. Ensure:
   - Stable connection
   - Proper cleanup on exit

---

TASK 5: ERROR HANDLING + UX

Add:
- Global error handling (API failures)
- Loaders (ActivityIndicator)
- Toast messages for errors/success
- Retry mechanism for failed requests

---

TASK 6: CLEAN ARCHITECTURE

Organize code into:

/services/api/
/services/socket/
/context/
/components/chatbot/
/screens/videocall/
/hooks/

Use reusable hooks:
- useAuth()
- useSocket()
- useChatbot()

---

EXECUTION ORDER (IMPORTANT):

1. Build Axios + Auth flow
2. Fix user loading (/auth/me)
3. Implement socket connection
4. Build chatbot UI + API
5. Fix video call system
6. Add loaders + error handling
7. Final testing

---

FINAL OUTPUT EXPECTATION:

- Working Axios interceptor
- Fully functional Auth system
- Real-time messaging via socket.io
- Chatbot FAB (UI + API working)
- Video calling working (room-based)
- Clean, reusable, production-ready code

---

IMPORTANT RULES:

- NO dummy data
- ONLY real backend integration
- Match web app behavior exactly
- Every feature must be functional