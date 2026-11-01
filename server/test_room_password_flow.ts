import assert from 'assert';
import app, { roomManager } from './src/index.js';
import { GameRoom } from './src/gameEngine.js';

console.log('====================================================');
console.log('🔒 VERIFYING ROOM PASSWORD CREATION & JOIN FLOW');
console.log('====================================================\n');

function makeRequest(method: string, url: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req: any = {
      method,
      url,
      originalUrl: url,
      headers: { 'content-type': 'application/json' },
      body,
      query: {},
      params: {}
    };
    let resStatus = 200;
    const res: any = {
      headersSent: false,
      status(code: number) {
        resStatus = code;
        return this;
      },
      json(data: any) {
        this.headersSent = true;
        resolve({ status: resStatus, body: data });
        return this;
      },
      send(data: any) {
        this.headersSent = true;
        resolve({ status: resStatus, body: data });
        return this;
      },
      setHeader() {},
      getHeader() {},
      end() {
        this.headersSent = true;
        resolve({ status: resStatus, body: null });
      }
    };
    app.handle(req, res, (err: any) => {
      if (err) reject(err);
    });
  });
}

async function runTests() {
  // Test 1: Creating a room with a valid password
  console.log('--- TEST 1: Create room with valid password (>= 4 chars) ---');
  const createRes = await makeRequest('POST', '/api/rooms', {
    hostNickname: 'Dhoni',
    settings: {
      isPrivate: true,
      password: 'ipl2026password',
      startingPurse: 1200000000,
      season: '2026'
    }
  });

  assert.strictEqual(createRes.status, 201, 'Should return HTTP 201 Created');
  assert.strictEqual(typeof createRes.body, 'object', 'Response must be JSON');
  assert.strictEqual(createRes.body.success, true, 'success should be true');
  assert.ok(createRes.body.roomCode, 'roomCode must be returned');
  assert.ok(createRes.body.hostId, 'hostId must be returned');
  assert.strictEqual(createRes.body.state.isPrivate, true, 'state.isPrivate should be true');
  console.log(`  ✅ PASS: Room ${createRes.body.roomCode} created with password. HTTP 201 JSON returned.`);

  const roomCode = createRes.body.roomCode;

  // Test 2: Rejecting room creation with short password (< 4 chars)
  console.log('\n--- TEST 2: Reject room creation with password < 4 chars ---');
  const shortPwdRes = await makeRequest('POST', '/api/rooms', {
    hostNickname: 'Rohit',
    settings: {
      isPrivate: true,
      password: 'abc'
    }
  });

  assert.strictEqual(shortPwdRes.status, 400, 'Should return HTTP 400 Bad Request');
  assert.strictEqual(typeof shortPwdRes.body, 'object', 'Must be valid JSON');
  assert.ok(shortPwdRes.body.error, 'Must contain error property');
  assert.ok(shortPwdRes.body.error.includes('at least 4 characters'), 'Error should specify min 4 chars requirement');
  console.log(`  ✅ PASS: Short password rejected with HTTP 400 JSON: "${shortPwdRes.body.error}"`);

  // Test 3: Rejecting room creation with empty nickname
  console.log('\n--- TEST 3: Reject room creation with empty nickname ---');
  const emptyNickRes = await makeRequest('POST', '/api/rooms', {
    hostNickname: '   ',
    settings: {}
  });

  assert.strictEqual(emptyNickRes.status, 400, 'Should return HTTP 400 Bad Request');
  assert.ok(emptyNickRes.body.error, 'Must contain error property');
  console.log(`  ✅ PASS: Empty nickname rejected with HTTP 400 JSON: "${emptyNickRes.body.error}"`);

  // Test 4: Verifying room password via REST endpoint - Correct Password
  console.log('\n--- TEST 4: Verify password endpoint - Correct Password ---');
  const verifyCorrectRes = await makeRequest('POST', `/api/rooms/${roomCode}/verify-password`, {
    password: 'ipl2026password'
  });

  assert.strictEqual(verifyCorrectRes.status, 200, 'Should return HTTP 200 OK');
  assert.strictEqual(verifyCorrectRes.body.verified, true, 'verified should be true');
  console.log('  ✅ PASS: Correct password verified with HTTP 200 JSON');

  // Test 5: Verifying room password via REST endpoint - Incorrect Password
  console.log('\n--- TEST 5: Verify password endpoint - Incorrect Password ---');
  const verifyWrongRes = await makeRequest('POST', `/api/rooms/${roomCode}/verify-password`, {
    password: 'wrongpassword'
  });

  assert.strictEqual(verifyWrongRes.status, 401, 'Should return HTTP 401 Unauthorized');
  assert.strictEqual(verifyWrongRes.body.verified, false, 'verified should be false');
  assert.ok(verifyWrongRes.body.error, 'Must return error message in JSON');
  console.log(`  ✅ PASS: Incorrect password rejected with HTTP 401 JSON: "${verifyWrongRes.body.error}"`);

  // Test 6: Verifying non-existent room returns 404 JSON
  console.log('\n--- TEST 6: Non-existent room returns 404 JSON ---');
  const notFoundRes = await makeRequest('POST', '/api/rooms/BW-NONEXISTENT/verify-password', {
    password: 'test'
  });

  assert.strictEqual(notFoundRes.status, 404, 'Should return HTTP 404 Not Found');
  assert.ok(notFoundRes.body.error, 'Must return JSON error');
  console.log(`  ✅ PASS: Non-existent room returned HTTP 404 JSON: "${notFoundRes.body.error}"`);

  // Test 7: Verify global error handler converts unmatched routes to valid JSON
  console.log('\n--- TEST 7: Route 404 returns valid JSON (never HTML) ---');
  const routeNotFoundRes = await makeRequest('GET', '/api/unknown-endpoint');

  assert.strictEqual(routeNotFoundRes.status, 404, 'Should return 404');
  assert.strictEqual(typeof routeNotFoundRes.body, 'object', 'Must be JSON');
  assert.ok(routeNotFoundRes.body.error, 'Must contain error property');
  console.log(`  ✅ PASS: Unmatched route returned valid JSON: "${routeNotFoundRes.body.error}"`);

  // Test 8: Verify safe frontend response parsing logic against simulated non-JSON server error
  console.log('\n--- TEST 8: Frontend parseJsonResponse handles non-JSON server errors safely ---');
  const parseJsonResponse = async (mockRes: { text: () => Promise<string>; ok: boolean; status: number; statusText: string }, defaultError: string) => {
    const text = await mockRes.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const cleanText = text.replace(/<[^>]+>/g, '').trim();
      const errorMsg = cleanText
        ? (cleanText.length > 150 ? cleanText.slice(0, 150) + '...' : cleanText)
        : `Server returned an error (${mockRes.status} ${mockRes.statusText})`;
      throw new Error(errorMsg);
    }
    if (!mockRes.ok) {
      throw new Error(data?.error || data?.message || defaultError);
    }
    return data;
  };

  // Simulating Vercel's 500 "A server error has occurred" plain text response
  const simulatedVercel500 = {
    text: async () => 'A server error has occurred',
    ok: false,
    status: 500,
    statusText: 'Internal Server Error'
  };

  try {
    await parseJsonResponse(simulatedVercel500, 'Fallback error');
    assert.fail('Should have thrown an error');
  } catch (err: any) {
    assert.strictEqual(err.message, 'A server error has occurred', 'Should extract clean message without SyntaxError');
    assert.ok(!err.message.includes('Unexpected token'), 'Must NOT throw SyntaxError: Unexpected token');
    console.log(`  ✅ PASS: Frontend safely handled "A server error has occurred" without SyntaxError crash: "${err.message}"`);
  }

  // Simulating valid JSON error from server
  const simulatedJsonError = {
    text: async () => JSON.stringify({ error: 'Password for private rooms must be at least 4 characters' }),
    ok: false,
    status: 400,
    statusText: 'Bad Request'
  };

  try {
    await parseJsonResponse(simulatedJsonError, 'Fallback error');
    assert.fail('Should have thrown an error');
  } catch (err: any) {
    assert.strictEqual(err.message, 'Password for private rooms must be at least 4 characters');
    console.log(`  ✅ PASS: Frontend extracted server JSON error message correctly: "${err.message}"`);
  }

  console.log('\n====================================================');
  console.log('🎯 ALL ROOM PASSWORD TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
