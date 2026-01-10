# Rebooted Setup Guide

This guide will help you set up the Rebooted system from scratch.

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Ollama installed and running locally
- Expo CLI installed (`npm install -g expo-cli`)
- Android Studio or Xcode for mobile development (optional for web testing)

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API

### 1.2 Apply Database Migration

1. In your Supabase dashboard, go to SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the migration
4. Verify that all tables and RLS policies are created correctly

### 1.3 Configure Authentication

1. In Supabase dashboard, go to Authentication > Settings
2. Enable Email provider
3. Configure email templates if needed
4. Set up redirect URLs for your app (e.g., `rebooted://`)

## Part 2: Ollama Setup

### 2.1 Install Ollama Models

You need to create two Ollama models using the provided modelfiles:

```bash
# Create the planner model
ollama create rebooted-planner -f RebootedPlanner.Modelfile

# Create the OCR model
ollama create rebooted-ocr -f RebootedOCR.Modelfile
```

### 2.2 Verify Models

```bash
# Test that models are available
ollama list
```

You should see both `rebooted-planner` and `rebooted-ocr` in the list.

## Part 3: API Server Setup

### 3.1 Install Dependencies

```bash
cd apps/api
npm install
```

### 3.2 Configure Environment

1. Copy `.env.example` to `.env` (if it exists, or create one)
2. Set the following variables:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PLANNER_MODEL=rebooted-planner
OLLAMA_OCR_MODEL=rebooted-ocr
PORT=3000
NODE_ENV=development
```

### 3.3 Start the API Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 3.4 Test the API

```bash
# Health check
curl http://localhost:3000/health

# Test planner (requires Ollama running)
curl -X POST http://localhost:3000/plan \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "Build a mobile app with login and dashboard"}'
```

## Part 4: Mobile App Setup

### 4.1 Install Dependencies

```bash
cd apps/mobile
npm install
```

### 4.1.1 Generate Placeholder Assets

The app requires icon and splash screen assets. Generate placeholder assets for development:

```bash
npm run generate-assets
```

**Note**: Replace these placeholder assets with actual app icons and splash screens before production.

### 4.2 Configure Environment

Create a `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**For Android emulator, use:**
```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

**For iOS simulator, use:**
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**For physical device, use your computer's local IP:**
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000
```

### 4.3 Start the Expo App

```bash
npm start
```

This will open Expo DevTools. You can:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan QR code with Expo Go app on your phone

### 4.4 Build for Production

```bash
# Android
expo build:android

# iOS
expo build:ios
```

## Part 5: Testing the System

### 5.1 Test Authentication

1. Open the mobile app
2. Register a new account
3. Complete onboarding
4. Verify you can login/logout

### 5.2 Test Project Creation

1. Go to Projects tab
2. Tap "New Project"
3. Enter text or select an image
4. Verify tasks are created from planner output

### 5.3 Test Daily Assignments

1. Go to Home tab
2. Verify tasks are automatically assigned
3. Tap a task to view details
4. Start timer and complete a task
5. Verify points are awarded

### 5.4 Test Insights

1. Go to Insights tab
2. Verify points total is displayed
3. Test petting/feeding (requires points)
4. Check calendar view shows completed tasks

## Troubleshooting

### API Server Issues

- **Ollama connection failed**: Ensure Ollama is running (`ollama serve`)
- **Model not found**: Run `ollama pull llama3.1:8b` and `ollama pull llava:13b`
- **Port already in use**: Change PORT in `.env`

### Mobile App Issues

- **Supabase connection failed**: Check environment variables are set correctly
- **API calls failing**: Verify API_BASE_URL matches your setup (localhost vs IP)
- **RLS errors**: Ensure user is authenticated and RLS policies are correct

### Database Issues

- **Migration errors**: Check that auth.users table exists (created by Supabase)
- **RLS blocking queries**: Verify policies allow user to access their own data
- **Foreign key errors**: Ensure all referenced tables exist

## Development Notes

- The API server must be running for planner/OCR features
- Ollama must be running for AI features
- Supabase handles all data persistence and authentication
- RLS ensures users can only access their own data

## Next Steps

- Integrate Lottie animations for pet interactions
- Add Android blocking feature with Accessibility Service
- Implement PDF/Word file parsing
- Add drag-and-drop task reordering
- Enhance UI/UX based on user feedback

