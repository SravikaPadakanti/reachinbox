# 📘 TypeScript Types & Interfaces - Email Scheduler

For frontend developers using TypeScript, here are all the types and interfaces:

---

## 👤 User Type

```typescript
interface User {
  id: string;                    // UUID
  googleId: string | null;       // Google OAuth ID
  email: string;                 // User email (unique)
  name: string | null;           // Display name
  avatarUrl: string | null;      // Profile picture URL
  createdAt: Date;               // Account creation date
}
```

**Where it comes from:** `GET /auth/me`

```typescript
async function getCurrentUser(): Promise<User> {
  const res = await fetch('http://localhost:4000/auth/me', {
    credentials: 'include'
  });
  return res.json();
}
```

---

## 📧 Email Job Type

```typescript
interface EmailJob {
  id: string;                    // UUID
  email: string;                 // Recipient email
  subject: string;               // Email subject
  scheduledTime?: Date;          // When it's scheduled to send
  sentTime?: Date;               // When it was actually sent
  status: 'scheduled' | 'sent' | 'failed'; // Current status
}
```

**Where it comes from:**
- `GET /api/emails/scheduled` returns jobs with `scheduledTime`
- `GET /api/emails/sent` returns jobs with `sentTime` and status `'sent' | 'failed'`

```typescript
async function getScheduledEmails(): Promise<EmailJob[]> {
  const res = await fetch('http://localhost:4000/api/emails/scheduled');
  return res.json();
}

async function getSentEmails(): Promise<EmailJob[]> {
  const res = await fetch('http://localhost:4000/api/emails/sent');
  return res.json();
}
```

---

## 📝 Schedule Request Type

```typescript
interface ScheduleEmailRequest {
  fromSender: string;            // Sender email (required)
  recipients: string[];          // Array of recipient emails (min 1)
  subject: string;               // Email subject (min 1 char)
  body: string;                  // HTML email body (min 1 char)
  startTime: string;             // ISO 8601 date when to start sending
  delayBetweenEmailsMs?: number; // Milliseconds between emails (default: 2000)
  hourlyLimit?: number;          // Max emails per hour (default: 200)
  userId: string;                // User ID creating the campaign
}
```

**How to use:**

```typescript
async function scheduleCampaign(
  request: ScheduleEmailRequest
): Promise<{ campaignId: string; jobsCreated: number }> {
  const res = await fetch('http://localhost:4000/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return res.json();
}

// Example usage:
await scheduleCampaign({
  fromSender: 'sender@example.com',
  recipients: ['user1@example.com', 'user2@example.com'],
  subject: 'Welcome!',
  body: '<h1>Welcome to our service!</h1>',
  startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  delayBetweenEmailsMs: 2000,
  hourlyLimit: 200,
  userId: user.id
});
```

---

## 📊 Health Check Type

```typescript
interface HealthStatus {
  redis: 'ok' | string;          // Redis status or error message
  postgres: 'ok' | string;       // PostgreSQL status or error message
}
```

**How to use:**

```typescript
async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch('http://localhost:4000/health');
  if (res.ok) {
    return res.json(); // { redis: 'ok', postgres: 'ok' }
  } else {
    throw new Error('System unhealthy');
  }
}
```

---

## 🎯 Campaign Type (Response)

```typescript
interface Campaign {
  campaignId: string;            // UUID of created campaign
  jobsCreated: number;           // Number of email jobs created
}
```

**Returned from:** `POST /api/schedule` (Status 201)

---

## ❌ Error Response Types

### Validation Error (400)

```typescript
interface ValidationError {
  error: {
    fieldErrors: {
      [key: string]: string[];   // Field name -> array of error messages
    };
  };
}
```

**Example:**

```json
{
  "error": {
    "fieldErrors": {
      "fromSender": ["Invalid email format"],
      "recipients": ["Must have at least 1 recipient"],
      "subject": ["Required field"]
    }
  }
}
```

### Authentication Error (401)

```typescript
interface AuthError {
  error: string;                 // "not authenticated"
}
```

### Generic Error (500)

```typescript
interface ServerError {
  error: string;                 // Error message
  code?: string;                 // Optional error code
}
```

---

## 🔑 Request Headers Type

```typescript
interface RequestHeaders {
  'Content-Type': 'application/json';
  'Cookie'?: string;             // Session cookie (auto-managed)
}
```

---

## 📋 API Response Wrapper Types

```typescript
// Success Response
interface ApiResponse<T> {
  status: 200 | 201 | 204;
  data: T;
}

// Error Response
interface ApiErrorResponse {
  status: 400 | 401 | 403 | 500 | 503;
  error: ValidationError | AuthError | ServerError;
}
```

---

## 🛠️ React Hooks Types

For use in React components:

```typescript
// Use for scheduled emails list
const [scheduled, setScheduled] = useState<EmailJob[]>([]);

// Use for sent emails list
const [sent, setSent] = useState<EmailJob[]>([]);

// Use for current user
const [user, setUser] = useState<User | null>(null);

// Use for form state
const [formData, setFormData] = useState<ScheduleEmailRequest>({
  fromSender: '',
  recipients: [],
  subject: '',
  body: '',
  startTime: new Date().toISOString(),
  delayBetweenEmailsMs: 2000,
  hourlyLimit: 200,
  userId: ''
});

// Use for loading states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Use for health status
const [health, setHealth] = useState<HealthStatus | null>(null);
```

