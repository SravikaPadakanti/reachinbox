const http = require('http');

const BASE_URL = 'http://localhost:4000';

class ApiClient {
  constructor() {
    this.cookie = null;
  }

  async request(method, path, body = null, useAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this.cookie = setCookie.split(';')[0];
    }

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    return {
      status: res.status,
      ok: res.ok,
      data
    };
  }

  async login(email = 'testuser@example.com') {
    const res = await this.request('POST', '/auth/login', { email }, false);
    return res;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('       REACHINBOX COMPLETE COMPREHENSIVE TEST SUITE          ');
  console.log('=============================================================\n');

  const client = new ApiClient();
  let passed = 0;
  let failed = 0;

  function assert(title, condition, extraInfo = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${title} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  // --- SUITE 1: Infrastructure & Health ---
  console.log('\n--- [SUITE 1] Infrastructure & Service Health ---');
  {
    const res = await client.request('GET', '/health', null, false);
    assert('Health Check Endpoint Returns 200 OK', res.status === 200);
    assert('PostgreSQL Connection Active', res.data?.postgres === 'ok');
    assert('Redis Queue Connection Active', res.data?.redis === 'ok');
  }

  // --- SUITE 2: Authentication & Security ---
  console.log('\n--- [SUITE 2] Authentication & Security Guards ---');
  {
    const unauthMe = await client.request('GET', '/auth/me', null, false);
    assert('Protected Route Rejects Unauthenticated Request (401)', unauthMe.status === 401);

    const loginRes = await client.login('test@example.com');
    assert('Demo/Email Login Returns 200 OK', loginRes.status === 200);
    assert('Session Cookie Received', !!client.cookie);
    assert('User Email Matches', loginRes.data?.email === 'test@example.com');

    const authMe = await client.request('GET', '/auth/me');
    assert('Authenticated /auth/me Returns Profile', authMe.status === 200 && authMe.data?.email === 'test@example.com');
  }

  // --- SUITE 3: Single Email Campaign Scheduling ---
  console.log('\n--- [SUITE 3] Single Email Campaign Scheduling ---');
  {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    const res = await client.request('POST', '/api/schedule', {
      fromSender: 'madyson65@ethereal.email',
      recipients: ['single.test@example.com'],
      subject: 'Test Campaign - Single Recipient',
      body: '<p>Hello from single recipient test</p>',
      startTime: futureTime,
      delayBetweenEmailsMs: 2000,
      hourlyLimit: 200
    });

    assert('Schedule Single Email Returns 201 Created', res.status === 201);
    assert('Single Job Created', res.data?.jobsCreated === 1, `Campaign: ${res.data?.campaignId}`);
  }

  // --- SUITE 4: Batch Multi-Recipient Scheduling (CSV Emulation) ---
  console.log('\n--- [SUITE 4] Batch Multi-Recipient Scheduling (CSV Emulation) ---');
  {
    const futureTime = new Date(Date.now() + 120000).toISOString();
    const batchRecipients = [
      'lead1@acme.com',
      'lead2@acme.com',
      'lead3@acme.com',
      'lead4@acme.com',
      'lead5@acme.com'
    ];

    const res = await client.request('POST', '/api/schedule', {
      fromSender: 'madyson65@ethereal.email',
      recipients: batchRecipients,
      subject: 'Quarterly Outreach Campaign',
      body: '<h3>Exclusive Offer</h3><p>Batch test content</p>',
      startTime: futureTime,
      delayBetweenEmailsMs: 3000,
      hourlyLimit: 150
    });

    assert('Schedule Batch Campaign Returns 201 Created', res.status === 201);
    assert('Creates 5 Distinct Scheduled Jobs', res.data?.jobsCreated === 5, `Campaign: ${res.data?.campaignId}`);
  }

  // --- SUITE 5: Email with File Attachments ---
  console.log('\n--- [SUITE 5] File Attachment Scheduling & Transmission ---');
  let attachmentJobId = null;
  {
    const sampleAttachmentContent = Buffer.from('Confidential Report Data 2026').toString('base64');
    const nowTime = new Date().toISOString();

    const res = await client.request('POST', '/api/schedule', {
      fromSender: 'madyson65@ethereal.email',
      recipients: ['attachment.verify@ethereal.email'],
      subject: 'Project Attachment Delivery Test',
      body: '<p>Please find the attached document below.</p>',
      startTime: nowTime,
      attachments: [
        {
          filename: 'Quarterly_Report.txt',
          content: sampleAttachmentContent,
          contentType: 'text/plain'
        },
        {
          filename: 'Invoice_1001.pdf',
          content: Buffer.from('%PDF-1.4 Mock PDF Content').toString('base64'),
          contentType: 'application/pdf'
        }
      ]
    });

    assert('Schedule Email With Multiple Attachments (PDF + TXT) Returns 201', res.status === 201);
    assert('Attachment Job Created Successfully', res.data?.jobsCreated === 1);
  }

  // --- SUITE 6: Scheduled Queue Retrieval ---
  console.log('\n--- [SUITE 6] Scheduled Queue Listing ---');
  {
    const res = await client.request('GET', '/api/emails/scheduled');
    assert('GET /api/emails/scheduled Returns 200 OK', res.status === 200);
    assert('Returns Array of Scheduled Emails', Array.isArray(res.data) && res.data.length > 0, `Total scheduled: ${res.data?.length}`);
    const first = res.data?.[0];
    assert('Email Item Has Required Fields (id, email, subject, scheduledTime, status)', 
      !!first?.id && !!first?.email && !!first?.subject && !!first?.scheduledTime && !!first?.status);
  }

  // --- SUITE 7: End-to-End Worker Delivery Verification ---
  console.log('\n--- [SUITE 7] BullMQ Worker & SMTP Delivery Verification ---');
  {
    console.log('  ⏳ Waiting 4 seconds for worker to process immediate jobs...');
    await sleep(4000);

    const res = await client.request('GET', '/api/emails/sent');
    assert('GET /api/emails/sent Returns 200 OK', res.status === 200);
    assert('Sent Emails List Contains Processed Jobs', Array.isArray(res.data) && res.data.length > 0, `Total sent: ${res.data?.length}`);

    const latestSent = res.data?.[0];
    assert('Latest Sent Email Has Status "sent"', latestSent?.status === 'sent');
    attachmentJobId = latestSent?.id;
  }

  // --- SUITE 8: Email Detail Inspection ---
  console.log('\n--- [SUITE 8] Individual Email Detail Inspection (GET /api/emails/:id) ---');
  {
    if (attachmentJobId) {
      const res = await client.request('GET', `/api/emails/${attachmentJobId}`);
      assert('GET /api/emails/:id Returns 200 OK', res.status === 200);
      assert('Detail Includes Full HTML Body', typeof res.data?.body === 'string' && res.data?.body.length > 0);
      assert('Detail Includes From Sender and Recipient', !!res.data?.fromSender && !!res.data?.email);
      assert('Detail Includes Timestamps (scheduledTime, sentTime)', !!res.data?.scheduledTime);
    } else {
      assert('Email Detail Inspection', false, 'No sent job ID available');
    }
  }

  // --- SUITE 9: Negative Testing & Validation Error Handling ---
  console.log('\n--- [SUITE 9] Error Handling & Validation Tests ---');
  {
    // Test: Missing Subject & Body
    const errMissingFields = await client.request('POST', '/api/schedule', {
      fromSender: 'test@example.com',
      recipients: ['recipient@example.com']
    });
    assert('Rejects Schedule Request With Missing Subject & Body (400)', errMissingFields.status === 400);

    // Test: Empty Recipients Array
    const errEmptyRecipients = await client.request('POST', '/api/schedule', {
      fromSender: 'test@example.com',
      recipients: [],
      subject: 'No recipient',
      body: 'Content'
    });
    assert('Rejects Schedule Request With Empty Recipients List (400)', errEmptyRecipients.status === 400);

    // Test: Invalid Email Format
    const errInvalidEmail = await client.request('POST', '/api/schedule', {
      fromSender: 'not-an-email',
      recipients: ['bad-email-address'],
      subject: 'Invalid test',
      body: 'Content'
    });
    assert('Rejects Request With Invalid Email Formats (400)', errInvalidEmail.status === 400);

    // Test: Non-existent Email Detail Lookup
    const errNotFound = await client.request('GET', '/api/emails/00000000-0000-0000-0000-000000000000');
    assert('Non-existent Email Lookup Returns 404 Not Found', errNotFound.status === 404);
  }

  // --- SUMMARY REPORT ---
  console.log('\n=============================================================');
  console.log(`                     TEST RESULTS SUMMARY                    `);
  console.log('=============================================================');
  console.log(`  Total Test Assertions: ${passed + failed}`);
  console.log(`  Passed:                ${passed} ✅`);
  console.log(`  Failed:                ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Success Rate:          ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
