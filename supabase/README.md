# CADC — Supabase Cloud Backend Setup Guide

This project is fully integrated with **Supabase (PostgreSQL + Auth + Real-time APIs)**.

---

## 🚀 2-Minute Quickstart

### Step 1: Create a Free Project on Supabase
1. Go to [https://supabase.com](https://supabase.com) and create or log in to your free account.
2. Click **New Project**, name it `cadc-database`, set a database password, and select your preferred region.

### Step 2: Run the Database Migration
1. In your Supabase Project dashboard, navigate to the **SQL Editor** (icon on left menu).
2. Click **New Query**.
3. Open the file `supabase/schema.sql` in this project, copy the entire SQL script, paste it into the editor, and click **Run**.
4. This will instantly create:
   - `profiles` table (linked to Supabase Auth)
   - `inquiries` table (with statuses: `new`, `in_review`, `contacted`, `converted`)
   - `courses` table (with 4 pre-seeded CADC programs)
   - `course_enrollments` table
   - Row Level Security (RLS) policies
   - Auto-sync triggers for new student signups

### Step 3: Configure Environment Variables
1. In Supabase, go to **Project Settings** → **API**.
2. Copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key**
   - **service_role key** (under Project API keys)
3. In your project root, create a `.env` file (or copy `.env.example` to `.env`):
   ```bash
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
   ```
4. On **Vercel** (for production):
   - Go to your Vercel Project → **Settings** → **Environment Variables**.
   - Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🛡️ Built-in Graceful Fallback
If you run the app locally without `.env` configured, the backend will automatically use the built-in local database (`data/db.json` / in-memory). When you add Supabase keys, it automatically upgrades to cloud persistence without modifying any code!
