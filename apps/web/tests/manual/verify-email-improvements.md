# Verify Email Improvements - Manual Testing Guide

## Test Scenarios

### 1. Rapid Submission Prevention

**Steps:**

1. Go to signup page and create a new account
2. On the verification page, enter a 6-digit code
3. Click "Verify Email" button rapidly multiple times

**Expected:**

- Only the first click should trigger verification
- Subsequent clicks within 1 second should be ignored
- Console should show: "⚠️ Verification already in progress or too soon after last attempt"

### 2. Improved User Feedback

**Steps:**

1. Enter a verification code and submit

**Expected:**

- Button should show loading spinner immediately
- Progress indicator should appear below button
- Button text changes to show current step:
  - "Verifying code..." → "Creating account..." → Success screen
- Progress bar shows verification progress

### 3. Auto-Retry Mechanism

**Steps:**

1. Enter an invalid code (e.g., 000000)

**Expected:**

- Error message appears with specific feedback
- If error includes "Invalid", system attempts retry automatically
- "Retrying verification..." message appears
- "Attempt 2 of 3" counter shows below button

### 4. Session Recovery

**Steps:**

1. Complete verification successfully
2. Check browser DevTools > Application > Local Storage

**Expected:**

- Session should be persisted in local storage
- Console shows: "💾 Persisting session..."
- After redirect, session remains valid

### 5. Email Link Verification

**Steps:**

1. Click verification link from email

**Expected:**

- Page shows verification progress immediately
- No manual code entry required
- Progress through same states: verifying → creating → redirecting

### 6. Session Persistence After Network Issues

**Steps:**

1. Start verification
2. Simulate network issue (DevTools > Network > Offline)
3. Re-enable network

**Expected:**

- Error message about network issue
- Session recovery attempted when network returns
- User doesn't lose progress

## Console Logs to Monitor

During testing, watch for these console messages:

- 🔐 Starting email verification...
- 🔗 Processing email link verification...
- 📧 Processing manual OTP verification...
- 🔄 Retry X/Y for verification...
- ✅ Verification successful!
- 💾 Persisting session...
- 🔄 Attempting session recovery...
- ⚠️ Various warning messages for edge cases

## Performance Checks

1. **Debouncing**: Verify that rapid clicks don't create multiple API calls
2. **Loading States**: Ensure all transitions are smooth with no flashing
3. **Progress Indicators**: Check that progress bars animate smoothly
4. **Error Recovery**: Confirm that errors don't break the UI state

## Edge Cases to Test

1. **Expired Codes**: Should show specific "expired" message
2. **Network Timeout**: Should show network error message
3. **Already Verified Email**: Should handle gracefully
4. **Missing Session Data**: Should attempt recovery
5. **Browser Back Button**: Should maintain state correctly
