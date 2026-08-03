# Study Abroad Decision Support Platform

This repository contains the Phase 1-4 foundation for Module 1:

- React + TypeScript frontend
- Express + TypeScript backend
- Prisma + PostgreSQL schema
- JWT authentication with roles
- Protected student profile flow
- Seed data for countries, universities, programs, scholarships, and demo users

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

3. Generate Prisma client and migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Run both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000/api/health`

## Demo Users

Seed creates these accounts:

```text
student@example.com / Student@123
manager@example.com / Manager@123
admin@example.com / Admin@123
```
