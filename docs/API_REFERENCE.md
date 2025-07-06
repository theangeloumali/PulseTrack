# PulseTrack API Reference

## Overview

PulseTrack provides a comprehensive RESTful API built on Next.js 15 API routes. All endpoints require authentication and follow role-based access control patterns.

## Authentication

All API endpoints require a valid Supabase session. Authentication is handled through cookies and authorization headers.

```typescript
// Example authenticated request
const response = await fetch('/api/endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Supabase session is automatically included via cookies
  }
});
```

## Base URL Structure

```
Production: https://pulsetrack-zkidz-web.vercel.app/pulse/api
Development: http://localhost:3000/api
```

## Common Response Patterns

### Success Response
```json
{
  "data": { /* response data */ },
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "success": false
}
```

## API Endpoints

### 🔐 Authentication & Users

#### Get Current User
```http
GET /api/auth/user
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_id": "company-id",
  "role": "company_admin",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Company Users
```http
GET /api/users?companyId=company-id
```

**Query Parameters:**
- `companyId` (required): Company identifier

**Response:**
```json
[
  {
    "id": "user-id",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "user",
    "hourly_rate": "75.00"
  }
]
```

### 🏢 Projects

#### Get Projects
```http
GET /api/projects?companyId=company-id
```

**Response:**
```json
[
  {
    "id": "project-id",
    "name": "Project Name",
    "description": "Project description",
    "company_id": "company-id",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Project
```http
POST /api/projects
```

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "company_id": "company-id"
}
```

### 🎫 Tickets

#### Get Tickets
```http
GET /api/tickets?companyId=company-id&projectId=project-id
```

**Query Parameters:**
- `companyId` (required): Company identifier
- `projectId` (optional): Filter by project
- `status` (optional): Filter by status
- `assignee` (optional): Filter by assigned user

**Response:**
```json
[
  {
    "id": "ticket-id",
    "title": "Ticket Title",
    "description": "Ticket description",
    "status": "in_progress",
    "priority": "high",
    "assigned_to": "user-id",
    "project_id": "project-id",
    "due_date": "2024-01-15T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Ticket
```http
POST /api/tickets
```

**Request Body:**
```json
{
  "title": "New Ticket",
  "description": "Ticket description",
  "project_id": "project-id",
  "assigned_to": "user-id",
  "priority": "medium",
  "due_date": "2024-01-15T00:00:00Z"
}
```

#### Update Ticket
```http
PATCH /api/tickets/[ticketId]
```

**Request Body:**
```json
{
  "status": "done",
  "priority": "low",
  "assigned_to": "new-user-id"
}
```

### ⏱️ Time Tracking

#### Get Time Entries
```http
GET /api/time-entries?companyId=company-id&userId=user-id
```

**Query Parameters:**
- `companyId` (required): Company identifier
- `userId` (optional): Filter by user
- `ticketId` (optional): Filter by ticket
- `startDate` (optional): Filter from date (YYYY-MM-DD)
- `endDate` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "entry-id",
    "user_id": "user-id",
    "ticket_id": "ticket-id",
    "start_time": "2024-01-01T09:00:00Z",
    "end_time": "2024-01-01T17:00:00Z",
    "duration": 8.0,
    "description": "Working on feature",
    "created_at": "2024-01-01T09:00:00Z"
  }
]
```

#### Create Time Entry
```http
POST /api/time-entries
```

**Request Body:**
```json
{
  "ticket_id": "ticket-id",
  "start_time": "2024-01-01T09:00:00Z",
  "end_time": "2024-01-01T17:00:00Z",
  "description": "Working on feature"
}
```

#### Start Timer
```http
POST /api/time-entries/timer/start
```

**Request Body:**
```json
{
  "ticket_id": "ticket-id",
  "description": "Working on feature"
}
```

#### Stop Timer
```http
POST /api/time-entries/timer/stop
```

**Request Body:**
```json
{
  "time_entry_id": "entry-id"
}
```

### 💰 Billing

#### Generate Billing Report
```http
GET /api/billing/report?companyId=company-id&startDate=2024-01-01&endDate=2024-01-31&targetUserId=user-id
```

**Query Parameters:**
- `companyId` (required): Company identifier
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `targetUserId` (optional): Generate for specific user

**Response:**
```json
{
  "2024-01-01": {
    "user-id": {
      "userFirstName": "John",
      "userLastName": "Doe",
      "totalHours": 8.0,
      "totalAmount": 600.0,
      "projects": {
        "project-id": {
          "projectName": "Project Name",
          "totalHours": 8.0,
          "totalAmount": 600.0,
          "tickets": [
            {
              "ticketId": "ticket-id",
              "ticketTitle": "Ticket Title",
              "hours": 8.0,
              "amount": 600.0,
              "description": "Work description"
            }
          ]
        }
      }
    }
  }
}
```

#### Get Billing Periods
```http
GET /api/billing/periods?companyId=company-id
```

**Response:**
```json
[
  {
    "id": "period-id",
    "name": "January 2024",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-31T23:59:59Z",
    "frequency": "monthly",
    "status": "active",
    "payment_status": "pending",
    "payment_amount": null,
    "company_id": "company-id"
  }
]
```

#### Create Billing Period
```http
POST /api/billing/periods
```

**Request Body:**
```json
{
  "action": "generate",
  "frequency": "monthly",
  "start_date": "2024-01-01"
}
```

**For User-Specific Billing:**
```json
{
  "action": "generate_for_user",
  "target_user_id": "user-id",
  "frequency": "weekly",
  "start_date": "2024-01-01"
}
```

#### Delete Billing Period
```http
DELETE /api/billing/periods?id=period-id
```

### 💳 Payments

#### Get Outstanding Payments
```http
GET /api/billing/payment-status?action=outstanding
```

**Response:**
```json
[
  {
    "id": "period-id",
    "name": "January 2024",
    "payment_status": "pending",
    "payment_amount": 5000.0,
    "payment_due_date": "2024-02-15T00:00:00Z",
    "invoice_sent_date": null
  }
]
```

#### Get Overdue Payments
```http
GET /api/billing/payment-status?action=overdue
```

#### Get Payment Statistics
```http
GET /api/billing/payment-status?action=stats&year=2024
```

**Response:**
```json
{
  "stats": {
    "total": 12,
    "pending": 2,
    "sent": 3,
    "paid": 6,
    "overdue": 1,
    "totalPaid": 45000.0
  }
}
```

#### Update Payment Status
```http
PATCH /api/billing/payment-status
```

**Request Body:**
```json
{
  "billing_period_id": "period-id",
  "payment_status": "paid",
  "action": "update_status",
  "payment_amount": 5000.0,
  "payment_reference": "TXN-123456"
}
```

#### Mark Invoice as Sent
```http
PATCH /api/billing/payment-status
```

**Request Body:**
```json
{
  "billing_period_id": "period-id",
  "action": "mark_sent",
  "due_date": "2024-02-15"
}
```

#### Mark Payment as Received
```http
PATCH /api/billing/payment-status
```

**Request Body:**
```json
{
  "billing_period_id": "period-id",
  "action": "mark_paid",
  "amount": 5000.0,
  "reference": "TXN-123456"
}
```

### 🗑️ Payment Deletion (Admin Only)

#### Delete Multiple Outstanding Payments
```http
DELETE /api/billing/payments?action=delete_multiple_outstanding&billing_period_ids=id1,id2,id3
```

#### Delete Payments by Status
```http
DELETE /api/billing/payments?action=delete_by_status&statuses=pending,overdue
```

#### Reset Payment Status
```http
DELETE /api/billing/payments?action=reset_payment_status&billing_period_id=period-id
```

### 📊 Billing Rates

#### Get Billing Rates
```http
GET /api/billing/rates?companyId=company-id
```

**Response:**
```json
[
  {
    "id": "rate-id",
    "company_id": "company-id",
    "project_id": "project-id",
    "user_id": null,
    "hourly_rate": "100.00",
    "effective_from": "2024-01-01T00:00:00Z",
    "effective_to": null
  }
]
```

#### Create Billing Rate
```http
POST /api/billing/rates
```

**Request Body:**
```json
{
  "company_id": "company-id",
  "project_id": "project-id",
  "hourly_rate": "100.00",
  "effective_from": "2024-01-01"
}
```

### ⚙️ Company Settings

#### Get Company Billing Settings
```http
GET /api/billing/settings?companyId=company-id
```

**Response:**
```json
{
  "company_id": "company-id",
  "default_hourly_rate": "75.00",
  "billing_frequency": "monthly",
  "currency": "USD",
  "invoice_prefix": "INV"
}
```

#### Update Company Billing Settings
```http
PATCH /api/billing/settings
```

**Request Body:**
```json
{
  "company_id": "company-id",
  "default_hourly_rate": "80.00",
  "billing_frequency": "bi_monthly",
  "currency": "USD"
}
```

## Error Codes

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Custom Error Messages

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

```json
{
  "error": "Company not found or access denied",
  "code": "COMPANY_ACCESS_DENIED"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints**: 100 requests per minute per user
- **Authentication endpoints**: 20 requests per minute per IP
- **Billing operations**: 50 requests per minute per company

## Pagination

Large datasets are paginated using cursor-based pagination:

```http
GET /api/time-entries?companyId=company-id&limit=50&cursor=cursor-value
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "next-cursor-value"
  }
}
```

## Webhooks (Future Feature)

Planned webhook support for real-time integrations:

```http
POST /api/webhooks/register
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["payment.completed", "ticket.created"],
  "secret": "webhook-secret"
}
```

## SDK Integration

While no official SDK exists yet, the API is designed for easy integration with popular HTTP clients:

### JavaScript/TypeScript
```typescript
const pulseTrack = {
  baseURL: 'https://pulsetrack-zkidz-web.vercel.app/pulse/api',
  
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  async getBillingReport(companyId: string, startDate: string, endDate: string) {
    return this.request(`/billing/report?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`);
  }
};
```

This API reference provides comprehensive coverage of all PulseTrack endpoints with authentication, parameters, responses, and error handling patterns.