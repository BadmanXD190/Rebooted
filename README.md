# Rebooted

A mobile app that helps users finish tasks and fight procrastination using AI-powered task planning, focus timers, and gamification.

## Features

- **AI Task Planning**: Convert text or images into structured projects with tasks and subtasks
- **Daily Task Assignment**: Automatic daily task assignment based on preferences
- **Focus Timer**: Track time spent on tasks with session persistence
- **Points System**: Earn points by completing tasks (1 minute = 1 point)
- **Pet Interactions**: Spend points to interact with your pet (Lottie animations)
- **Insights Calendar**: View monthly summary of completed tasks and minutes
- **Android Blocking**: Block distracting apps based on sleep time and unfinished tasks (coming soon)

## Tech Stack

- **Mobile**: Expo React Native with TypeScript
- **Backend**: Node.js Express API
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: Ollama (llama3.1:8b for planning, llava:13b for OCR)

## Project Structure

```
rebooted/
├── apps/
│   ├── api/          # Node.js API server
│   └── mobile/       # Expo React Native app
├── supabase/
│   └── migrations/   # Database migration files
└── docs/             # Documentation
```

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Prerequisites

- Node.js 18+
- Supabase account
- Ollama installed
- Expo CLI

### Setup Steps

1. **Supabase**: Create project and run migration
2. **Ollama**: Install models using modelfiles
3. **API**: Install dependencies and start server
4. **Mobile**: Install dependencies and start Expo

## Development

```bash
# Start API server
cd apps/api
npm install
npm start

# Start mobile app
cd apps/mobile
npm install
npm start
```

## License

ISC

