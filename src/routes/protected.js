const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../store');

const router = express.Router();

function getJwtSecret() {
  return process.env.JWT_SECRET || 'secureid_dev_secret_key_change_in_production';
}

router.get('/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = store.findUserById(decoded.id);

    return res.json({
      success: true,
      message: 'Access granted to protected endpoint',
      user: {
        id: decoded.id,
        email: decoded.email,
        fullName: user ? user.fullName : undefined
      }
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid or expired token' });
  }
});

module.exports = router;
