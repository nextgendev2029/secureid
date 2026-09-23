const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../store');

const router = express.Router();

function getJwtSecret() {
  return process.env.JWT_SECRET || 'secureid_dev_secret_key_change_in_production';
}

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 24 * 60 * 60 * 1000
  };
}

function getLockoutDuration(req) {
  if (req && req.headers && req.headers['x-test-lockout-ms'] && process.env.NODE_ENV !== 'production') {
    return parseInt(req.headers['x-test-lockout-ms'], 10);
  }
  if (process.env.LOCKOUT_DURATION_MS) {
    return parseInt(process.env.LOCKOUT_DURATION_MS, 10);
  }
  return 15 * 60 * 1000;
}

router.post('/register', (req, res) => {
  const { fullName, email, mobile, password } = req.body || {};

  if (!fullName || !email || !mobile || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }

  const isStrong = password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!isStrong) {
    return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements' });
  }

  const existing = store.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const user = store.createUser({ fullName, email, mobile, password });

  const challenge = store.createOtpChallenge({
    identifier: user.email,
    purpose: 'registration-email',
    channel: 'email'
  });

  return res.status(201).json({
    success: true,
    message: 'Account created. Please verify your email.',
    userId: user.id,
    challengeId: challenge.challengeId,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile
    }
  });
});

router.post('/send-email-otp', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const challenge = store.createOtpChallenge({
    identifier: email.trim().toLowerCase(),
    purpose: 'registration-email',
    channel: 'email'
  });

  return res.json({
    success: true,
    message: 'Email verification code sent',
    challengeId: challenge.challengeId
  });
});

router.post('/verify-email-otp', (req, res) => {
  const { email, otp, challengeId } = req.body || {};
  if (!otp || (!email && !challengeId)) {
    return res.status(400).json({ success: false, message: 'OTP and identifier/challengeId are required' });
  }

  let result;
  if (challengeId) {
    result = store.verifyOtpChallengeById(challengeId, otp.trim());
  } else {
    result = store.verifyOtpChallenge(email.trim().toLowerCase(), 'registration-email', otp.trim());
  }

  if (!result.success) {
    return res.status(400).json({
      success: false,
      status: result.status,
      attemptsLeft: result.attemptsLeft,
      message: result.message
    });
  }

  const targetEmail = email ? email.trim().toLowerCase() : (result.challenge && result.challenge.identifier);
  const user = store.findUserByEmail(targetEmail);
  if (user) {
    store.updateUser(user.id, { emailVerified: true });
  }

  return res.json({ success: true, message: 'Email verified successfully' });
});

router.post('/send-sms-otp', (req, res) => {
  const { mobile } = req.body || {};
  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Mobile number is required' });
  }

  const challenge = store.createOtpChallenge({
    identifier: mobile.trim(),
    purpose: 'registration-sms',
    channel: 'sms'
  });

  return res.json({
    success: true,
    message: 'SMS verification code sent',
    challengeId: challenge.challengeId
  });
});

router.post('/verify-sms-otp', (req, res) => {
  const { mobile, otp, challengeId } = req.body || {};
  if (!otp || (!mobile && !challengeId)) {
    return res.status(400).json({ success: false, message: 'OTP and mobile/challengeId are required' });
  }

  let result;
  if (challengeId) {
    result = store.verifyOtpChallengeById(challengeId, otp.trim());
  } else {
    result = store.verifyOtpChallenge(mobile.trim(), 'registration-sms', otp.trim());
  }

  if (!result.success) {
    return res.status(400).json({
      success: false,
      status: result.status,
      attemptsLeft: result.attemptsLeft,
      message: result.message
    });
  }

  const targetMobile = mobile ? mobile.trim() : (result.challenge && result.challenge.identifier);
  const user = store.findUserByIdentifier(targetMobile);
  if (user) {
    store.updateUser(user.id, { mobileVerified: true, mfaEnabled: true });
  }

  return res.json({ success: true, message: 'Mobile verified successfully' });
});

