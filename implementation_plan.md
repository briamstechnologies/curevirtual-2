# OTP-Based Authentication Implementation Plan

This plan outlines the steps to fully integrate OTP-based verification for signup and login across your Web React App and Mobile React Native App. This avoids Magic Links on login and Link-based verification on signup in favor of 6-digit OTP codes.

## User Review Required

> [!IMPORTANT]
> The Supabase Dashboard Email Templates must be manually updated by you.
> 1. Go to **Authentication > Email Templates**.
> 2. For both **Confirm signup** and **Magic Link** templates, change `{{ .ConfirmationURL }}` to `{{ .Token }}`.
> This change is what tells Supabase to send a 6-digit OTP instead of a clickable link. I will proceed with updating the frontend code assuming this configuration is complete setting. Do you want both Web and Mobile updated as described below?

## Proposed Changes

### Web Application (`src/pages`)

#### [MODIFY] [Register.jsx](file:///Users/rehan/Projects/CureVirtual-2-3e5f771dde82b2caa5812e5154eac43a1c78d747/src/pages/Register.jsx)
- **Problem**: Currently, after a successful `supabase.auth.signUp()`, the user is immediately routed to the `/login` page with a message to check their email for a verification link. Additionally, it immediately hits the backend `/auth/register-success` which syncs an unverified user to the database.
- **Solution**:
  - Add state toggles (`showOtp`, `otp`).
  - Upon successful signup, block the redirect and instead render an 'Enter OTP' field dynamically.
  - A new `verifyOtp` function will call `supabase.auth.verifyOtp({ email, token: otp, type: 'signup' })`.
  - Once verified, it will trigger the `/auth/register-success` endpoint, ensuring only verified users get written into the Prisma database.

#### [MODIFY] [Login.jsx](file:///Users/rehan/Projects/CureVirtual-2-3e5f771dde82b2caa5812e5154eac43a1c78d747/src/pages/Login.jsx)
- The login component already supports `signInWithOtp` when the user selects the "OTP" login mode. The template changes you make in Supabase (from URL to `{{ .Token }}`) will allow this to automatically work as a pure 6-digit OTP flow. No major refactoring is required here, but I will ensure it properly specifies the `type: 'magiclink'` explicitly for correctness if necessary.

---

### Mobile Application (`mobile/src`)

#### [MODIFY] [authService.js](file:///Users/rehan/Projects/CureVirtual-2-3e5f771dde82b2caa5812e5154eac43a1c78d747/mobile/src/services/authService.js)
- **Problem**: The mobile registration currently uses the backend `/auth/register` API. The backend bypasses Supabase email verification using the Admin client (`email_confirm: true`).
- **Solution**:
  - Refactor `registerUser` heavily in `authService.js`.
  - Instead of hitting `/auth/register`, it will invoke `supabase.auth.signUp()` natively inside the mobile app.
  - The `registerUser` function will return `requiresVerification: true`.
  - Introduce a new function `verifySignupOTP` that handles the `verifyOtp` and subsequent backend `/auth/register-success` syncing API.

#### [MODIFY] [RegisterScreen.js](file:///Users/rehan/Projects/CureVirtual-2-3e5f771dde82b2caa5812e5154eac43a1c78d747/mobile/src/screens/Auth/RegisterScreen.js)
- **Problem**: It only shows the standard registration form and navigates to the Login page automatically.
- **Solution**:
  - Introduce an OTP entry state inside `RegisterScreen.js` (or navigate to a new VerifyOTP screen). For simplicity, I'll update the screen state internally to conditionally render an OTP verification pin pad directly below or replacing the form.
  - After OTP is submitted, the user verifies successfully and redirects to Dashboard/Login.

#### [MODIFY] [AuthContext.tsx / AuthContext.js](file:///Users/rehan/Projects/CureVirtual-2-3e5f771dde82b2caa5812e5154eac43a1c78d747/mobile/src/context/AuthContext.tsx) (If applicable)
- Add the `verifyOTP` methods cleanly so UI components can consume it.

## Open Questions
- Is modifying both the Web App and Mobile App logic correctly matching your intent? 

## Verification Plan

### Automated Tests
- Validate that compile checks pass for both frontend implementations.

### Manual Verification
- A user signs up on Web -> Verify they are stuck at the OTP screen until code is entered.
- A user signs up on Mobile -> Verify the admin bypass is removed and they must enter OTP.
