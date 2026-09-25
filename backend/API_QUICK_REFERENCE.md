# 🚀 API Quick Reference - Email Scheduler

**Base URL:** `http://localhost:4000`  
**Port:** 4000  
**Format:** JSON

---

## 📋 All Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| **GET** | `/health` | Health check | ❌ No |
| **GET** | `/auth/google` | Google OAuth login | ❌ No |
| **GET** | `/auth/google/callback` | OAuth callback | ❌ No |
| **GET** | `/auth/me` | Get current user | ✅ Yes |
| **POST** | `/auth/logout` | Logout | ✅ Yes |
| **POST** | `/api/schedule` | Schedule emails | ❌ No* |
| **GET** | `/api/emails/scheduled` | Get pending emails | ❌ No |
| **GET** | `/api/emails/sent` | Get sent emails | ❌ No |

*`/api/schedule` requires `userId` in body (currently no auth check)

---

## 🔑 Key Request/Response Examples

### Health Check
```bash
GET /health

Response (200):
{ "redis": "ok", "postgres": "ok" }
```

### Schedule Email
```bash
POST /api/schedule

Body:
{
  "fromSender": "madyson65@ethereal.email",
  "recipients": ["user@example.com"],
  "subject": "Hello",
  "body": "<h1>Hi</h1>",
  "startTime": "2026-09-24T20:00:00Z",
  "delayBetweenEmailsMs": 2000,
  "hourlyLimit": 200,
  "userId": "user-id"
}

Response (201):
{ "campaignId": "uuid", "jobsCreated": 1 }
```

### Get Scheduled Emails
```bash
GET /api/emails/scheduled

Response (200):
[
  {
    "id": "job-id",
    "email": "user@example.com",
    "subject": "Hello",
    "scheduledTime": "2026-09-24T20:00:00Z",
    "status": "SCHEDULED"
  }
]
```

### Get Sent Emails
```bash
GET /api/emails/sent

Response (200):
[
  {
    "id": "job-id",
    "email": "user@example.com",
    "subject": "Hello",
    "sentTime": "2026-09-24T20:00:05Z",
    "status": "sent"
  }
]
```

### Get User (After OAuth)
```bash
GET /auth/me

Response (200):
{
  "id": "user-uuid",
  "googleId": "google-id",
  "email": "user@gmail.com",
  "name": "User Name",
  "avatarUrl": "https://...",
  "createdAt": "2026-09-24T17:00:00Z"
}

Response (401):
{ "error": "not authenticated" }
```

### Logout
```bash
POST /auth/logout

Response (200):
{ "ok": true }
```

---

## 📊 Email Status Values

### Scheduled Emails
- `SCHEDULED` - Waiting to be sent
- `PENDING` - In queue, processing soon
- `RESCHEDULED` - Delayed due to rate limit

### Sent Emails
- `sent` - Successfully delivered
- `failed` - Failed to deliver

---

## 🌐 JavaScript Fetch Template

```javascript
// Basic GET
fetch('http://localhost:4000/api/emails/scheduled')
  .then(r => r.json())
  .then(data => console.log(data))

// POST with body
fetch('http://localhost:4000/api/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromSender: 'sender@example.com',
    recipients: ['user@example.com'],
    subject: 'Subject',
    body: '<h1>Content</h1>',
    startTime: new Date().toISOString(),
    delayBetweenEmailsMs: 2000,
    hourlyLimit: 200,
    userId: 'user-id'
  })
})
.then(r => r.json())
.then(data => console.log(data))

// With credentials (for auth)
fetch('http://localhost:4000/auth/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## 📦 React Hooks Example

```javascript
// Get scheduled emails
const [scheduled, setScheduled] = useState([]);

useEffect(() => {
  fetch('http://localhost:4000/api/emails/scheduled')
    .then(r => r.json())
    .then(setScheduled);
}, []);

// Schedule email
const scheduleEmail = async (formData) => {
  const res = await fetch('http://localhost:4000/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return res.json();
};
```

---

## 🔗 Query Parameters

Currently no query parameters supported. All filtering done on backend:
- Scheduled emails: Sorted by `scheduledTime` (ascending)
- Sent emails: Sorted by `sentTime` (descending)
- Max results: 200 per request

---

## ⚠️ Common Errors

| Code | Meaning | Fix |
|------|---------|-----|
| 400 | Bad request | Check validation (email format, min lengths) |
| 401 | Not authenticated | Login via Google OAuth |
| 500 | Server error | Check server logs, restart if needed |
| 503 | Service unavailable | Check Redis/PostgreSQL status |

---

## 🔄 Polling Strategy

For real-time updates, poll every 5-10 seconds:

```javascript
setInterval(async () => {
  const scheduled = await fetch('...scheduled').then(r => r.json());
  const sent = await fetch('...sent').then(r => r.json());
  // Update UI
}, 10000);
```

---

## 📝 Form Data Example

HTML form for scheduling:

```html
<form id="scheduleForm">
  <input type="email" name="fromSender" placeholder="From" required />
  <textarea name="body" placeholder="HTML Body" required></textarea>
  <input type="text" name="subject" placeholder="Subject" required />
  <input type="text" name="recipients" placeholder="recipient@example.com" required />
  <input type="datetime-local" name="startTime" required />
  <input type="number" name="delayBetweenEmailsMs" value="2000" />
  <input type="number" name="hourlyLimit" value="200" />
  <button type="submit">Schedule</button>
</form>

<script>
document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  
  const res = await fetch('http://localhost:4000/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromSender: form.get('fromSender'),
      recipients: form.get('recipients').split(',').map(e => e.trim()),
      subject: form.get('subject'),
      body: form.get('body'),
      startTime: new Date(form.get('startTime')).toISOString(),
      delayBetweenEmailsMs: parseInt(form.get('delayBetweenEmailsMs')),
      hourlyLimit: parseInt(form.get('hourlyLimit')),
      userId: 'test-user-123'
    })
  });
  
  const data = await res.json();
  console.log(data);
});
</script>
```

---

## 🧪 Test with cURL

```bash
# Health check
curl http://localhost:4000/health

# Get scheduled
curl http://localhost:4000/api/emails/scheduled

# Get sent
curl http://localhost:4000/api/emails/sent

# Schedule email
curl -X POST http://localhost:4000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "fromSender": "sender@example.com",
    "recipients": ["user@example.com"],
    "subject": "Test",
    "body": "<h1>Test</h1>",
    "startTime": "2026-09-24T20:00:00Z",
    "delayBetweenEmailsMs": 2000,
    "hourlyLimit": 200,
    "userId": "user-id"
  }'

# Get user (requires auth)
curl -b "sessionId=..." http://localhost:4000/auth/me

# Logout
curl -X POST http://localhost:4000/auth/logout
```

---

## 🎯 Frontend Implementation Checklist

- [ ] Add `/health` endpoint call on app load
- [ ] Implement Google OAuth login (`/auth/google`)
- [ ] Call `/auth/me` after login to get user profile
- [ ] Show email scheduling form
- [ ] POST to `/api/schedule` with form data
- [ ] Display scheduled emails from `/api/emails/scheduled`
- [ ] Display sent emails from `/api/emails/sent`
- [ ] Refresh lists every 10 seconds
- [ ] Add logout button (POST `/auth/logout`)
- [ ] Handle error responses (400, 401, 500, 503)

---

**API Status:** ✅ Ready for Frontend Integration
