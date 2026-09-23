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

## Deployment

The application is configured for deployment on Vercel:
- `vercel.json` routes `/api/*` requests to the serverless function entry point `api/index.js` and serves static frontend assets from `public/`.
- Environment variables such as `JWT_SECRET` can be configured in the Vercel project dashboard.

## Notes / Limitations

- **Simulated OTP Delivery**: OTP codes are logged to the server console (`[DEV OTP]`) and accessible via `GET /api/test/otp/:challengeId` in development mode. No third-party SMS or email gateway is connected.
- **In-Memory Store**: User profiles, OTP challenges, and sessions are stored in memory. Data will reset whenever the server process or Vercel serverless function instance restarts.
- **Single-Node Sessions**: Sessions are managed in server memory without an external Redis or database store.
