# User Invitation & Password Setup Flow

## Overview

This document explains how the user invitation system works, including how invited users can set their own passwords.

## Complete Invitation Flow

### 1. **Admin/Manager Invites User**

- Admin or Manager goes to Company → Users
- Clicks "Invite User" button
- Fills out the invitation form:
  - Email (required)
  - Role (Admin, Manager, User)
  - First Name (optional)
  - Last Name (optional)
  - Hourly Rate (optional)

### 2. **API Processing** (`/api/invite-user`)

- Validates the requesting user is authenticated
- Checks user has permission to invite (admin or manager role)
- Validates the invitation data
- Creates Supabase Auth user using `inviteUserByEmail()`
- Creates database record with `status: 'inactive'`
- Sends invitation email automatically

### 3. **User Receives Email**

- Supabase sends an invitation email to the user
- Email contains a secure link with a token
- Link redirects to: `http://localhost:3000/auth/accept-invitation`

### 4. **User Clicks Invitation Link**

- User clicks the link in their email
- Supabase handles the token validation
- User is redirected to the password setup page

### 5. **Password Setup Page** (`/auth/accept-invitation`)

- User sees a form to complete their account setup:
  - First Name (pre-filled if provided)
  - Last Name (pre-filled if provided)
  - Password (required, min 6 characters)
  - Confirm Password (must match)
- Form validates password requirements
- User submits the form

### 6. **Account Activation**

- System updates user's password using `supabase.auth.updateUser()`
- Updates user status from 'inactive' to 'active' in database
- Updates user's first/last name if provided
- Redirects to dashboard with welcome message

### 7. **User Can Now Login**

- User account is fully activated
- User can login normally with email/password
- User has access based on their assigned role

## Security Features

### API Route Protection

- Only authenticated users can send invitations
- Only admin/manager roles can invite users
- Users can only invite to their own company
- Request validation prevents unauthorized invitations

### Password Requirements

- Minimum 6 characters (can be increased)
- Password confirmation required
- Secure password update using Supabase Auth

### Session Management

- Invitation links contain secure tokens
- Tokens expire automatically (Supabase default: 24 hours)
- Session validation throughout the process

## Technical Implementation

### Key Files

- **API Route**: `/app/api/invite-user/route.ts`
- **Password Setup**: `/app/auth/accept-invitation/page.tsx`
- **Auth Callback**: `/app/auth/callback/page.tsx`
- **Service Functions**: `/lib/db/service.ts`
- **Invitation Modal**: `/components/modals/invite-user-modal.tsx`

### Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Changes

- Added `invited_by` field to users table (self-referencing FK)
- Added `invited_at` timestamp
- Added `status` field for user activation state

## User Experience

### For Admins/Managers

1. Simple invitation form in the UI
2. Real-time feedback on invitation success/failure
3. Can see invitation status in user list

### For Invited Users

1. Receives professional invitation email
2. Simple, secure password setup process
3. Clear instructions and validation
4. Immediate access after setup

## Error Handling

### Common Scenarios

- **Invalid email**: Validation prevents invitation
- **User already exists**: Supabase handles gracefully
- **Expired link**: User receives clear error message
- **Permission denied**: API returns 403 with clear message
- **Network issues**: Proper error display to user

### Recovery Options

- Admin can resend invitation if needed
- Expired links require new invitation
- Database consistency maintained with cleanup on failures

## Testing the Flow

### Manual Testing Steps

1. Login as admin/manager
2. Go to Company → Users
3. Click "Invite User"
4. Fill out form and submit
5. Check email (or logs) for invitation
6. Click invitation link
7. Complete password setup
8. Verify login works

### API Testing

```bash
# Test invitation API (requires authentication)
curl -X POST http://localhost:3000/api/invite-user \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookies" \
  -d '{
    "email": "test@example.com",
    "role": "user",
    "companyId": "company-id",
    "invitedBy": "admin-user-id",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## Customization Options

### Email Templates

- Supabase allows custom email templates
- Can brand emails with company logos/colors
- Customize invitation message text

### Password Requirements

- Adjust minimum length in validation
- Add complexity requirements (uppercase, numbers, symbols)
- Implement password strength meter

### Role Permissions

- Modify who can invite users (currently admin + manager)
- Add granular invitation permissions
- Implement invitation approval workflows

### UI Customization

- Style the password setup page to match brand
- Add company welcome messages
- Customize success/error states

## Monitoring & Analytics

### Key Metrics to Track

- Invitation send success rate
- Invitation acceptance rate
- Time from invitation to activation
- Failed login attempts after activation

### Logging

- All invitation attempts logged
- Password setup completion tracked
- Error cases captured for debugging

---

_This flow ensures secure, user-friendly invitation management while maintaining proper authentication and authorization throughout the process._
