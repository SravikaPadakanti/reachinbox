# 📚 Email Scheduler API - Frontend Integration Guide

**Version:** 1.0.0  
**Base URL:** `http://localhost:4000`  
**Status:** ✅ Production Ready

---

## 🔐 Authentication Routes

### 1. Google OAuth Login
**Endpoint:** `GET /auth/google`

**Purpose:** Initiate Google OAuth login flow

**Request:**
```bash
GET http://localhost:4000/auth/google
```

**Response:** 
- Redirects to Google login page
- After authentication, redirects to `/auth/google/callback`
- Session cookie is automatically set

**Usage:**
```javascript
// Frontend: Redirect user to OAuth login
window.location.href = 'http://localhost:4000/auth/google';
```

---

### 2. Google OAuth Callback
**Endpoint:** `GET /auth/google/callback`

**Purpose:** Handle Google OAuth callback (automatic redirect)

**Note:** This is handled automatically by Passport.js. After successful authentication, user is redirected to `/dashboard` or `/login?error=1` on failure.

---

### 3. Get Current User
**Endpoint:** `GET /auth/me`

**Purpose:** Get authenticated user profile

**Request:**
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Content-Type: application/json"
```

**Response (Success - 200):**
```json
{
  "id": "uuid-string",
  "googleId": "google-id",
  "email": "user@example.com",
  "name": "User Name",
  "avatarUrl": "https://...",
  "createdAt": "2026-09-24T17:00:00.000Z"
}
```

**Response (Error - 401):**
```json
{
  "error": "not authenticated"
}
```

---

### 4. Logout
**Endpoint:** `POST /auth/logout`

**Purpose:** Clear authentication session

**Request:**
```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Content-Type: application/json"
```

**Response (Success - 200):**
```json
{
  "ok": true
}
```

---

## 📧 Email Scheduling Routes

### 5. Schedule Email Campaign
**Endpoint:** `POST /api/schedule`

**Purpose:** Create and schedule email campaign(s)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "fromSender": "madyson65@ethereal.email",
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Campaign Subject",
  "body": "<h1>HTML Email Body</h1><p>Message here</p>",
  "startTime": "2026-09-24T20:00:00.000Z",
  "delayBetweenEmailsMs": 2000,
  "hourlyLimit": 200,
  "userId": "user-id-from-session"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `fromSender` | string (email) | ✅ Yes | Sender email address | - |
| `recipients` | array[string] | ✅ Yes | Array of recipient emails (min 1) | - |
| `subject` | string | ✅ Yes | Email subject (min 1 char) | - |
| `body` | string | ✅ Yes | Email body in HTML (min 1 char) | - |
| `startTime` | ISO 8601 date | ✅ Yes | When first email should send | - |
| `delayBetweenEmailsMs` | integer | ❌ No | Milliseconds between each email | 2000 |
| `hourlyLimit` | integer | ❌ No | Max emails per hour per sender | 200 |
| `userId` | string | ✅ Yes | User ID (from authentication) | - |

**Response (Success - 201):**
```json
{
  "campaignId": "uuid-string",
  "jobsCreated": 2
}
```

**Response (Error - 400):**
```json
{
  "error": {
    "fieldErrors": {
      "fromSender": ["Invalid email format"],
      "recipients": ["Must have at least 1 recipient"],
      "subject": ["Required"],
      "body": ["Required"]
    }
  }
}
```

**Example JavaScript Request:**
```javascript
async function scheduleEmailCampaign() {
  const response = await fetch('http://localhost:4000/api/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Include session cookie
    body: JSON.stringify({
      fromSender: 'madyson65@ethereal.email',
      recipients: ['recipient@example.com'],
      subject: 'Hello World',
      body: '<h1>Welcome!</h1>',
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      delayBetweenEmailsMs: 2000,
      hourlyLimit: 200,
      userId: 'test-user-123'
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    console.log('Campaign created:', data.campaignId);
    console.log('Jobs queued:', data.jobsCreated);
  } else {
    console.error('Error:', data.error);
  }
}
```

---

## 📋 Email Status Routes

### 6. Get Scheduled Emails
**Endpoint:** `GET /api/emails/scheduled`

**Purpose:** Retrieve pending/scheduled emails

**Request:**
```bash
curl -X GET http://localhost:4000/api/emails/scheduled \
  -H "Content-Type: application/json"
```

**Response (Success - 200):**
```json
[
  {
    "id": "job-id-uuid",
    "email": "recipient@example.com",
    "subject": "Email Subject",
    "scheduledTime": "2026-09-24T20:00:00.000Z",
    "status": "SCHEDULED"
  },
  {
    "id": "job-id-uuid",
    "email": "recipient2@example.com",
    "subject": "Email Subject",
    "scheduledTime": "2026-09-24T20:00:02.000Z",
    "status": "SCHEDULED"
  }
]
```

**Status Values:**
- `SCHEDULED` - Waiting to be sent
- `PENDING` - In queue, about to be sent
- `RESCHEDULED` - Rescheduled due to rate limiting

**Max Results:** 200 per request

**Example JavaScript Request:**
```javascript
async function getScheduledEmails() {
  const response = await fetch('http://localhost:4000/api/emails/scheduled', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  const emails = await response.json();
  console.log(`Found ${emails.length} scheduled emails`);
  emails.forEach(email => {
    console.log(`${email.email}: ${email.subject} - ${email.status}`);
  });
}
```

---

### 7. Get Sent/Failed Emails
**Endpoint:** `GET /api/emails/sent`

**Purpose:** Retrieve sent and failed emails

**Request:**
```bash
curl -X GET http://localhost:4000/api/emails/sent \
  -H "Content-Type: application/json"
```

**Response (Success - 200):**
```json
[
  {
    "id": "job-id-uuid",
    "email": "recipient@example.com",
    "subject": "Email Subject",
    "sentTime": "2026-09-24T20:00:05.000Z",
    "status": "sent"
  },
  {
    "id": "job-id-uuid",
    "email": "invalid@example.com",
    "subject": "Email Subject",
    "sentTime": "2026-09-24T20:00:07.000Z",
    "status": "failed"
  }
]
```

**Status Values:**
- `sent` - Successfully delivered
- `failed` - Failed to deliver

**Ordered By:** Most recent first  
**Max Results:** 200 per request

**Example JavaScript Request:**
```javascript
async function getSentEmails() {
  const response = await fetch('http://localhost:4000/api/emails/sent', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  const emails = await response.json();
  const sent = emails.filter(e => e.status === 'sent').length;
  const failed = emails.filter(e => e.status === 'failed').length;
  
  console.log(`Sent: ${sent}, Failed: ${failed}`);
}
```

---

## 🏥 Health Check Route

### 8. Server Health Check
**Endpoint:** `GET /health`

**Purpose:** Check server, database, and Redis status

**Request:**
```bash
curl -X GET http://localhost:4000/health
```

**Response (Healthy - 200):**
```json
{
  "redis": "ok",
  "postgres": "ok"
}
```

**Response (Unhealthy - 503):**
```json
{
  "redis": "error: Connection refused",
  "postgres": "ok"
}
```

**Status Codes:**
- `200` - All systems healthy
- `503` - One or more systems down

**Example JavaScript Request:**
```javascript
async function checkHealth() {
  const response = await fetch('http://localhost:4000/health');
  const status = await response.json();
  
  if (response.status === 200) {
    console.log('✅ All systems healthy');
  } else {
    console.log('❌ System issues:', status);
  }
}
```

---

## 🔗 CORS Configuration

**Allowed Origin:** `http://localhost:3000` (configured in `.env`)  
**Credentials:** Enabled  
**Methods:** GET, POST, PUT, DELETE, OPTIONS

**Frontend Configuration:**
```javascript
// All fetch requests should include credentials
fetch(url, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
```

---

## 📊 Common Response Patterns

### Success Response
```
HTTP 200 | 201 | 204
Content-Type: application/json

{
  "data": {...}
}
```

### Error Response
```
HTTP 400 | 401 | 403 | 500
Content-Type: application/json

{
  "error": "Error message" | { "fieldErrors": {...} }
}
```

---

## 🛠️ Frontend Integration Checklist

### Authentication Flow
- [ ] Implement Google OAuth login button
- [ ] Redirect to `/auth/google` on login click
- [ ] Handle callback redirect to dashboard
- [ ] Call `/auth/me` on app load to get user profile
- [ ] Implement logout button (POST to `/auth/logout`)
- [ ] Store user session (automatic via cookies)

### Campaign Creation
- [ ] Create form for email campaign details
- [ ] Validate email addresses before sending
- [ ] Support date/time picker for `startTime`
- [ ] Allow configurable `delayBetweenEmailsMs`
- [ ] Allow configurable `hourlyLimit`
- [ ] POST to `/api/schedule` with form data
- [ ] Show success/error messages

### Dashboard
- [ ] Display scheduled emails from `/api/emails/scheduled`
- [ ] Display sent emails from `/api/emails/sent`
- [ ] Auto-refresh or poll for updates (every 5-10 seconds)
- [ ] Show email status with visual indicators
- [ ] Display sender, recipient, subject, scheduled/sent time
- [ ] Implement pagination for lists (API returns max 200)

### Health Monitoring
- [ ] Call `/health` on app startup
- [ ] Show system status indicator
- [ ] Alert user if services are down
- [ ] Disable campaign creation if systems unhealthy

---

## 📝 Example Frontend Code

### React Component Example
```javascript
import React, { useEffect, useState } from 'react';

function EmailScheduler() {
  const [user, setUser] = useState(null);
  const [scheduled, setScheduled] = useState([]);
  const [sent, setSent] = useState([]);

  useEffect(() => {
    // Check authentication
    fetch('http://localhost:4000/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(() => window.location.href = 'http://localhost:4000/auth/google');

    // Load emails
    loadEmails();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadEmails, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadEmails() {
    const scheduledRes = await fetch('http://localhost:4000/api/emails/scheduled', 
      { credentials: 'include' });
    setScheduled(await scheduledRes.json());

    const sentRes = await fetch('http://localhost:4000/api/emails/sent', 
      { credentials: 'include' });
    setSent(await sentRes.json());
  }

  async function scheduleEmail(e) {
    e.preventDefault();
    
    const res = await fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromSender: 'madyson65@ethereal.email',
        recipients: ['recipient@example.com'],
        subject: e.target.subject.value,
        body: e.target.body.value,
        startTime: new Date().toISOString(),
        delayBetweenEmailsMs: 2000,
        hourlyLimit: 200,
        userId: user.id
      })
    });

    if (res.ok) {
      alert('Campaign scheduled!');
      loadEmails();
    }
  }

  return (
    <div>
      {user && <h1>Welcome, {user.name}!</h1>}
      
      <form onSubmit={scheduleEmail}>
        <input name="subject" placeholder="Subject" required />
        <textarea name="body" placeholder="Body (HTML)" required />
        <button type="submit">Schedule Campaign</button>
      </form>

      <h2>Scheduled ({scheduled.length})</h2>
      <ul>
        {scheduled.map(email => (
          <li key={email.id}>
            {email.email}: {email.subject} ({email.status})
          </li>
        ))}
      </ul>

      <h2>Sent ({sent.length})</h2>
      <ul>
        {sent.map(email => (
          <li key={email.id}>
            {email.email}: {email.subject} ({email.status})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EmailScheduler;
```

---

## 🚀 Quick Start for Frontend

1. **Install dependencies:**
   ```bash
   npm install axios
   ```

2. **Create API client:**
   ```javascript
   const API_URL = 'http://localhost:4000';
   
   const api = axios.create({
     baseURL: API_URL,
     withCredentials: true,
     headers: { 'Content-Type': 'application/json' }
   });
   ```

3. **Make requests:**
   ```javascript
   // Schedule email
   const { data } = await api.post('/api/schedule', {...});
   
   // Get scheduled
   const scheduled = await api.get('/api/emails/scheduled');
   
   // Get sent
   const sent = await api.get('/api/emails/sent');
   
   // Check auth
   const user = await api.get('/auth/me');
   ```

---

## 🐛 Error Handling

**Always check response status:**
```javascript
const response = await fetch(url, options);
if (!response.ok) {
  const error = await response.json();
  console.error(`HTTP ${response.status}:`, error);
}
```

**Common Errors:**

| Status | Meaning | Action |
|--------|---------|--------|
| 200/201 | Success | Process response data |
| 400 | Bad request | Check validation errors |
| 401 | Not authenticated | Redirect to login |
| 403 | Forbidden | Check permissions |
| 500 | Server error | Retry or contact admin |
| 503 | Service unavailable | Show "offline" message |

---

**Last Updated:** 2026-09-24  
**Status:** ✅ Ready for Integration
