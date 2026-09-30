const regForm = document.getElementById('reg-form');
const regPassword = document.getElementById('reg-password');
const regTerms = document.getElementById('reg-terms');
const regEmail = document.getElementById('reg-email');
const regMobile = document.getElementById('reg-mobile');
const regCountry = document.getElementById('reg-country');
const regDispEmail = document.getElementById('reg-disp-email');
const regDispMobile = document.getElementById('reg-disp-mobile');

const regCard = document.getElementById('reg-card');
const regStepper = document.getElementById('reg-stepper');
const regStepItems = document.querySelectorAll('#reg-stepper .step-item');
const regScreens = document.querySelectorAll('#journey-registration .screen-view');
const regStateBtns = document.querySelectorAll('[data-reg]');

const loginForm = document.getElementById('login-form');
const loginUser = document.getElementById('login-user');
const loginPassword = document.getElementById('login-password');
const loginTogglePwd = document.getElementById('login-toggle-pwd');
const loginEyeIcon = document.getElementById('login-eye-icon');
const loginUserErrIcon = document.getElementById('login-user-err-icon');
const loginCredError = document.getElementById('login-cred-error');
const loginShieldBadge = document.getElementById('login-shield-badge');
const loginScreens = document.querySelectorAll('#journey-login .screen-view');
const loginStateBtns = document.querySelectorAll('[data-login]');

const journeyReg = document.getElementById('journey-registration');
const journeyLogin = document.getElementById('journey-login');
const btnJourneyReg = document.getElementById('btn-journey-reg');
const btnJourneyLogin = document.getElementById('btn-journey-login');
const regStatesGroup = document.getElementById('reg-states-group');
const loginStatesGroup = document.getElementById('login-states-group');

const btnViewAuto = document.getElementById('btn-view-auto');
const btnViewMobile = document.getElementById('btn-view-mobile');

const btnToggleToolbar = document.getElementById('btn-toggle-toolbar');
const btnOpenToolbar = document.getElementById('btn-open-toolbar');
const demoToolbar = document.getElementById('demo-toolbar');

let currentEmailChallengeId = null;
let currentSmsChallengeId = null;
let currentLoginChallengeId = null;
let currentLoginMethod = 'email';
let currentLoginEmail = '';
let currentLoginMobile = '';

if (btnToggleToolbar && btnOpenToolbar && demoToolbar) {
  btnToggleToolbar.addEventListener('click', function() {
    demoToolbar.style.display = 'none';
    btnOpenToolbar.style.display = 'block';
  });
  btnOpenToolbar.addEventListener('click', function() {
    demoToolbar.style.display = 'flex';
    btnOpenToolbar.style.display = 'none';
  });
}


