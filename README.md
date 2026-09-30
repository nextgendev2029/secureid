# SecureID

SecureID is an Identity and Access Management (IAM) authentication and user registration system. It provides multi-step registration with email and SMS OTP verification, multi-factor authentication (MFA) setup, secure session management, JWT issuance, and account lockout protection.

## Features

- **User Registration**: Multi-field registration with client-side and server-side validation.
- **Password Security**: Strong password complexity enforcement and salted hashing using `bcryptjs`.
- **Email OTP Verification**: 6-digit numeric OTP generation, bcrypt-hashed storage, expiry countdown, and attempt limiting.
- **SMS OTP Verification**: 6-digit challenge-based mobile verification with attempt limiting and resend support.
- **Multi-Factor Authentication (MFA)**: Method selection (Authenticator App, SMS, Email) and QR code display.
- **Login Authentication**: Credential validation with password verification and two-step MFA challenge requirements.
- **Temporary Account Lockout**: Automatic temporary lockout (HTTP 423) after 5 consecutive failed login attempts.
- **Session Authentication**: Server-side session store with `HttpOnly`, `SameSite`, and `Secure` cookie configuration (`secureid_session`).
- **JWT Protected API**: Short-lived JSON Web Token issuance (`POST /api/token`) and Bearer token verification (`GET /api/protected`).
- **Evaluator Testing Endpoint**: Development-only test endpoint (`GET /api/test/otp/:challengeId`) strictly disabled in production.

## Tech Stack

- **Backend**: Node.js, Express
- **Security & Authentication**: bcryptjs, jsonwebtoken, cookie-parser
- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (no frontend or CSS frameworks)
- **Deployment**: Vercel Serverless Functions

## Project Structure

```
SecureID/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── public/
│   ├── css/
│   │   ├── auth.css      # Authentication component and responsive styles
│   │   └── style.css     # Global styles, variables, and layout
│   ├── js/
│   │   └── register.js   # Client-side form handling and API integration
│   └── index.html        # Main single-page application interface
├── src/
│   ├── routes/
│   │   ├── auth.js       # Authentication, registration, and OTP endpoints
│   │   └── protected.js  # JWT protected API routes
│   └── store.js          # In-memory data store for users, challenges, and sessions
├── index.html            # Root redirect to public interface
├── package.json          # Project metadata, scripts, and dependencies
├── server.js             # Local Express application entry point
├── test-backend.js       # Automated test suite (49 assertions)
└── vercel.json           # Vercel routing and rewrite configuration
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the local server:

```bash
npm start
```

The application will be available at `http://localhost:3000`.

For development with automatic file serving:

```bash
npm run dev
```

## Testing

Run the automated backend test suite:

```bash
npm test
```

This executes 49 automated checks covering:
- Registration validation and password hashing
- Challenge ID generation and lifecycle
- OTP attempt limiting, expiration, and single-use invalidation
- Email and SMS OTP verification flows
- Failed login attempt tracking and temporary account lockout
- Session cookie creation, inspection, and invalidation upon logout
- JWT token generation and protected route access control
- Production restriction of test-only OTP retrieval endpoints

For instructions on retrieving simulated OTP codes during manual evaluation, see [OTP Testing / Evaluation](#otp-testing--evaluation).

## Deployment

The application is configured for deployment on Vercel:
- `vercel.json` routes `/api/*` requests to the serverless function entry point `api/index.js` and serves static frontend assets from `public/`.
- Environment variables such as `JWT_SECRET` can be configured in the Vercel project dashboard.
- For evaluating simulated OTP verification in production deployments, see [OTP Testing / Evaluation](#otp-testing--evaluation).

## OTP Testing / Evaluation

SecureID generates all verification codes server-side and simulates message delivery in compliance with assignment guidelines. No real SMS or email messages are dispatched, and no third-party email or SMS gateway is configured.

### Security Architecture & Guarantees
- **Server-Side Generation**: OTPs are generated strictly on the backend using cryptographically secure random numbers. The frontend never generates or anticipates codes.
- **Protected Storage**: OTPs are never stored in plaintext; server memory stores only salted bcrypt hashes (`hashedOtp`).
- **No Response Leakage**: Standard API responses return only a unique `challengeId` and metadata. Normal API payloads never contain the plain OTP or its hash.
- **Lifecycle & Attempt Limits**: Challenges enforce a strict 165-second expiry and a maximum of 3 verification attempts. Once verified or exhausted, challenges are permanently invalidated to prevent replay.

### How Evaluators Can Test Simulated OTPs

The same testing approach applies across all verification stages: **Email OTP**, **SMS OTP**, and **Login MFA OTP**.

#### 1. Local Development Testing
When testing on a local server (`npm start` or `npm run dev`):
- Start the Registration or Login journey in the browser.
- Observe the running Node.js terminal output.
- The server prints the simulated code directly to the console:
  - `[DEV OTP] Email OTP for <email>: <6-digit-code>`
  - `[DEV OTP] SMS OTP for <phone>: <6-digit-code>`
  - `[DEV OTP] MFA OTP for <identifier>: <6-digit-code>`
- Enter the logged 6-digit code into the application's OTP boxes to complete verification.

#### 2. Deployed Vercel Demo Evaluation
When testing the live demo deployed on Vercel:
1. Open the deployed application URL in the browser.
2. Initiate the Registration flow (submit credentials) or Login MFA flow.
3. Open the **Vercel Project Dashboard** and navigate to **Logs** (or **Runtime Logs**).
4. Locate the corresponding serverless function invocation (`/api/register`, `/api/send-email-otp`, `/api/send-sms-otp`, or `/api/login`).
5. Read the simulated 6-digit OTP recorded in the server runtime log output.
6. Enter that OTP into the SecureID input boxes in the browser.

## Notes / Limitations

- **Simulated OTP Delivery**: OTP codes are logged to server console output and runtime logs. No real email or SMS provider is integrated.
- **In-Memory Store**: User profiles, OTP challenges, and sessions are stored in memory. Data will reset whenever the server process or Vercel serverless function instance restarts.
- **Single-Node Sessions**: Sessions are managed in server memory without an external Redis or database store.
