# Vortex Engine: Premium 3D URL Platform

Vortex is a high-performance URL shortening service designed for the modern web. It combines a robust, secure RESTful API with a stunning Three.js-powered 3D interface.

## 🌪️ Features

- **3D Immersive UI**: Powered by Three.js with interactive particle systems.
- **Enterprise Security**: Built-in rate limiting, Helmet.js headers, and strict input validation.
- **Full CRUD API**: Create, retrieve, update, and delete shortened links.
- **Real-time Analytics**: Track hits and engagement per link.
- **Modern UX**: Toast notifications, gradient links, and mobile-responsive glassmorphism.
- **Monetization Ready**: Integrated pricing plans and business logic.

## 🛠️ Tech Stack

### Frontend
- **Three.js**: 3D rendering and interaction.
- **Vanilla Javascript**: Core logic and API integration.
- **CSS3**: Advanced glassmorphism and animations.
- **Vite**: Ultra-fast frontend build tool.

### Backend
- **Node.js & Express**: High-concurrency server.
- **Morgan**: Production-grade request logging.
- **Helmet**: Security headers.
- **Express-Rate-Limit**: Brute-force protection.
- **Express-Validator**: Sanitized input handling.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

1. **Clone the repository** (or navigate to the project folder).
2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### API Endpoints

- `POST /shorten`: Create a link.
- `GET /shorten/:code`: Retrieve destination.
- `PUT /shorten/:code`: Update destination.
- `DELETE /shorten/:code`: Remove link.
- `GET /shorten/:code/stats`: Fetch click analytics.

## 🛡️ Security Policy
Vortex is hardened against common web attacks. The API is rate-limited to 100 requests per 15 minutes per IP to prevent automated abuse.

---
Built with ❤️ for the future of the web.