loginTogglePwd.addEventListener('click', function() {
  if (loginPassword.type === 'password') {
    loginPassword.type = 'text';
    loginEyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    loginPassword.type = 'password';
    loginEyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
});

function setupOtpInputs(containerId, onComplete) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.otpInitialized) return;
  container.dataset.otpInitialized = 'true';
  const boxes = container.querySelectorAll('.otp-box');

  boxes.forEach((box, index) => {
    box.addEventListener('focus', function() {
      this.select();
    });

    box.addEventListener('keydown', function(e) {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this.value = e.key;
        this.classList.remove('error');
        if (index < boxes.length - 1) {
          boxes[index + 1].focus();
          boxes[index + 1].select();
        } else {
          this.blur();
          const code = Array.from(boxes).map(b => b.value).join('');
          if (code.length === boxes.length && onComplete) {
            onComplete(code);
          }
        }
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        this.classList.remove('error');
        if (this.value !== '') {
          this.value = '';
        } else if (index > 0) {
          boxes[index - 1].value = '';
          boxes[index - 1].classList.remove('error');
          boxes[index - 1].focus();
          boxes[index - 1].select();
        }
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        this.value = '';
        this.classList.remove('error');
        return;
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        boxes[index - 1].focus();
        boxes[index - 1].select();
        return;
      }

      if (e.key === 'ArrowRight' && index < boxes.length - 1) {
        e.preventDefault();
        boxes[index + 1].focus();
        boxes[index + 1].select();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const code = Array.from(boxes).map(b => b.value).join('');
        if (code.length === boxes.length && onComplete) {
          onComplete(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    });

    box.addEventListener('input', function() {
      const digits = this.value.replace(/[^0-9]/g, '');
      this.value = digits.slice(-1);
      if (this.value) {
        this.classList.remove('error');
        if (index < boxes.length - 1) {
          boxes[index + 1].focus();
          boxes[index + 1].select();
        } else {
          this.blur();
          const code = Array.from(boxes).map(b => b.value).join('');
          if (code.length === boxes.length && onComplete) {
            onComplete(code);
          }
        }
      }
    });

    box.addEventListener('paste', function(e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = text.replace(/[^0-9]/g, '');
      if (!digits) return;
      const start = digits.length >= boxes.length ? 0 : index;
      for (let i = 0; i < boxes.length; i++) {
        if (i >= start && (i - start) < digits.length) {
          boxes[i].value = digits[i - start];
          boxes[i].classList.remove('error');
        }
      }
      const nextIndex = Math.min(start + digits.length, boxes.length - 1);
      boxes[nextIndex].focus();
      boxes[nextIndex].select();
      const code = Array.from(boxes).map(b => b.value).join('');
      if (code.length === boxes.length && onComplete) {
        boxes[boxes.length - 1].blur();
        onComplete(code);
      }
    });
  });
}

function startCountdown(elementId, totalSeconds) {
  const display = document.getElementById(elementId);
  if (!display) return;
  let remaining = totalSeconds;

  function update() {
    const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
    const secs = String(remaining % 60).padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
    if (remaining > 0) {
      remaining--;
      setTimeout(update, 1000);
    }
  }
  update();
}

function setRegStepper(stepNumber) {
  regStepItems.forEach((item, index) => {
    const itemStep = index + 1;
    item.classList.remove('active', 'completed');
    if (itemStep < stepNumber) {
      item.classList.add('completed');
    } else if (itemStep === stepNumber) {
      item.classList.add('active');
    }
  });
}

function showRegScreen(screenId, isWide = false) {
  regScreens.forEach(screen => screen.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  if (isWide) {
    regCard.classList.add('wide-card');
  } else {
    regCard.classList.remove('wide-card');
  }
}

function showLoginScreen(screenId) {
  loginScreens.forEach(screen => screen.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function showRegState(stateKey) {
  regStateBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.reg === stateKey));

  if (stateKey === '1') {
    setRegStepper(1);
    showRegScreen('reg-screen-1', true);
  } else if (stateKey === '2') {
    setRegStepper(2);
    showRegScreen('reg-screen-email', false);
    document.getElementById('reg-email-badge').className = 'auth-icon-badge blue';
    document.getElementById('reg-email-error').style.display = 'none';
    document.getElementById('reg-email-active-section').style.display = 'block';
    document.getElementById('reg-email-expired-section').style.display = 'none';
    const boxes = document.querySelectorAll('#reg-email-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
    if (boxes[0]) boxes[0].focus();
  } else if (stateKey === '2a') {
    setRegStepper(2);
    showRegScreen('reg-screen-email', false);
    document.getElementById('reg-email-badge').className = 'auth-icon-badge red';
    document.getElementById('reg-email-error').style.display = 'block';
    document.getElementById('reg-email-attempts').textContent = '2';
    document.getElementById('reg-email-active-section').style.display = 'block';
    document.getElementById('reg-email-expired-section').style.display = 'none';
    document.getElementById('reg-email-timer').textContent = '01:15';
    const boxes = document.querySelectorAll('#reg-email-otp-boxes .otp-box');
    const demoValues = ['4', '8', '2', '9', '1', '0'];
    const hasValues = Array.from(boxes).some(b => b.value !== '');
    boxes.forEach((box, i) => {
      box.classList.add('error');
      if (!hasValues) {
        box.value = demoValues[i];
      }
    });
    if (boxes[boxes.length - 1]) {
      boxes[boxes.length - 1].focus();
      boxes[boxes.length - 1].select();
    }
  } else if (stateKey === '2b') {
    setRegStepper(2);
    showRegScreen('reg-screen-email', false);
    document.getElementById('reg-email-badge').className = 'auth-icon-badge red';
    document.getElementById('reg-email-error').style.display = 'none';
    document.getElementById('reg-email-active-section').style.display = 'none';
    document.getElementById('reg-email-expired-section').style.display = 'block';
    const boxes = document.querySelectorAll('#reg-email-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
  } else if (stateKey === '3') {
    setRegStepper(3);
    showRegScreen('reg-screen-mobile', false);
    document.getElementById('reg-mobile-badge').className = 'auth-icon-badge green';
    document.getElementById('reg-mobile-error').style.display = 'none';
    document.getElementById('reg-mobile-max-error').style.display = 'none';
    document.getElementById('reg-mobile-active-section').style.display = 'block';
    document.getElementById('reg-mobile-max-section').style.display = 'none';
    const boxes = document.querySelectorAll('#reg-mobile-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
    if (boxes[0]) boxes[0].focus();
  } else if (stateKey === '3a') {
    setRegStepper(3);
    showRegScreen('reg-screen-mobile', false);
    document.getElementById('reg-mobile-badge').className = 'auth-icon-badge red';
    document.getElementById('reg-mobile-error').style.display = 'block';
    document.getElementById('reg-mobile-attempts').textContent = '1';
    document.getElementById('reg-mobile-max-error').style.display = 'none';
    document.getElementById('reg-mobile-active-section').style.display = 'block';
    document.getElementById('reg-mobile-max-section').style.display = 'none';
    document.getElementById('reg-mobile-timer').textContent = '01:02';
    const boxes = document.querySelectorAll('#reg-mobile-otp-boxes .otp-box');
    const demoValues = ['1', '2', '3', '4', '5', '6'];
    const hasValues = Array.from(boxes).some(b => b.value !== '');
    boxes.forEach((box, i) => {
      box.classList.add('error');
      if (!hasValues) {
        box.value = demoValues[i];
      }
    });
    if (boxes[boxes.length - 1]) {
      boxes[boxes.length - 1].focus();
      boxes[boxes.length - 1].select();
    }
  } else if (stateKey === '3b') {
    setRegStepper(3);
    showRegScreen('reg-screen-mobile', false);
    document.getElementById('reg-mobile-badge').className = 'auth-icon-badge red';
    document.getElementById('reg-mobile-error').style.display = 'none';
    document.getElementById('reg-mobile-max-error').style.display = 'block';
    document.getElementById('reg-mobile-active-section').style.display = 'none';
    document.getElementById('reg-mobile-max-section').style.display = 'block';
    const boxes = document.querySelectorAll('#reg-mobile-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
  } else if (stateKey === '4') {
    setRegStepper(4);
    showRegScreen('reg-screen-mfa-setup', false);
  } else if (stateKey === '5') {
    setRegStepper(4);
    showRegScreen('reg-screen-qr', false);
  } else if (stateKey === '6') {
    setRegStepper(4);
    showRegScreen('reg-screen-mfa-verify', false);
    document.getElementById('reg-mfa-badge').className = 'auth-icon-badge blue';
    document.getElementById('reg-mfa-error').style.display = 'none';
    const boxes = document.querySelectorAll('#reg-mfa-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
    if (boxes[0]) boxes[0].focus();
  } else if (stateKey === '6a') {
    setRegStepper(4);
    showRegScreen('reg-screen-mfa-verify', false);
    document.getElementById('reg-mfa-badge').className = 'auth-icon-badge red';
    document.getElementById('reg-mfa-error').style.display = 'block';
    document.getElementById('reg-mfa-timer').textContent = '00:10';
    const boxes = document.querySelectorAll('#reg-mfa-otp-boxes .otp-box');
    const demoValues = ['6', '2', '4', '1', '1', '1'];
    const hasValues = Array.from(boxes).some(b => b.value !== '');
    boxes.forEach((box, i) => {
      box.classList.add('error');
      if (!hasValues) {
        box.value = demoValues[i];
      }
    });
    if (boxes[boxes.length - 1]) {
      boxes[boxes.length - 1].focus();
      boxes[boxes.length - 1].select();
    }
  } else if (stateKey === '7') {
    setRegStepper(5);
    showRegScreen('reg-screen-success', false);
  }
}

function showLoginState(stateKey) {
  loginStateBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.login === stateKey));

  if (stateKey === '1') {
    showLoginScreen('login-screen-form');
    loginShieldBadge.className = 'auth-icon-badge blue';
    loginUser.classList.remove('input-error');
    loginPassword.classList.remove('input-error');
    loginUserErrIcon.style.display = 'none';
    loginCredError.classList.remove('visible');
  } else if (stateKey === '2') {
    showLoginScreen('login-screen-form');
    loginShieldBadge.className = 'auth-icon-badge red';
    loginUser.classList.add('input-error');
    loginPassword.classList.add('input-error');
    loginUserErrIcon.style.display = 'flex';
    loginCredError.classList.add('visible');
  } else if (stateKey === '3') {
    showLoginScreen('login-screen-method');
  } else if (stateKey === '4') {
    showLoginScreen('login-screen-otp');
    document.getElementById('login-otp-error').style.display = 'none';
    document.getElementById('login-otp-normal-section').style.display = 'block';
    document.getElementById('login-otp-expired-section').style.display = 'none';
    const boxes = document.querySelectorAll('#login-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
    if (boxes[0]) boxes[0].focus();
  } else if (stateKey === '5') {
    showLoginScreen('login-screen-otp');
    document.getElementById('login-otp-error').style.display = 'block';
    document.getElementById('login-otp-normal-section').style.display = 'block';
    document.getElementById('login-otp-expired-section').style.display = 'none';
    document.getElementById('login-timer').textContent = '02:12';
    const boxes = document.querySelectorAll('#login-otp-boxes .otp-box');
    const demoValues = ['4', '8', '2', '9', '1', '4'];
    const hasValues = Array.from(boxes).some(b => b.value !== '');
    boxes.forEach((box, i) => {
      box.classList.add('error');
      if (!hasValues) {
        box.value = demoValues[i];
      }
    });
    if (boxes[boxes.length - 1]) {
      boxes[boxes.length - 1].focus();
      boxes[boxes.length - 1].select();
    }
  } else if (stateKey === '6') {
    showLoginScreen('login-screen-otp');
    document.getElementById('login-otp-error').style.display = 'none';
    document.getElementById('login-otp-normal-section').style.display = 'none';
    document.getElementById('login-otp-expired-section').style.display = 'block';
    const boxes = document.querySelectorAll('#login-otp-boxes .otp-box');
    boxes.forEach(box => {
      box.classList.remove('error');
      box.value = '';
    });
  }
}

regStateBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    showRegState(this.dataset.reg);
  });
});

loginStateBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    showLoginState(this.dataset.login);
  });
});

