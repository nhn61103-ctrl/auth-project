<div align="center">
  <h1>Tenzo X Auth</h1>
  <p>A high-performance, secure authentication and licensing system built for modern web applications.</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#configuration">Configuration</a> •
    <a href="#star-goals">Star Goals</a>
  </p>
</div>

---

## Features

- **Robust Authentication**: Complete user lifecycle management (Signup, Login, Password Reset).
- **Licensing System**: Generate and manage software licenses and subscriptions securely.
- **Hardware ID (HWID) Locking**: Prevent account sharing by locking accounts to specific hardware.
- **Reseller Portal**: Dedicated secure portal for resellers to manage their customers.
- **Bot Protection**: Integrated Cloudflare Turnstile to stop automated attacks.
- **Edge-Optimized API**: Backend built with Hono and deployed globally on Cloudflare Workers.
- **Real-time Database**: Powered by Firebase Realtime Database with strict security rules.

## 👍 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [Firebase Account](https://firebase.google.com/)
- [Cloudflare Account](https://dash.cloudflare.com/) (for Turnstile and Workers)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tenzoxauth.git
   cd tenzoxauth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## ⚙️ Configuration

1. Set up your frontend environment variables. Ensure `.env` is populated based on the `.env.example` file with your Firebase and Turnstile credentials:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_TURNSTILE_SITE_KEY="your_site_key"
   ...
   ```

2. Set up your backend environment variables for Cloudflare Workers. Ensure `.dev.vars` is populated based on `.dev.vars.example`:
   ```env
   DB_SECRET="your_database_encryption_secret"
   TURNSTILE_SECRET_KEY="your_turnstile_secret_key"
   TXA_RESPONSE_SIGNING_PRIVATE_KEY_PEM="your_private_key_pem"
   ...
   ```

3. Deploy Firebase Rules:
   Ensure you deploy the `firebase-rules.json` to your Firebase Realtime Database. **Important:** Open `firebase-rules.json` and replace `<YOUR_ADMIN_EMAIL>` with your actual admin email address before deploying to secure your database!

## 💻 Usage

### Development

To run the local Vite development server:
```bash
npm run dev
```

### Deployment

Build the frontend:
```bash
npm run build
```

Deploy the Cloudflare Worker API:
```bash
npm run deploy:api
```
*(Ensure you have authenticated with `wrangler login` first)*


## 🛡️ Security

If you discover any security related issues, please open a issue, if I have free time, I will fix it.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is open-source and available under the MIT License.
