# Supabase OTP-Based Authentication & Verification Guide

This guide provides a comprehensive step-by-step solution to transition from link-based email confirmation/magic links to OTP-based verification using Supabase Authentication, along with fixes for inconsistent SMTP email delivery.

## 1. Supabase Dashboard Configuration

By default, Supabase sends Magic Links for both signup confirmations and passwordless sign-ins. To switch to OTPs, you need to configure your Email Templates to include the 6-digit OTP token (`{{ .Token }}`).

### Step-by-Step Dashboard Changes:

1. Go to your **Supabase Dashboard** > **Authentication** > **Email Templates**.
2. **For Signup Verification (Confirm signup template):**
   * Change the subject to something like: `Confirm your Registration`
   * Update the email body. You **must** remove the `{{ .ConfirmationURL }}` and replace it with `{{ .Token }}`.
   * *Example Body:*
     ```html
     <h2>Confirm your signup</h2>
     <p>Your 6-digit confirmation code is: <strong>{{ .Token }}</strong></p>
     <p>Enter this code in the app to complete your registration.</p>
     ```
3. **For Passwordless Login (Magic Link template):**
   * Supabase uses the "Magic Link" template when you call `signInWithOtp()`.
   * Change the subject: `Your Login Code`
   * Update the email body. Replace `{{ .ConfirmationURL }}` with `{{ .Token }}`.
   * *Example Body:*
     ```html
     <h2>Log in to your account</h2>
     <p>Your login code is: <strong>{{ .Token }}</strong></p>
     <p>This code will expire soon.</p>
     ```
4. **Ensure Email Confirmations are Enabled:**
   * Go to **Authentication** > **Providers** > **Email**.
   * Make sure **Confirm email** is toggled **ON**. Without this, users will bypass the OTP verification step during signup.

---

## 2. Required API Methods & Frontend Flow

### A. Signup with OTP Verification

When a user signs up, you call `signUp`. If email confirmations are on, Supabase sends them the OTP (via the "Confirm signup" template).

**1. Initiate Signup:**
```javascript
import { supabase } from './supabase'; // Replace with your path

async function handleSignup(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Signup Error:', error.message);
    return;
  }
  
  // SUCCESS: Redirect the user to your OTP verification screen
  // e.g., router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=signup`)
}
```

**2. Verify the Signup OTP:**
Once the user is on the verification screen, they enter the 6-digit code.
```javascript
async function verifySignupOTP(email, otpToken) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otpToken,
    type: 'signup', // Use 'signup' for confirming new accounts
  });

  if (error) {
    console.error('Verification Error:', error.message);
    return;
  }
  
  // SUCCESS: User is now confirmed and logged in! 
  // Redirect to Dashboard
}
```

### B. Passwordless Login with OTP

To completely disable magic links and just rely on OTPs, simply construct your frontend to only prompt for an OTP token after they enter their email.

**1. Request Login OTP:**
```javascript
async function requestLoginOTP(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // Prevents creating a new user if they don't exist
    }
  });

  if (error) {
    console.error('Login Error:', error.message);
    return;
  }
  
  // SUCCESS: Redirect to your OTP entry screen
  // e.g., router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=login`)
}
```

**2. Verify Login OTP:**
```javascript
async function verifyLoginOTP(email, otpToken) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otpToken,
    type: 'magiclink', // Use 'magiclink' for OTPs generated via signInWithOtp
  });

  if (error) {
    console.error('Invalid OTP:', error.message);
    return;
  }
  
  // SUCCESS: User is successfully authenticated
}
```

---

## 3. Resolving Inconsistent Email Delivery (Custom SMTP)

If users sometimes receive emails and sometimes do not, the issue is almost certainly with your **SMTP Provider's spam filtering, sender reputation, or rate limits**, not Supabase itself.

### Common Mistakes Causing Missing Emails:

1. **Missing DNS Records (SPF/DKIM/DMARC):**
   If you configure a custom SMTP without authenticating your domain, providers like Gmail/Yahoo will *silently drop* the emails as spam. They won't even bounce back to the user's spam folder.
2. **Provider Rate Limits:**
   Free SMTP tiers (like testing with standard Gmail SMTP or free SendGrid) have strict rate limits (e.g., 1 email per second). If multiple users sign up simultaneously, the SMTP block silently fails.
3. **From Name/Address Mismatches:**
   If your SMTP host expects the email to come from `admin@yourdomain.com`, but in Supabase you configured the "Sender email" as `noreply@yourdomain.com`, the SMTP relay will block it.
4. **Port & Encryption Issues:**
   Using wrong ports. Port 465 (Implicit SSL) and Port 587 (Explicit TLS/STARTTLS) are different. Some providers silently fail connections if TLS isn't correctly negotiated.

### SMTP Configuration Validation Checklist:

- [ ] **Verify Authentication Records:** Run your domain through a tool like [Mail-Tester](https://www.mail-tester.com/) or [MXToolbox](https://mxtoolbox.com/) to ensure your **SPF**, **DKIM**, and **DMARC** records are fully propagated and valid.
- [ ] **Check the Supabase Custom SMTP Settings:**
  - **Host:** e.g., `smtp.sendgrid.net` or `smtp-relay.brevo.com` (Avoid consumer Gmail SMTP `smtp.gmail.com` for production).
  - **Port:** Usually `587` (with `Secure: False` / `Require TLS: True`). If using `465`, it requires implicit SSL.
  - **Sender Email:** Must *exactly* match the authenticated domain in your SMTP provider.
- [ ] **Enable Supabase Native SMTP Logs:** If on a paid Supabase plan, you can check Log Explorer. Run this query in your Supabase SQL Editor/Log Explorer to find dropped emails:
  ```sql
  select * from auth.audit_log_entries where payload->>'traits' like '%email%';
  ```
- [ ] **Check SMTP Provider Logs:** Log into SendGrid/AWS SES/Resend, and check their internal logs. Look for "Dropped", "Bounced", or "Spam Report" events. This tells you exactly *why* Gmail/Yahoo rejected the email.
- [ ] **Warm Up Your IP:** If using a dedicated IP from your SMTP provider, ensure it's "warmed up". Sudden spikes in email traffic will cause automatic drops by receivers.

## Workflow Summary

1. Modify **Confirm signup** and **Magic Link** templates to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
2. Update Frontend to intercept auth workflows:
   - `signUp()` -> Redirect to `verifyOtp({ type: 'signup' })`
   - `signInWithOtp()` -> Redirect to `verifyOtp({ type: 'magiclink' })`
3. Solidify SMTP deliverability by adding SPF/DKIM/DMARC records to your domain provider, completely preventing "silent drop" issues.
