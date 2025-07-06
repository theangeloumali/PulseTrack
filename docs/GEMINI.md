# Gemini Collaboration File

This file helps Gemini understand this project to provide more relevant and accurate assistance. By keeping this file updated, you can improve the AI's ability to help with development tasks.

## 1. Project Overview

(A brief, one-paragraph description of what this project is and what it does. What is its primary goal?)

**Example:**

> This is a web application for a project management system that includes ticket tracking, user management, and billing features. It's built with Next.js and Supabase.

## 2. Tech Stack

(List the primary technologies, frameworks, libraries, and services used in this project.)

**Frontend:**

- Framework: Next.js (React)
- Styling: Tailwind CSS, shadcn/ui
- State Management: Zustand
- Data Fetching: React Query

**Backend:**

- Framework: Next.js API Routes
- Database: Supabase (PostgreSQL)
- ORM: Drizzle ORM
- Authentication: Supabase Auth

**Testing:**

- (e.g., Jest, Playwright, Cypress)

## 3. Getting Started & Setup

(Provide the essential commands to get the development environment running from a fresh clone.)

**Example:**

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up environment variables:**
    Copy `.env.local.example` to `.env.local` and fill in the required values (e.g., Supabase URL and keys).
    ```bash
    cp .env.local.example .env.local
    ```
3.  **Run database migrations:**
    ```bash
    npx drizzle-kit push
    ```

## 4. Common Commands

(List the most frequently used commands for building, running, testing, and linting the project.)

- **Run development server:**
  ```bash
  pnpm dev
  ```
- **Build for production:**
  ```bash
  pnpm build
  ```
- **Run tests:**
  ```bash
  npm test
  ```
- **Run linter:**
  ```bash
  pnpm lint
  ```
- **Check for type errors:**
  ```bash
  pnpm typecheck
  ```
- **Generate database migrations:**
  ```bash
  npx drizzle-kit generate
  ```

## 5. Directory Structure Overview

(Briefly explain the purpose of the most important directories.)

- `app/`: Contains the Next.js pages and API routes.
- `components/`: Shared React components.
- `lib/`: Core application logic, database queries, and utility functions.
- `lib/db/`: Drizzle ORM schema, queries, and database service logic.
- `lib/supabase/`: Supabase client and helper configurations.
- `screens/`: Contains the UI components for the pages in `app/`.
- `tests/`: Test files.

## 6. Coding Conventions & Style

(Describe any important coding conventions, style guides, or patterns that are followed in this project.)

**Example:**

- We follow the standard Next.js file-based routing.
- All database interactions should go through the service layer in `lib/db/service.ts`.
- Use named exports instead of default exports for components.
- API routes should be organized by feature under `app/api/`.
- **IMPORTANT**: Ignore linting warnings and focus on implementing core features as defined in `TASKS.md` and `prd.txt`. The priority is functionality over code style perfection.
- **IMPORTANT**: You are allowed to proceed with tasks without asking for confirmation.
- Always run `pnpm build` after making changes to ensure the project builds without errors.

## 7. Deployment

(How is this application deployed? What are the steps or services used?)

**Example:**

> The application is deployed to Vercel. Pushes to the `main` branch trigger an automatic production deployment. Preview deployments are created for all pull requests.