function switchJourney(journey) {
  if (journey === 'registration') {
    journeyReg.classList.add('active-journey');
    journeyLogin.classList.remove('active-journey');
    btnJourneyReg.classList.add('active');
    btnJourneyLogin.classList.remove('active');
    regStatesGroup.style.display = 'flex';
    loginStatesGroup.style.display = 'none';
  } else {
    journeyReg.classList.remove('active-journey');
    journeyLogin.classList.add('active-journey');
    btnJourneyReg.classList.remove('active');
    btnJourneyLogin.classList.add('active');
    regStatesGroup.style.display = 'none';
    loginStatesGroup.style.display = 'flex';
  }
}

btnJourneyReg.addEventListener('click', () => switchJourney('registration'));
btnJourneyLogin.addEventListener('click', () => switchJourney('login'));

document.getElementById('reg-goto-login').addEventListener('click', function(e) {
  e.preventDefault();
  switchJourney('login');
  showLoginState('1');
});

document.getElementById('login-goto-register').addEventListener('click', function(e) {
  e.preventDefault();
  switchJourney('registration');
  showRegState('1');
});

btnViewAuto.addEventListener('click', function() {
  document.body.classList.remove('body-mobile-emulation');
  btnViewAuto.classList.add('active');
  btnViewMobile.classList.remove('active');
});

