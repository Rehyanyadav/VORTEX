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
- **Mongoose**: MongoDB object modeling.
- **MongoDB Atlas**: Cloud database for serverless persistence.
- **Helmet & Rate-Limit**: Enterprise security.
- **Vercel**: Serverless deployment for both Frontend & Backend.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Production Deployment (Vercel)

1. **Setup MongoDB Atlas**:
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Get your **Connection String (URI)**.
2. **Deploy Backend**:
   - Import the `backend` folder into Vercel.
   - Add Environment Variable: `MONGODB_URI` = `your_mongodb_connection_string`.
3. **Deploy Frontend**:
   - Import the `frontend` folder into Vercel.
   - Update `API_BASE` in `main.js` to your backend's Vercel URL.


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
