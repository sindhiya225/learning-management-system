# LearnFlow LMS

Simple full-stack LMS assessment project with:

- Admin login, dashboard, employee allocation, and course management
- Employee login, course playback simulation, and completion tracking
- PostgreSQL persistence using `pg`
- Static frontend served by an Express backend

Run flow:

1. Create a PostgreSQL database named `learnflow_lms`.
2. Run `database/schema.sql` in pgAdmin Query Tool.
3. Copy `.env.example` to `.env` and update database credentials.
4. Run `npm install`
5. Run `npm run seed`
6. Run `npm start`
7. Open `http://localhost:5000`

Demo credentials:

- Admin: `admin@org.com` / `admin123`
- Employee: `sarah@org.com` / `emp123`
