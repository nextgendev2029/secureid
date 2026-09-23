const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const users = [];
const otpChallenges = [];
const sessions = [];

function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return users.find(u => u.email.toLowerCase() === normalized) || null;
}

function findUserById(id) {
  if (!id) return null;
  return users.find(u => u.id === id) || null;
}

function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const normalized = identifier.trim().toLowerCase();
  return users.find(u => u.email.toLowerCase() === normalized || u.mobile === identifier) || null;
}

function createUser({ fullName, email, mobile, password }) {
  const id = 'usr_' + crypto.randomBytes(8).toString('hex');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const user = {
    id,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    mobile: mobile.trim(),
    passwordHash,
    emailVerified: false,
    mobileVerified: false,
    mfaMethod: 'email',
    mfaEnabled: false,
    authenticatorSecret: crypto.randomBytes(16).toString('hex'),
    failedLoginAttempts: 0,
    lockUntil: null,
    createdAt: new Date()
  };

  users.push(user);
  return user;
}

function updateUser(id, updates) {
  const user = findUserById(id);
  if (!user) return null;
  Object.assign(user, updates);
  return user;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createOtpChallenge({ identifier, purpose, channel = 'email', ttlMs = 165000, maxAttempts = 3 }) {
  const existingIdx = otpChallenges.findIndex(c => c.identifier === identifier && c.purpose === purpose && !c.verified);
  if (existingIdx !== -1) {
    otpChallenges.splice(existingIdx, 1);
  }

  const otp = generateOtp();
  const salt = bcrypt.genSaltSync(8);
  const hashedOtp = bcrypt.hashSync(otp, salt);

  const challenge = {
    id: 'ch_' + crypto.randomBytes(8).toString('hex'),
    identifier,
    purpose,
    channel,
    hashedOtp,
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    maxAttempts,
    verified: false,
    createdAt: Date.now()
  };

  otpChallenges.push(challenge);

  if (channel === 'email') {
    console.log(`[DEV OTP] Email OTP for ${identifier}: ${otp}`);
  } else if (channel === 'sms') {
    console.log(`[DEV OTP] SMS OTP for ${identifier}: ${otp}`);
  } else {
    console.log(`[DEV OTP] MFA OTP for ${identifier}: ${otp}`);
  }

  return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
}

function getOtpChallenge(identifier, purpose) {
  return otpChallenges.find(c => c.identifier === identifier && c.purpose === purpose && !c.verified) || null;
}

function getOtpChallengeById(challengeId) {
  if (!challengeId) return null;
  return otpChallenges.find(c => c.id === challengeId && !c.verified) || null;
}

function verifyOtpChallenge(identifier, purpose, plainOtp) {
  const challenge = getOtpChallenge(identifier, purpose);
  if (!challenge) {
    return { success: false, status: 'NOT_FOUND', message: 'No active OTP challenge found. Please request a new code.' };
  }

  if (Date.now() > challenge.expiresAt) {
    challenge.verified = true;
    return { success: false, status: 'EXPIRED', message: 'This code has expired. Please request a new code.' };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challenge.verified = true;
    return { success: false, status: 'MAX_ATTEMPTS', message: 'Maximum attempts reached. Please request a new code.' };
  }

  const isValid = bcrypt.compareSync(plainOtp, challenge.hashedOtp);

  if (!isValid) {
    challenge.attempts++;
    const attemptsLeft = challenge.maxAttempts - challenge.attempts;
    if (attemptsLeft <= 0) {
      challenge.verified = true;
      return { success: false, status: 'MAX_ATTEMPTS', attemptsLeft: 0, message: 'Maximum attempts reached. Please request a new code.' };
    }
    return { success: false, status: 'INCORRECT', attemptsLeft, message: `Incorrect code. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.` };
  }

  challenge.verified = true;
  return { success: true, status: 'VERIFIED', challenge, message: 'Code verified successfully.' };
}

function verifyOtpChallengeById(challengeId, plainOtp) {
  const challenge = getOtpChallengeById(challengeId);
  if (!challenge) {
    return { success: false, status: 'NOT_FOUND', message: 'No active OTP challenge found. Please request a new code.' };
  }

  if (Date.now() > challenge.expiresAt) {
    challenge.verified = true;
    return { success: false, status: 'EXPIRED', message: 'This code has expired. Please request a new code.' };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challenge.verified = true;
    return { success: false, status: 'MAX_ATTEMPTS', message: 'Maximum attempts reached. Please request a new code.' };
  }

  const isValid = bcrypt.compareSync(plainOtp, challenge.hashedOtp);

  if (!isValid) {
    challenge.attempts++;
    const attemptsLeft = challenge.maxAttempts - challenge.attempts;
    if (attemptsLeft <= 0) {
      challenge.verified = true;
      return { success: false, status: 'MAX_ATTEMPTS', attemptsLeft: 0, message: 'Maximum attempts reached. Please request a new code.' };
    }
    return { success: false, status: 'INCORRECT', attemptsLeft, message: `Incorrect code. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.` };
  }

  challenge.verified = true;
  return { success: true, status: 'VERIFIED', challenge, message: 'Code verified successfully.' };
}

function invalidateOtpChallenge(identifier, purpose) {
  const challenge = getOtpChallenge(identifier, purpose);
  if (challenge) {
    challenge.verified = true;
  }
}

function createSession(userId, ttlMs = 24 * 60 * 60 * 1000) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const session = {
    id: sessionId,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs
  };
  sessions.push(session);
  return session;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    deleteSession(sessionId);
    return null;
  }
  return session;
}

function deleteSession(sessionId) {
  if (!sessionId) return;
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions.splice(idx, 1);
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  createUser,
  updateUser,
  createOtpChallenge,
  getOtpChallenge,
  getOtpChallengeById,
  verifyOtpChallenge,
  verifyOtpChallengeById,
  invalidateOtpChallenge,
  createSession,
  getSession,
  deleteSession
};
