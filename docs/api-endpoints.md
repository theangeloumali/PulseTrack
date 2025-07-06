# API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints in the Project Management System.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints (except public endpoints) require authentication via Bearer tokens:

```bash
Authorization: Bearer <jwt_token>
```

## Endpoint Categories

### Admin Endpoints

#### GET /api/admin/companies

**Description**: Retrieve all companies (Super Admin only)

**Authorization**: `super_admin`

**Response**:

```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Company Name",
      "slug": "company-slug",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/admin/users

**Description**: Retrieve all users across all companies (Super Admin only)

**Authorization**: `super_admin`

**Query Parameters**:

- `role`: Filter by user role
- `status`: Filter by user status
- `company_id`: Filter by company

**Response**:

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "company_id": "uuid",
      "status": "active"
    }
  ]
}
```

#### PUT /api/admin/users/[userId]

**Description**: Update user information (Super Admin only)

**Authorization**: `super_admin`

**Request Body**:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "role": "manager",
  "status": "active",
  "hourly_rate": 75.0
}
```

### Billing Endpoints

#### GET /api/billing/report

**Description**: Generate billing report for a company

**Authorization**: `super_admin`, `system_admin`, `company_admin`, `manager`

**Query Parameters**:

- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `user_id`: Filter by specific user (optional)

**Response**:

```json
{
  "report": {
    "total_hours": 120.5,
    "total_billable_hours": 115.0,
    "total_amount": 8625.0,
    "currency": "USD",
    "entries": [
      {
        "user_id": "uuid",
        "user_name": "John Doe",
        "project_name": "Project Alpha",
        "hours": 8.0,
        "hourly_rate": 75.0,
        "amount": 600.0,
        "date": "2024-01-01"
      }
    ]
  }
}
```

### User Management Endpoints

#### POST /api/invite-user

**Description**: Invite a new user to the company

**Authorization**: `super_admin`, `system_admin`, `company_admin`, `manager`

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "user",
  "hourly_rate": 50.0
}
```

**Response**:

```json
{
  "message": "User invited successfully",
  "user_id": "uuid",
  "invitation_token": "secure_token"
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource already exists
- `422`: Unprocessable Entity - Validation errors
- `500`: Internal Server Error

### Common Error Codes

```json
// Authentication Errors
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}

{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired authentication token"
  }
}

// Authorization Errors
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have required permissions"
  }
}

// Validation Errors
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": {
      "email": "Invalid email format",
      "role": "Invalid role specified"
    }
  }
}
```

## Authentication Implementation

### Token Extraction

```typescript
// Extract Bearer token from request headers
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}
```

### User Authentication

```typescript
// Authenticate user from request
async function authenticateUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  const supabase = createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return await getUserByEmail(user.email!);
}
```

### Role Authorization

```typescript
// Check if user has required role
function authorizeRole(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(user.role);
}

// Example API route with role check
export async function GET(request: Request) {
  const user = await authenticateUser(request);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!authorizeRole(user, ["super_admin", "system_admin"])) {
    return new Response("Forbidden", { status: 403 });
  }

  // Handle authorized request
}
```

## Request/Response Examples

### Successful User Creation

**Request**:

```bash
POST /api/invite-user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "user",
  "hourly_rate": 50.00
}
```

**Response**:

```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "User invited successfully",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "invitation_token": "abc123def456ghi789"
}
```

### Unauthorized Access

**Request**:

```bash
GET /api/admin/users
Authorization: Bearer invalid_token
```

**Response**:

```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired authentication token"
  }
}
```

### Insufficient Permissions

**Request**:

```bash
GET /api/admin/users
Authorization: Bearer valid_user_token
```

**Response**:

```json
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have required permissions"
  }
}
```

## Rate Limiting

### Implementation

```typescript
// Simple rate limiting example
const rateLimitMap = new Map();

function checkRateLimit(
  clientId: string,
  limit: number,
  window: number,
): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId) || {
    count: 0,
    resetTime: now + window,
  };

  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + window;
  }

  if (clientData.count >= limit) {
    return false; // Rate limit exceeded
  }

  clientData.count++;
  rateLimitMap.set(clientId, clientData);
  return true;
}
```

### Rate Limit Headers

```typescript
// Add rate limit headers to response
function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetTime: number,
) {
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", resetTime.toString());
  return response;
}
```

## Data Validation

### Input Validation

```typescript
// Zod validation schemas
import { z } from "zod";

const InviteUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  role: z.enum([
    "super_admin",
    "system_admin",
    "company_admin",
    "manager",
    "user",
  ]),
  hourly_rate: z.number().positive("Hourly rate must be positive").optional(),
});

// Usage in API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = InviteUserSchema.parse(body);

    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Input validation failed",
            details: error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }
  }
}
```

## Logging and Monitoring

### Request Logging

```typescript
// Log API requests for monitoring
function logRequest(
  request: Request,
  user: AuthUser | null,
  startTime: number,
) {
  const duration = Date.now() - startTime;

  console.log({
    method: request.method,
    url: request.url,
    user_id: user?.id,
    user_role: user?.role,
    duration_ms: duration,
    timestamp: new Date().toISOString(),
  });
}
```

### Error Logging

```typescript
// Log errors with context
function logError(error: Error, request: Request, user: AuthUser | null) {
  console.error({
    error: {
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
    },
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      : null,
    timestamp: new Date().toISOString(),
  });
}
```

## Testing API Endpoints

### Unit Tests

```typescript
// Example API route test
import { GET } from "../route";

describe("/api/admin/users", () => {
  it("should return users for super admin", async () => {
    const mockRequest = new Request("http://localhost/api/admin/users", {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toBeInstanceOf(Array);
  });

  it("should return 403 for regular users", async () => {
    const mockRequest = new Request("http://localhost/api/admin/users", {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const response = await GET(mockRequest);

    expect(response.status).toBe(403);
  });
});
```

### Integration Tests

```typescript
// Example integration test
describe("User Invitation Flow", () => {
  it("should complete full invitation process", async () => {
    // 1. Admin invites user
    const inviteResponse = await fetch("/api/invite-user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "user",
      }),
    });

    expect(inviteResponse.status).toBe(201);

    // 2. Verify user can accept invitation
    // 3. Verify user can authenticate
    // 4. Verify user has correct permissions
  });
});
```

## Related Documentation

- [`authentication.md`](./authentication.md) - Authentication system details
- [`role-system.md`](./role-system.md) - Role-based access control
- [`database-schema.md`](./database-schema.md) - Data models and relationships
- [`troubleshooting.md`](./troubleshooting.md) - API troubleshooting guide
