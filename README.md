# InternTrack — Full-Stack Internship & Job Application Tracker

InternTrack is a full-stack web application designed to help students and job seekers organize, track, and analyze their internship and job applications in one place. It combines a responsive, interactive frontend with a secure Node.js + Express REST API backed by Firebase Authentication and Cloud Firestore.


## Key Features
1. Secure Authentication & Private Workspace:** Email/Password Sign Up, Login, and Logout powered by Firebase Auth. Every API request verifies the user's Firebase ID Token on the Express backend so each user only accesses their own data.

2. Full CRUD REST API:** Create, Read, Update, and Delete applications seamlessly synced with Cloud Firestore.

3. Dual View (Grid + Drag-and-Drop Kanban Board):** Switch between a modern card grid and a Trello-style Kanban board (`Applied`, `Online Test`, `Interview`, `Offer`, `Rejected`). Dragging a card across columns updates its status directly in the database.

4. Live Analytics Dashboard:** Animated KPI summary cards, stipend insights (Average & Highest ₹/month), customizable Monthly Application Goal progress bar, and a real-time Chart.js Doughnut breakdown.

5. Deadline Alerts & Calendar Integration:** Upcoming deadlines countdown widget with urgency badges and 1-click **Add to Google Calendar** support.

6. Smart Search, Filter & Sort:** Real-time search across company, role, location, and notes, status filtering, and sorting by Newest, Deadline, or Stipend.

7. Modern UI/UX Extras: Glassmorphism design, animated aurora background, mouse-tracking spotlight cards, Dark/Light theme toggle, skeleton loaders, Offer confetti celebration, 1-click **Load Demo Data**, and **Export to CSV**.



## Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES Modules), Chart.js |
| **Backend** | Node.js, Express.js (REST API) |
| **Database** | Firebase Cloud Firestore (NoSQL) |
| **Authentication** | Firebase Authentication + Firebase Admin SDK |
| **Deployment** | Render (Web Service) & GitHub |