btnViewMobile.addEventListener('click', function() {
  document.body.classList.add('body-mobile-emulation');
  btnViewAuto.classList.remove('active');
  btnViewMobile.classList.add('active');
});

regForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const val = regPassword.value;
  if (!val) {
    alert('Password is required.');
    regPassword.focus();
    return;
  }

  if (!regTerms.checked) {
    alert('Please agree to the Terms & Conditions.');
    regTerms.focus();
    return;
  }

  const mobileVal = (regMobile.value || '').trim();
  const payload = {
    fullName: (document.getElementById('reg-name').value || '').trim(),
    email: (regEmail.value || '').trim(),
    mobile: mobileVal ? `${regCountry.value} ${mobileVal}` : '',
    password: val
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      regDispEmail.textContent = payload.email;
      regDispMobile.textContent = payload.mobile;
      currentEmailChallengeId = data.challengeId || null;
      showRegState('2');
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (err) {
    alert('Unable to connect to the server. Please check your connection and try again.');
  }
});

loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const userVal = loginUser.value.trim();
  const pwdVal = loginPassword.value.trim();

  if (userVal === '' || pwdVal === '') {
    showLoginState('2');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userVal, password: pwdVal })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentLoginChallengeId = data.challengeId || null;
      currentLoginMethod = data.mfaMethod || 'email';
      currentLoginEmail = data.email || userVal;
      currentLoginMobile = data.mobile || '';
      showLoginState('3');
    } else {
      showLoginState('2');
    }
  } catch (err) {
    showLoginState('2');
  }
});

