# FCHAN – Farm Intelligence Platform

A multi-tenant farm monitoring and management platform with IoT integration.

🌐 **Live Demo:** [fchan-five.vercel.app](https://fchan-five.vercel.app)  
📁 **GitHub:** [github.com/blae02/FCHAN](https://github.com/blae02/FCHAN)

---

## About

FCHAN is a full-stack web application that helps farmers remotely monitor and manage their farms using IoT sensors and AI-driven insights. It supports multiple farms, zones, plants, and sensors per user, with real-time alerts and PDF report generation.

---

## Features

- 🔐 Secure user authentication with email verification and JWT
- 🌱 Manage multiple farms, zones, plants, and sensors
- 📡 IoT sensor integration (WiFi, Bluetooth, USB via Arduino)
- 🔔 Automated alerts when sensor readings exceed thresholds
- 🤖 AI-based plant growth forecasting (Growing Degree Days)
- 📄 Downloadable PDF farm reports
- 💬 Real-time chat between farm collaborators
- 🌍 Bilingual support (English and French)

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Backend    | Node.js, Express.js, Socket.IO    |
| Database   | MySQL                             |
| Auth       | JWT, bcryptjs                     |
| IoT        | Arduino (C++), Python scripts     |
| PDF        | Puppeteer                         |
| Email      | Nodemailer / Resend               |
| Deployment | Vercel                            |

---

## Project Structure

```
FCHAN/
├── backend/        # Node.js/Express REST API
├── frontend/       # HTML/CSS/JS frontend pages
├── database/       # MySQL schema and migrations
├── arduino/        # Arduino sensor scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MySQL
- Arduino IDE (for IoT setup)

### Installation

```bash
# Clone the repository
git clone https://github.com/blae02/FCHAN.git
cd FCHAN

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Fill in your DB credentials, JWT secret, email config

# Start the server
npm start
```

---

## Team – Group 24

| Name                         | Role          |
|------------------------------|---------------|
| Eyong Seanna Tabe            | Scrum Master  |
| Feze Halimatou Seidi Malaika | Product Owner |
| Bagnawe Emmanuel             | Developer 1   |
| Formu Sunita Naah            | Developer 2   |
| Tankam Soh Raoul Daril       | Developer 3   |

---

## Course

**Object Oriented Analysis, Design and Implementation**  
Instructor: Engr. Tekoh Palma Achu  
Submission Date: 08-06-2026

---

## License

This project is licensed under the MIT License.