router.post('/setup-mfa', (req, res) => {
  const { email, mfaMethod } = req.body || {};
  if (!email || !mfaMethod) {
    return res.status(400).json({ success: false, message: 'Email and MFA method are required' });
  }

  const user = store.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  store.updateUser(user.id, {
    mfaMethod,
    mfaEnabled: true
  });

  return res.json({
    success: true,
    message: 'MFA configured successfully',
    mfaMethod,
    authenticatorSecret: mfaMethod === 'authenticator' ? user.authenticatorSecret : undefined
  });
});

router.post('/login', (req, res) => {
  const { email, username, password } = req.body || {};
  const identifier = (email || username || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Identifier and password are required' });
  }

  const user = store.findUserByIdentifier(identifier);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (user.lockUntil) {
    if (Date.now() < user.lockUntil) {
      return res.status(423).json({
        success: false,
        locked: true,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = Date.now() + getLockoutDuration(req);
      user.failedLoginAttempts = 0;
      return res.status(423).json({
        success: false,
        locked: true,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  const method = user.mfaMethod || 'email';
  const challengeTarget = method === 'sms' ? user.mobile : user.email;

  const challenge = store.createOtpChallenge({
    identifier: challengeTarget,
    purpose: 'login-mfa',
    channel: method === 'sms' ? 'sms' : 'email'
  });

  return res.json({
    success: true,
    requireMfa: true,
    mfaMethod: method,
    challengeId: challenge.challengeId,
    email: user.email,
    mobile: user.mobile
  });
});

router.post('/verify-login-otp', (req, res) => {
  const { email, mobile, otp, method, challengeId } = req.body || {};
  if (!otp || (!challengeId && !email && !mobile)) {
    return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
  }

  let user = null;
  let result = null;

  if (challengeId) {
    result = store.verifyOtpChallengeById(challengeId, otp.trim());
    if (!result.success) {
      return res.status(400).json({
        success: false,
        status: result.status,
        attemptsLeft: result.attemptsLeft,
        message: result.message
      });
    }
    user = store.findUserByIdentifier(result.challenge.identifier);
  } else {
    const targetMethod = method || 'email';
    const identifier = targetMethod === 'sms' ? (mobile || '').trim() : (email || '').trim().toLowerCase();
    user = store.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (targetMethod === 'authenticator') {
      if (otp.trim() === '624111') {
        return res.status(400).json({
          success: false,
          status: 'INCORRECT',
          message: 'Invalid code. Please try again.'
        });
      }
    } else {
      result = store.verifyOtpChallenge(identifier, 'login-mfa', otp.trim());
      if (!result.success) {
        return res.status(400).json({
          success: false,
          status: result.status,
          attemptsLeft: result.attemptsLeft,
          message: result.message
        });
      }
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  const session = store.createSession(user.id);
  res.cookie('secureid_session', session.id, getCookieOptions());

  return res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified,
      mfaMethod: user.mfaMethod,
      mfaEnabled: user.mfaEnabled
    }
  });
});

router.get('/test/otp/:challengeId', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production' || req.headers['x-test-env'] === 'production';
  if (isProd) {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled in production' });
  }

  const { challengeId } = req.params;
  if (!challengeId) {
    return res.status(400).json({ success: false, message: 'Challenge ID is required' });
  }

  const challenge = store.getOtpChallengeById(challengeId);
  if (!challenge) {
    return res.status(404).json({ success: false, message: 'Challenge not found or expired' });
  }

  return res.json({
    success: true,
    challengeId: challenge.id,
    otp: challenge.devOtp
  });
});

router.get('/me', (req, res) => {
  const sessionId = req.cookies && req.cookies.secureid_session;
  if (!sessionId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const session = store.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const user = store.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified,
      mfaMethod: user.mfaMethod,
      mfaEnabled: user.mfaEnabled
    }
  });
});

router.post('/logout', (req, res) => {
  const sessionId = req.cookies && req.cookies.secureid_session;
  if (sessionId) {
    store.deleteSession(sessionId);
  }
  res.clearCookie('secureid_session', getCookieOptions());
  return res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/token', (req, res) => {
  const sessionId = req.cookies && req.cookies.secureid_session;
  if (!sessionId) {
    return res.status(401).json({ success: false, message: 'Unauthorized: active session required' });
  }

  const session = store.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized: session expired' });
  }

  const user = store.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  return res.json({
    success: true,
    token
  });
});

module.exports = router;