setupOtpInputs('reg-email-otp-boxes', async function(code) {
  if (code === '482910') {
    showRegState('2a');
    return;
  }

  const email = (regEmail.value || 'priya.sharma@email.com').trim();
  try {
    const res = await fetch('/api/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: code, challengeId: currentEmailChallengeId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const mobile = `${regCountry.value} ${(regMobile.value || '98765 43210').trim()}`;
      const resSms = await fetch('/api/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });
      const smsData = await resSms.json();
      if (smsData && smsData.challengeId) {
        currentSmsChallengeId = smsData.challengeId;
      }
      showRegState('3');
    } else {
      if (data.status === 'EXPIRED') {
        showRegState('2b');
      } else if (data.status === 'MAX_ATTEMPTS') {
        showRegState('2b');
      } else if (data.status === 'INCORRECT') {
        showRegState('2a');
        if (data.attemptsLeft !== undefined) {
          document.getElementById('reg-email-attempts').textContent = data.attemptsLeft;
        }
      } else {
        alert(data.message || 'Invalid or expired code. Please request a new code.');
      }
    }
  } catch (err) {
    alert('Verification failed due to a network error. Please try again.');
  }
});

setupOtpInputs('reg-mobile-otp-boxes', async function(code) {
  if (code === '123456') {
    showRegState('3a');
    return;
  }

  const mobile = `${regCountry.value} ${(regMobile.value || '98765 43210').trim()}`;
  try {
    const res = await fetch('/api/verify-sms-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp: code, challengeId: currentSmsChallengeId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showRegState('7');
    } else {
      if (data.status === 'MAX_ATTEMPTS') {
        showRegState('3b');
      } else if (data.status === 'EXPIRED') {
        showRegState('3b');
      } else if (data.status === 'INCORRECT') {
        showRegState('3a');
        if (data.attemptsLeft !== undefined) {
          document.getElementById('reg-mobile-attempts').textContent = data.attemptsLeft;
        }
      } else {
        alert(data.message || 'Invalid or expired code. Please request a new code.');
      }
    }
  } catch (err) {
    alert('Verification failed due to a network error. Please try again.');
  }
});

setupOtpInputs('reg-mfa-otp-boxes', function(code) {
  if (code === '624111') {
    showRegState('6a');
  } else {
    showRegState('7');
  }
});

setupOtpInputs('login-otp-boxes', async function(code) {
  if (code === '482914') {
    showLoginState('5');
    return;
  }

  const email = (loginUser.value || 'priya.sharma@email.com').trim();
  try {
    const res = await fetch('/api/verify-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: currentLoginChallengeId,
        email: currentLoginEmail || email,
        mobile: currentLoginMobile,
        otp: code,
        method: currentLoginMethod
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Login verified successfully!');
    } else {
      showLoginState('5');
    }
  } catch (err) {
    showLoginState('5');
  }
});

const mfaCards = document.querySelectorAll('#journey-registration .mfa-option-card');
mfaCards.forEach(card => {
  card.addEventListener('click', function() {
    mfaCards.forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');
  });
});

const loginMfaCards = document.querySelectorAll('#journey-login .mfa-option-card');
loginMfaCards.forEach(card => {
  card.addEventListener('click', function() {
    loginMfaCards.forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');
  });
});

document.getElementById('reg-btn-mfa-continue').addEventListener('click', async function() {
  const selected = document.querySelector('#journey-registration .mfa-option-card.selected');
  const method = selected ? selected.dataset.method : 'authenticator';
  const email = (regEmail.value || 'priya.sharma@email.com').trim();

  try {
    await fetch('/api/setup-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mfaMethod: method })
    });
  } catch (e) {}

  if (method === 'authenticator') {
    showRegState('5');
  } else if (method === 'sms') {
    showRegState('3');
  } else {
    showRegState('2');
  }
});

