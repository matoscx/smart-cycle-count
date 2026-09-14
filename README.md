# Smart Cycle Count

A web application designed to streamline inventory cycle counts. Built with a Next.js frontend and a NestJS backend, it features inventory heatmaps, automated scoring for high-risk items, audit planning, and a mobile-friendly counting flow.

---

## 🚀 Features & Deliverables

* **Full-stack App:** Next.js (Frontend) + NestJS (Backend)
* **Database Management:** Database schema with Prisma and seed scripts.
* **Smart Scoring Service:** Priority calculation for items needing audit based on risk factors.
* **Visualization:** Heatmap page showing warehouse layout and detailed bin views.
* **Audit Management:** Audit plan creation and structured task distribution.
* **Mobile Flow:** Simple, responsive counting interface for floor operators.

---

## 🛠️ Installation & Setup

Follow these steps to get the project running locally.

### Prerequisites
* Node.js (v18 or higher)
* npm or pnpm

### 1. Backend Setup
# Navigate to backend directory
cd backend

Install dependencies
npm install

Run database migrations & seed initial data
npx prisma migrate dev
npx prisma db seed

Start backend server
npm run start:dev

### 2. Frontend Setup
Open a new terminal and navigate to frontend directory
cd frontend

Install dependencies
npm install

Start frontend development server
npm run dev




