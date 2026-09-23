const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) { json = body; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: res.headers['set-cookie'],
          data: json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function getCookieValue(cookies, name) {
  if (!cookies) return null;
  for (const c of cookies) {
    const parts = c.split(';')[0].split('=');
    if (parts[0].trim() === name) return parts[1].trim();
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== STARTING BACKEND COMPLIANCE & SECURITY TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const testEmail = `test.${Date.now()}@example.com`;
  const testMobile = `+91 ${Math.floor(9000000000 + Math.random() * 1000000000)}`;

  console.log('1. Testing Registration Validation & Challenge ID:');
  const regMissing = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'test@example.com' });
  assert(regMissing.status === 400 && regMissing.data.success === false, 'Rejects missing required fields with 400');

  const regWeakPwd = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { fullName: 'Priya Sharma', email: testEmail, mobile: testMobile, password: 'weak' });
  assert(regWeakPwd.status === 400 && regWeakPwd.data.success === false, 'Rejects weak password with 400');

  const regSuccess = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { fullName: 'Priya Sharma', email: testEmail, mobile: testMobile, password: 'Password@123' });

  assert(regSuccess.status === 201 && regSuccess.data.success === true, 'Registers user successfully with 201');
  assert(regSuccess.data.userId && typeof regSuccess.data.userId === 'string', 'Returns userId in response');
  assert(regSuccess.data.challengeId && typeof regSuccess.data.challengeId === 'string', 'Returns email OTP challengeId in response');
  assert(!regSuccess.data.user.password && !regSuccess.data.user.passwordHash, 'Password and hash are NEVER returned');
  assert(!regSuccess.data.otp, 'OTP is NEVER returned in response');

  const regEmailChallengeId = regSuccess.data.challengeId;

  console.log('\n2. Testing Duplicate Registration:');
  const regDup = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { fullName: 'Priya Sharma', email: testEmail, mobile: testMobile, password: 'Password@123' });
  assert(regDup.status === 409 && regDup.data.success === false, 'Rejects duplicate email with 409');

  console.log('\n3. Testing Test-Only OTP Retrieval (Development Mode):');
  const testOtpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/test/otp/${regEmailChallengeId}`,
    method: 'GET'
  });
  assert(testOtpRes.status === 200 && testOtpRes.data.success === true, 'Retrieves OTP via test endpoint in dev mode');
  assert(testOtpRes.data.otp && testOtpRes.data.otp.length === 6, 'Retrieved OTP is exactly 6 digits');
  assert(!testOtpRes.data.hashedOtp, 'OTP hash is NEVER exposed in test endpoint');

  const nonExistentTestOtp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/test/otp/invalid_challenge_id',
    method: 'GET'
  });
  assert(nonExistentTestOtp.status === 404, 'Rejects non-existent challengeId with 404');

  console.log('\n4. Testing Email OTP Verification using Challenge ID:');
  const wrongEmailOtp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/verify-email-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId: regEmailChallengeId, otp: '000000' });
  assert(wrongEmailOtp.status === 400 && wrongEmailOtp.data.success === false, 'Rejects wrong OTP with 400');
  assert(wrongEmailOtp.data.attemptsLeft === 2, 'Decrements attempts left to 2');

  const validEmailOtp = testOtpRes.data.otp;
  const correctEmailOtp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/verify-email-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId: regEmailChallengeId, otp: validEmailOtp });
  assert(correctEmailOtp.status === 200 && correctEmailOtp.data.success === true, 'Verifies email OTP using challengeId');

  console.log('\n5. Testing SMS OTP Challenge & Verification using Challenge ID:');
  const sendSms = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/send-sms-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { mobile: testMobile });
  assert(sendSms.status === 200 && sendSms.data.success === true, 'Generates SMS OTP challenge');
  assert(sendSms.data.challengeId && typeof sendSms.data.challengeId === 'string', 'Returns SMS challengeId');
  assert(!sendSms.data.otp, 'SMS OTP is NEVER returned in response');

  const smsChallengeId = sendSms.data.challengeId;
  const testSmsOtpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/test/otp/${smsChallengeId}`,
    method: 'GET'
  });
  assert(testSmsOtpRes.status === 200 && testSmsOtpRes.data.otp, 'Retrieves SMS OTP via test endpoint');

  const correctSmsOtp = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/verify-sms-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId: smsChallengeId, otp: testSmsOtpRes.data.otp });
  assert(correctSmsOtp.status === 200 && correctSmsOtp.data.success === true, 'Verifies SMS OTP using challengeId');

  console.log('\n6. Testing MFA Setup & User State:');
  const mfaSetup = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/setup-mfa',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, mfaMethod: 'email' });
  assert(mfaSetup.status === 200 && mfaSetup.data.success === true, 'Configures MFA method');

  console.log('\n7. Testing Failed Login Tracking & Temporary Lockout:');
  const fail1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'WrongPassword1' });
  assert(fail1.status === 401 && fail1.data.success === false, 'First failed login returns 401');

  const fail2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'WrongPassword2' });
  assert(fail2.status === 401 && fail2.data.success === false, 'Second failed login returns 401');

  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'WrongPassword3' });

  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'WrongPassword4' });

  const fail5 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-lockout-ms': '500' }
  }, { email: testEmail, password: 'WrongPassword5' });
  assert(fail5.status === 423 && fail5.data.locked === true, 'Fifth consecutive failure locks account with 423');

  const lockedAttempt = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'Password@123' });
  assert(lockedAttempt.status === 423 && lockedAttempt.data.locked === true, 'Login rejected while account is locked even with correct password');

  console.log('  Waiting for lock expiration (500ms test duration)...');
  await sleep(600);

  const loginAfterLock = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'Password@123' });
  assert(loginAfterLock.status === 200 && loginAfterLock.data.success === true, 'Login succeeds after lock expiry with correct credentials');
  assert(loginAfterLock.data.requireMfa === true, 'Login requires MFA');
  assert(loginAfterLock.data.challengeId && typeof loginAfterLock.data.challengeId === 'string', 'Login returns MFA challengeId');

  console.log('\n8. Testing Login MFA Verification using Challenge ID:');
  const loginChallengeId = loginAfterLock.data.challengeId;
  const testLoginOtpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/test/otp/${loginChallengeId}`,
    method: 'GET'
  });
  assert(testLoginOtpRes.status === 200 && testLoginOtpRes.data.otp, 'Retrieves login MFA OTP via test endpoint');

  const loginAuthSuccess = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/verify-login-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId: loginChallengeId, otp: testLoginOtpRes.data.otp });

  assert(loginAuthSuccess.status === 200 && loginAuthSuccess.data.success === true, 'Verifies login MFA successfully with challengeId');
  const sessionCookieHeader = loginAuthSuccess.headers['set-cookie'];
  assert(sessionCookieHeader && sessionCookieHeader[0].includes('secureid_session'), 'Issues secureid_session cookie');
  assert(sessionCookieHeader[0].includes('HttpOnly'), 'Cookie includes HttpOnly attribute');
  assert(sessionCookieHeader[0].includes('SameSite=Lax'), 'Cookie includes SameSite attribute');

  const sessionId = getCookieValue(sessionCookieHeader, 'secureid_session');

  console.log('\n9. Testing GET /api/me & Final User State:');
  const meUnauthorized = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/me',
    method: 'GET'
  });
  assert(meUnauthorized.status === 401 && meUnauthorized.data.success === false, 'Rejects unauthenticated request with 401');

  const meAuthorized = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/me',
    method: 'GET',
    headers: { 'Cookie': `secureid_session=${sessionId}` }
  });
  assert(meAuthorized.status === 200 && meAuthorized.data.success === true, 'Returns user profile with valid session');
  assert(meAuthorized.data.user.email === testEmail, 'Returns correct user email');
  assert(meAuthorized.data.user.emailVerified === true, 'emailVerified is true');
  assert(meAuthorized.data.user.mobileVerified === true, 'mobileVerified is true');
  assert(meAuthorized.data.user.mfaEnabled === true, 'mfaEnabled is true');
  assert(!meAuthorized.data.user.password && !meAuthorized.data.user.passwordHash, 'Password/hash NEVER exposed in /me');

  console.log('\n10. Testing JWT Generation & Verification:');
  const tokenNoSession = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/token',
    method: 'POST'
  });
  assert(tokenNoSession.status === 401, 'Rejects token request without session');

  const tokenWithSession = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/token',
    method: 'POST',
    headers: { 'Cookie': `secureid_session=${sessionId}` }
  });
  assert(tokenWithSession.status === 200 && tokenWithSession.data.token, 'Generates valid JWT token from session');
  const jwtToken = tokenWithSession.data.token;

  console.log('\n11. Testing Protected Endpoint with JWT:');
  const protectedNoToken = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/protected',
    method: 'GET'
  });
  assert(protectedNoToken.status === 401, 'Rejects request without Authorization header');

  const protectedBadToken = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/protected',
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid.token.here' }
  });
  assert(protectedBadToken.status === 401, 'Rejects request with invalid JWT');

  const protectedValid = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/protected',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  assert(protectedValid.status === 200 && protectedValid.data.success === true, 'Grants access to protected endpoint with valid JWT');
  assert(protectedValid.data.user.email === testEmail, 'Returns safe user payload from JWT');

  console.log('\n12. Testing Logout:');
  const logoutRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/logout',
    method: 'POST',
    headers: { 'Cookie': `secureid_session=${sessionId}` }
  });
  assert(logoutRes.status === 200 && logoutRes.data.success === true, 'Logs out successfully with 200');

  const meAfterLogout = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/me',
    method: 'GET',
    headers: { 'Cookie': `secureid_session=${sessionId}` }
  });
  assert(meAfterLogout.status === 401, 'GET /api/me returns 401 after session invalidation');

  console.log('\n13. Testing Production Mode Disables Test-Only OTP Retrieval:');
  const prodOtpTest = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/test/otp/${regEmailChallengeId}`,
    method: 'GET',
    headers: { 'x-test-env': 'production' }
  });
  assert(prodOtpTest.status === 403 && prodOtpTest.data.success === false, 'Rejects test OTP endpoint in production mode with 403');

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