document.getElementById('btn-login-method-continue').addEventListener('click', function() {
  showLoginState('4');
});

document.getElementById('reg-btn-qr-continue').addEventListener('click', function() {
  showRegState('6');
});

document.getElementById('reg-btn-qr-back').addEventListener('click', function() {
  showRegState('4');
});

document.getElementById('reg-btn-email-resend').addEventListener('click', async function() {
  const email = (regEmail.value || 'priya.sharma@email.com').trim();
  try {
    const res = await fetch('/api/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data && data.challengeId) {
      currentEmailChallengeId = data.challengeId;
    }
  } catch (e) {}
  showRegState('2');
});

const regEmailResendLink = document.getElementById('reg-email-resend');
if (regEmailResendLink) {
  regEmailResendLink.addEventListener('click', function() {
    document.getElementById('reg-btn-email-resend').click();
  });
}

document.getElementById('reg-btn-mobile-resend').addEventListener('click', async function() {
  const mobile = `${regCountry.value} ${(regMobile.value || '98765 43210').trim()}`;
  try {
    const res = await fetch('/api/send-sms-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    const data = await res.json();
    if (data && data.challengeId) {
      currentSmsChallengeId = data.challengeId;
    }
  } catch (e) {}
  showRegState('3');
});

const regMobileResendLink = document.getElementById('reg-mobile-resend');
if (regMobileResendLink) {
  regMobileResendLink.addEventListener('click', function() {
    document.getElementById('reg-btn-mobile-resend').click();
  });
}

document.getElementById('btn-login-resend').addEventListener('click', async function() {
  const email = (loginUser.value || 'priya.sharma@email.com').trim();
  try {
    const res = await fetch('/api/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data && data.challengeId) {
      currentLoginChallengeId = data.challengeId;
    }
  } catch (e) {}
  showLoginState('4');
});

const loginResendLink = document.getElementById('login-resend');
if (loginResendLink) {
  loginResendLink.addEventListener('click', function() {
    document.getElementById('btn-login-resend').click();
  });
}

document.getElementById('reg-change-phone').addEventListener('click', function(e) {
  e.preventDefault();
  showRegState('1');
});

document.getElementById('reg-back-1').addEventListener('click', function() {
  history.back();
});

document.getElementById('reg-back-email').addEventListener('click', function() {
  showRegState('1');
});

document.getElementById('reg-back-mobile').addEventListener('click', function() {
  showRegState('2');
});

document.getElementById('reg-back-mfa').addEventListener('click', function() {
  showRegState('3');
});

document.getElementById('reg-back-qr').addEventListener('click', function() {
  showRegState('4');
});

document.getElementById('reg-back-mfa-verify').addEventListener('click', function() {
  showRegState('5');
});

document.getElementById('login-back-method').addEventListener('click', function() {
  showLoginState('1');
});

document.getElementById('login-back-otp').addEventListener('click', function() {
  showLoginState('3');
});

document.getElementById('reg-btn-continue-login').addEventListener('click', function() {
  switchJourney('login');
  showLoginState('1');
});

startCountdown('reg-email-timer', 165);
startCountdown('reg-mobile-timer', 165);
startCountdown('reg-mfa-timer', 28);
startCountdown('login-timer', 165);

window.showRegState = showRegState;
window.showLoginState = showLoginState;
window.switchJourney = switchJourney;

const urlParams = new URLSearchParams(window.location.search);
const jParam = urlParams.get('journey');
const sParam = urlParams.get('state');
if (jParam) switchJourney(jParam);
if (jParam === 'login' && sParam) showLoginState(sParam);
else if (sParam) showRegState(sParam);
