# Module 1 Phase-Wise Implementation Plan

Project: Personalized Decision Support Platform for Study Abroad and Scholarship Planning

This plan completes Module 1 while keeping the required foundation: authentication, student profiles, protected APIs, seeded data, and role-aware access.

## Module 1 Scope

Module 1 includes:

1. Candidate Readiness Scorecard
2. Smart University Matching
3. Scholarship Eligibility Engine
4. Country Decision Dashboard

The MVP should use explainable rule-based logic. AI can be added later for summaries or advisor-style explanations, but the core scoring and matching should not depend on AI.

## Phase 1: Project Setup And Base Architecture

Goal:

Create the technical foundation for the React, Express, Prisma, and PostgreSQL application.

Tasks:

- Initialize frontend with React.js, TypeScript, Vite, and TailwindCSS.
- Initialize backend with Express.js and TypeScript.
- Add shared environment configuration.
- Add Prisma and connect PostgreSQL.
- Add basic API health route.
- Add frontend routing and dashboard layout shell.

Suggested structure:

```text
apps/
  web/                 React frontend
  api/                 Express backend
packages/
  shared/              Shared TypeScript types and validation schemas
prisma/
  schema.prisma
  seed.ts
```

Deliverables:

- Running frontend app
- Running backend API
- PostgreSQL connection verified
- Prisma initialized

Acceptance check:

- `GET /api/health` returns a success response.
- Frontend can load without errors.

## Phase 2: Authentication And Authorization

Goal:

Allow users to register, log in, and access protected Module 1 features securely.

Tasks:

- Create `User` model.
- Add user roles: `STUDENT`, `CONTENT_MANAGER`, `ADMIN`.
- Implement student registration.
- Implement login with email and password.
- Hash passwords using bcrypt.
- Generate JWT access token.
- Add auth middleware for protected routes.
- Add role-check middleware for admin and content-manager routes.
- Add current user endpoint.
- Add frontend login and register pages.
- Store and send JWT from frontend requests.
- Redirect unauthenticated users to login.

Core auth API:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Deliverables:

- Register page
- Login page
- Protected dashboard shell
- JWT-based backend protection
- Role-aware backend middleware

Acceptance check:

- A student can register and log in.
- Logged-out users cannot open Module 1 pages.
- Students cannot access admin-only APIs.

Optional after MVP:

- Google OAuth
- Email verification
- Password reset

## Phase 3: Database Schema And Seed Data

Goal:

Create the core data model needed for scoring, matching, scholarship eligibility, and country comparison.

Tasks:

- Add Prisma models for users, profiles, countries, universities, programs, scholarships, readiness scores, university matches, and scholarship matches.
- Add migrations.
- Add seed data for countries, universities, programs, and scholarships.
- Add sample admin/content-manager/student accounts for demo use.

Core tables:

```text
User
StudentProfile
Country
University
Program
Scholarship
ReadinessScore
UniversityMatch
ScholarshipMatch
```

Important fields:

```text
StudentProfile:
  nationality
  targetDegree
  fieldOfStudy
  cgpa
  cgpaScale
  ieltsScore
  toeflScore
  greScore
  gmatScore
  researchPapers
  workExperienceMonths
  preferredCountries
  budgetUsd
  careerGoal

Program:
  universityId
  title
  degreeLevel
  field
  tuitionUsd
  minCgpa
  minIelts
  minToefl
  minGre
  researchPreferred
  workExperiencePreferred
  deadline

Scholarship:
  eligibleNationalities
  eligibleFields
  minCgpa
  minIelts
  researchRequired
  amountUsd
  coverageType
  deadline
```

Deliverables:

- Prisma schema
- Database migration
- Seed script
- Demo data for at least three countries, multiple universities, multiple programs, and multiple scholarships

Acceptance check:

- Seed command populates usable Module 1 data.
- Backend can query countries, universities, programs, and scholarships.

## Phase 4: Student Profile Foundation

Goal:

Collect the student data needed for readiness scoring, university matching, scholarship matching, and country comparison.

Tasks:

- Build profile create/edit API.
- Add backend validation for GPA, test scores, target degree, countries, field, and budget.
- Build profile form in frontend.
- Add profile completeness indicator.
- Block score generation until required fields are completed.

Core API:

```text
GET  /api/student/profile
POST /api/student/profile
PUT  /api/student/profile
```

Required profile fields for Module 1:

- Nationality
- Target degree
- Field of study
- CGPA and scale
- IELTS or TOEFL score
- Preferred countries
- Budget

Deliverables:

- Student profile API
- Profile form
- Profile validation
- Profile completeness status

Acceptance check:

- A logged-in student can create and update their profile.
- Invalid profile data is rejected.
- Matching and scoring pages show a clear incomplete-profile state when required fields are missing.

## Phase 5: Candidate Readiness Scorecard

Goal:

Analyze the student profile and generate readiness scores for university tiers.

Tasks:

- Create readiness scoring service.
- Score the profile for three tiers: Top-tier, Mid-tier, Accessible-tier.
- Generate strengths, weaknesses, and improvement recommendations.
- Store latest readiness scores.
- Build frontend scorecard page.

Backend API:

```text
POST /api/readiness/generate
GET  /api/readiness/latest
```

Suggested scoring weights:

```text
CGPA: 35%
English test: 20%
Standardized test: 15%
Research: 15%
Work experience: 10%
Budget/profile completeness: 5%
```

Example readiness output:

```text
Tier: Mid-tier
Score: 78
Strengths: Good CGPA, strong IELTS score
Weaknesses: No research publication
Recommendations: Add research experience or target programs where research is preferred, not required
```

Deliverables:

- Readiness scoring service
- Scorecard API
- Scorecard frontend page
- Strength and weakness explanation

Acceptance check:

- Student can generate a readiness score.
- Scorecard shows tier-wise scores from 0 to 100.
- Output explains why the score was assigned.

## Phase 6: Smart University Matching

Goal:

Use readiness scores and program requirements to classify programs into Safe, Target, and Reach.

Tasks:

- Create university matching service.
- Compare student profile against program requirements.
- Use readiness score in matching calculation.
- Categorize programs as Safe, Target, or Reach.
- Store generated matches.
- Add filters for country, field, degree level, tuition, and match category.
- Build frontend matching page.

Backend API:

```text
POST /api/matches/universities/generate
GET  /api/matches/universities?category=safe|target|reach
GET  /api/programs/search
```

Matching factors:

- CGPA compared with program minimum CGPA
- IELTS/TOEFL compared with program minimum English requirement
- GRE/GMAT if required
- Country preference
- Field match
- Tuition compared with student budget
- Research or work experience preference
- Readiness tier score

Category rules:

```text
Safe:
  Student exceeds most requirements and score is high.

Target:
  Student meets key requirements and score is moderate to high.

Reach:
  Student barely meets or misses important requirements but may still apply.
```

Deliverables:

- University matching service
- Matching generation API
- Safe, Target, Reach frontend tabs
- Match cards with score and reasons

Acceptance check:

- Student can generate university matches.
- Programs are grouped into Safe, Target, and Reach.
- Each match explains the main reasons for its category.

## Phase 7: Scholarship Eligibility Engine

Goal:

Calculate financial-aid matching percentages by comparing the student profile with scholarship eligibility rules.

Tasks:

- Create scholarship matching service.
- Compare nationality, field, GPA, IELTS/TOEFL, research, country, and deadline.
- Calculate matching percentage.
- Store scholarship matches.
- Build scholarship matching page.
- Sort highest matching scholarships first.

Backend API:

```text
POST /api/matches/scholarships/generate
GET  /api/matches/scholarships
GET  /api/scholarships/search
```

Matching factors:

- Nationality eligibility
- Field eligibility
- GPA requirement
- English test requirement
- Research requirement
- Country or university fit
- Deadline status

Deliverables:

- Scholarship eligibility service
- Scholarship matching API
- Scholarship frontend page
- Match percentage and reason display

Acceptance check:

- Student can generate scholarship matches.
- Irrelevant scholarships are ranked low or excluded.
- Each scholarship shows matching percentage, eligibility reasons, and missing requirements.

## Phase 8: Country Decision Dashboard

Goal:

Compare countries based on life, financial, and policy factors instead of academic admission probability.

Tasks:

- Create country list and comparison APIs.
- Add country comparison logic.
- Compare budget fit, living cost, part-time work rules, post-study work visa, visa difficulty, safety, and language requirement.
- Build country dashboard page.
- Allow side-by-side country comparison.

Backend API:

```text
GET /api/countries
GET /api/countries/compare?ids=...
```

Comparison factors:

- Average monthly living cost
- Post-study work visa length
- Part-time work hours
- Visa difficulty
- Safety score
- Language requirement
- Budget fit

Deliverables:

- Country API
- Country comparison service
- Country dashboard UI
- Side-by-side comparison table

Acceptance check:

- Student can compare at least three countries.
- Dashboard clearly shows cost, work, visa, and language differences.
- Country comparison does not depend on university admission scores.

## Phase 9: Admin And Content Manager Support

Goal:

Provide the minimum internal data management needed for Module 1.

Tasks:

- Protect internal APIs with admin/content-manager roles.
- Add create/update APIs for countries, universities, programs, and scholarships.
- Add a simple internal UI or use API-only management for MVP.
- Keep seed data as the main demo data source if UI time is limited.

Internal APIs:

```text
POST /api/admin/countries
PUT  /api/admin/countries/:id
POST /api/admin/universities
PUT  /api/admin/universities/:id
POST /api/admin/programs
PUT  /api/admin/programs/:id
POST /api/admin/scholarships
PUT  /api/admin/scholarships/:id
```

Deliverables:

- Role-protected content APIs
- Seed data maintenance path
- Optional simple admin/content-manager pages

Acceptance check:

- Admin/content-manager can manage Module 1 data.
- Student accounts cannot modify university, program, country, or scholarship records.

## Phase 10: Testing, Polish, And Demo Readiness

Goal:

Make the module reliable enough to present and demonstrate.

Backend tests:

- User cannot access protected routes without JWT.
- Student cannot access admin-only routes.
- Profile validation rejects incomplete or invalid data.
- Readiness score changes correctly with GPA, IELTS, research, and work experience.
- University match categories are assigned correctly.
- Scholarship percentage excludes irrelevant scholarships.

Frontend checks:

- Register and login flow works.
- Protected pages redirect when logged out.
- Profile form saves and reloads data.
- Scorecard renders generated results.
- Matching tabs show Safe, Target, and Reach results.
- Scholarship page sorts by matching percentage.
- Country dashboard compares selected countries cleanly on mobile and desktop.

Polish tasks:

- Add loading states.
- Add empty states.
- Add error messages.
- Make all Module 1 pages responsive.
- Add demo accounts and demo data.

Final Module 1 acceptance criteria:

- A student can register, log in, and maintain a profile.
- Protected Module 1 pages cannot be accessed without authentication.
- The system generates readiness scores with visible strengths and weaknesses.
- The system categorizes university programs into Safe, Target, and Reach.
- The system calculates scholarship matching percentages with reasons.
- The country dashboard compares at least three countries using practical decision factors.
- Admin or seeded data provides enough universities, programs, scholarships, and countries to demonstrate the module.

