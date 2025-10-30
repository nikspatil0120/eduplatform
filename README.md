# 🎓 EduPlatform - Complete Learning Management System

A modern, enterprise-grade Learning Management System with advanced admin portal, real-time features, and cloud integration.

![EduPlatform](https://img.shields.io/badge/EduPlatform-v1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)
![Cloud](https://img.shields.io/badge/Cloud-Services-blue.svg)

## 🚀 **Features**

### **🎯 Core Learning Features**
- ✅ **Complete Course Management** - Creation, enrollment, progress tracking
- ✅ **Interactive Assignments** - File submissions, automated grading
- ✅ **Real-time Chat System** - Course-based messaging with file sharing
- ✅ **Note-taking System** - Rich text notes with course integration
- ✅ **Video Streaming** - Cloudinary video integration
- ✅ **Discussion Forums** - Threaded discussions with moderation
- ✅ **Learning Paths** - Structured course sequences
- ✅ **Digital Certificates** - Automated certificate generation

### **🔐 Advanced Admin Portal**
- ✅ **Modern Dashboard** - Real-time analytics and statistics
- ✅ **User Management** - Role-based access control
- ✅ **Course Moderation** - Approval workflows and content management
- ✅ **Assignment Grading** - Bulk operations and feedback system
- ✅ **System Analytics** - Detailed insights and reporting
- ✅ **Notification Center** - Platform-wide announcements
- ✅ **System Settings** - Comprehensive configuration management

### **⚡ Real-time Features**
- ✅ **Live Notifications** - Instant updates via SignalR
- ✅ **Real-time Chat** - Course-based communication
- ✅ **Live Dashboard** - Real-time data updates
- ✅ **Typing Indicators** - Enhanced chat experience
- ✅ **User Presence** - Online/offline status tracking

### **💰 Monetization & Business**
- ✅ **Stripe Integration** - Secure payment processing
- ✅ **Subscription Management** - Multiple pricing tiers
- ✅ **Revenue Analytics** - Detailed financial reporting
- ✅ **Instructor Commissions** - Revenue sharing system

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** - Modern component architecture
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Advanced animations
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

### **Backend**
- **Node.js + Express** - RESTful API server
- **MongoDB** - Document database with Mongoose
- **JWT Authentication** - Secure token-based auth
- **Socket.IO** - Real-time communication
- **Bull Queue** - Background job processing

### **Cloud Services**
- **Vercel** - Frontend hosting and CDN
- **Render** - Backend API hosting
- **MongoDB Atlas** - Cloud database
- **Cloudinary** - Media management and CDN
- **EmailJS** - Email notifications
- **Google OAuth** - Authentication service

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Cloud service accounts (for deployment and features)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/nikspatil0120/eduplatform.git
   cd eduplatform
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

4. **Configure Environment Variables**
   
   **Frontend (.env):**
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api/v1
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```
   
   **Backend (backend/.env):**
   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/eduplatform
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   FRONTEND_URL=http://localhost:3000
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Email Service (Optional)
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password
   
   # Payment (Optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

5. **Database Setup**
   ```bash
   # Start MongoDB (if running locally)
   mongod
   
   # Seed the database with sample data
   cd backend
   node seed-data.js
   
   # Create admin users
   node create-admin-users.js
   ```

6. **Start Development Servers**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm start
   
   # Terminal 2: Start frontend
   npm run dev
   ```

7. **Access the Application**
   - **Frontend:** http://localhost:3000
   - **Admin Portal:** http://localhost:3000/admin-login
   - **Backend API:** http://localhost:3001

## 🔐 **Admin Access**

### **Default Admin Credentials**
- **Super Admin:** `superadmin@kiro.edu` / `admin123`
- **Moderator:** `moderator@kiro.edu` / `mod123`

### **Admin Features**
- **Dashboard:** Real-time platform statistics
- **User Management:** Complete user lifecycle management
- **Course Management:** Content approval and moderation
- **Analytics:** Comprehensive reporting and insights
- **System Settings:** Platform configuration

## 📊 **API Documentation**

The platform includes 90+ API endpoints across:
- **Authentication** (8 endpoints)
- **User Management** (5 endpoints)
- **Course Management** (12 endpoints)
- **Assignment System** (10 endpoints)
- **Discussion Forums** (15 endpoints)
- **Real-time Features** (12 endpoints)
- **Admin Operations** (20+ endpoints)
- **Analytics & Reporting** (8 endpoints)

## 🏗️ **Project Structure**

```
eduplatform/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components
│   │   ├── admin/               # Admin portal pages
│   │   └── auth/                # Authentication pages
│   ├── contexts/                # React contexts
│   ├── services/                # API services
│   └── styles/                  # CSS and styling
├── backend/                     # Backend Node.js application
│   ├── src/
│   │   ├── models/              # MongoDB models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic services
│   │   ├── middleware/          # Express middleware
│   │   └── utils/               # Utility functions
│   └── seed-data.js             # Database seeding script
├── docs/                        # Documentation
└── README.md                    # This file
```

## 🚀 **Deployment**

### **Production Deployment**
1. **Vercel** (Frontend hosting)
2. **Render** (Backend hosting)
3. **MongoDB Atlas** (Database)
4. **Cloudinary** (Media storage and CDN)

### **Environment Configuration**
- Update environment variables for production
- Configure cloud services (Vercel, Render, MongoDB Atlas, Cloudinary)
- Set up CI/CD pipeline
- Configure custom domain and SSL

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Framer Motion for smooth animations
- Cloud service providers for reliable infrastructure
- MongoDB for the flexible database
- All contributors and testers

## 📞 **Support**

For support, email support@eduplatform.com or join our Slack channel.

---

**🎉 Built with ❤️ by [Nikhil Patil](https://github.com/nikspatil0120)**

*EduPlatform - Transforming Education Through Technology*