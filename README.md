# Taskbase

A clean, minimal task manager web app. Organize your work across multiple lists, track what's done, and manage everything from a personal dashboard — all running locally on your machine.

---

## Getting Started

The only two commands you need:

```bash
npm install
npm start
```

Then open your browser and go to **http://localhost:3000**

> **Requirement:** You must have [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally before starting the app. The app connects to `mongodb://127.0.0.1:27017/taskbase` by default and will create the database automatically on first run.

---

## Features

### Preview Page
- Visit the root `/` to explore a live demo of the app before signing up
- Browse sample lists and tasks to get a feel for the interface
- Dark mode toggle

### Accounts
- Register with a **username**, **email**, **phone number**, and **password**
- Log in and out securely with session-based authentication
- Sessions persist for 7 days so you stay logged in across browser restarts
- View your account profile (username, email, phone, total lists, total tasks)

### Lists
- Create as many lists as you need (Work, Personal, Shopping, etc.)
- Rename lists at any time
- Delete a list and all its tasks in one action

### Tasks
- Add tasks to any list
- Check off tasks as completed — they move to a separate **Completed** section
- Uncheck to move them back to **To Do**
- Delete individual tasks
- Tasks are separated into **To Do** and **Completed** sections for a clean view

### Search
- Search across all your tasks from the top bar
- Results are grouped by list and update as you type

---

## Project Structure

```
taskbase/
├── client/                 # Front-end files
│   ├── pages/
│   │   ├── index.html      # Preview / landing page
│   │   ├── dashboard.html  # Authenticated user dashboard
│   │   └── login.html      # Login & register page
│   ├── css/
│   │   ├── styles.css      # Index page styles
│   │   └── dashboard.css   # Dashboard styles
│   │   └── login.css       # Login styles
│   └── js/
│       ├── script.js       # Index page logic
│       └── dashboard.js    # Dashboard logic
│   │   └── login.js        # Login logic
├── server/
│   ├── middleware/
│   │   ├── auth.js         # aunthenticated session
│   ├── models/
│   │   ├── User.js         # User model
│   │   ├── Lists.js        # List model
│   │   └── Tasks.js        # Task model
│   ├── routes/
│   │   ├── auth.js         # Login, register, logout
│   │   ├── user.js         # Profile
│   │   ├── lists.js        # List CRUD
│   │   └── tasks.js        # Task CRUD + search
│   └── server.js           # Entry point
├── package.json
└── README.md
```

---

## Optional: Using MongoDB Atlas (Cloud)

If you'd prefer to connect to a cloud database instead of a local one, create a `.env` file in the `server/` directory:

```
MONGODB_URI=your_atlas_connection_string
SESSION_SECRET=your_own_secret
```

The app will automatically use these values over the local defaults when present.

---

## Tech Stack

- **Node.js** + **Express** — server and API
- **MongoDB** + **Mongoose** — database
- **express-session** + **connect-mongo** — session management
- **Vanilla JS** — no front-end framework
- **DM Serif Display** + **DM Mono** — typography