---

## 📦 Complete API Client Type

```typescript
interface ApiClient {
  // Auth
  getCurrentUser(): Promise<User>;
  logout(): Promise<{ ok: boolean }>;
  
  // Scheduling
  scheduleEmails(req: ScheduleEmailRequest): Promise<Campaign>;
  
  // Email Status
  getScheduledEmails(): Promise<EmailJob[]>;
  getSentEmails(): Promise<EmailJob[]>;
  
  // Health
  checkHealth(): Promise<HealthStatus>;
}
```

**Implementation:**

```typescript
class EmailSchedulerClient implements ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  async getCurrentUser(): Promise<User> {
    return this.request('GET', '/auth/me');
  }

  async logout(): Promise<{ ok: boolean }> {
    return this.request('POST', '/auth/logout');
  }

  async scheduleEmails(req: ScheduleEmailRequest): Promise<Campaign> {
    return this.request('POST', '/api/schedule', req);
  }

  async getScheduledEmails(): Promise<EmailJob[]> {
    return this.request('GET', '/api/emails/scheduled');
  }

  async getSentEmails(): Promise<EmailJob[]> {
    return this.request('GET', '/api/emails/sent');
  }

  async checkHealth(): Promise<HealthStatus> {
    return this.request('GET', '/health');
  }
}

// Usage
const client = new EmailSchedulerClient();
const user = await client.getCurrentUser();
```

---

## 🎨 Form Component Types

```typescript
interface EmailScheduleForm {
  fromSender: string;
  recipientsList: string;         // Comma-separated emails
  subject: string;
  body: string;
  startDate: string;              // Date from input
  startTime: string;              // Time from input
  delayBetweenEmails: number;
  hourlyLimit: number;
}

// Convert form to request
function formToRequest(form: EmailScheduleForm, userId: string): ScheduleEmailRequest {
  return {
    fromSender: form.fromSender,
    recipients: form.recipientsList.split(',').map(e => e.trim()),
    subject: form.subject,
    body: form.body,
    startTime: new Date(`${form.startDate}T${form.startTime}`).toISOString(),
    delayBetweenEmailsMs: form.delayBetweenEmails,
    hourlyLimit: form.hourlyLimit,
    userId
  };
}
```

---

## 🧩 Filter/Sort Types

```typescript
interface EmailFilter {
  status?: 'SCHEDULED' | 'PENDING' | 'RESCHEDULED' | 'SENT' | 'FAILED';
  email?: string;                 // Filter by recipient
  subject?: string;               // Filter by subject
}

// Note: Filters are applied on frontend only, not in API
function filterEmails(emails: EmailJob[], filter: EmailFilter): EmailJob[] {
  return emails.filter(email => {
    if (filter.status && email.status !== filter.status) return false;
    if (filter.email && !email.email.includes(filter.email)) return false;
    if (filter.subject && !email.subject.includes(filter.subject)) return false;
    return true;
  });
}
```

---

## ⚡ Union Types

```typescript
// Email status union
type EmailStatus = 'SCHEDULED' | 'PENDING' | 'RESCHEDULED' | 'SENT' | 'FAILED';

// Scheduled email union
type ScheduledEmailStatus = 'SCHEDULED' | 'PENDING' | 'RESCHEDULED';

// Sent email union
type SentEmailStatus = 'sent' | 'failed';

// Generic response union
type ApiResponse<T> = 
  | { status: 200 | 201; data: T }
  | { status: 400 | 401 | 500; error: string };
```

---

## 📚 Complete Example Component

```typescript
import React, { useEffect, useState } from 'react';

// Types
interface AppState {
  user: User | null;
  scheduled: EmailJob[];
  sent: EmailJob[];
  health: HealthStatus | null;
  loading: boolean;
  error: string | null;
}

interface FormState extends ScheduleEmailRequest {
  recipientsList: string; // UI-only field
}

// Component
function EmailSchedulerApp(): JSX.Element {
  const [state, setState] = useState<AppState>({
    user: null,
    scheduled: [],
    sent: [],
    health: null,
    loading: true,
    error: null
  });

  const client = new EmailSchedulerClient();

  useEffect(() => {
    const init = async () => {
      try {
        // Check health
        const health = await client.checkHealth();
        
        // Get user
        const user = await client.getCurrentUser();
        
        // Load emails
        const [scheduled, sent] = await Promise.all([
          client.getScheduledEmails(),
          client.getSentEmails()
        ]);

        setState({
          user,
          scheduled,
          sent,
          health,
          loading: false,
          error: null
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    };

    init();
    
    // Refresh every 10s
    const interval = setInterval(init, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSchedule = async (form: FormState) => {
    try {
      await client.scheduleEmails({
        ...form,
        recipients: form.recipientsList.split(',').map(e => e.trim())
      });
      // Refresh emails
      const scheduled = await client.getScheduledEmails();
      setState(prev => ({ ...prev, scheduled }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to schedule'
      }));
    }
  };

  return (
    <div>
      {state.error && <div className="error">{state.error}</div>}
      {state.user && <div>Welcome, {state.user.name}</div>}
      
      <div>Scheduled: {state.scheduled.length}</div>
      <div>Sent: {state.sent.length}</div>
      
      {/* Form component */}
      {/* Email lists */}
    </div>
  );
}
```

---

**Generated:** 2026-09-24  
**Status:** ✅ Ready for Frontend Development
