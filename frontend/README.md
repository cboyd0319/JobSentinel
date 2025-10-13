# JobSentinel React Frontend

Modern, privacy-first React SPA for JobSentinel job search automation.

## Features

- 🎯 **Job Dashboard** - Real-time job stats and recent matches
- 🔍 **Job Search** - Advanced filtering and pagination
- 📋 **Application Tracker** - Kanban-style job application management
- 📄 **Resume Analyzer** - ML-powered resume analysis and optimization
- 🤖 **LLM Features** - Cover letters, interview prep, job analysis
- 🎨 **Dark Mode** - System-aware dark/light themes
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 📱 **Responsive** - Mobile-first design

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Client-side routing
- **Recharts** - Data visualization

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000`.

Start the backend server:
```bash
python -m jsa.cli api --port 8000
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── api/            # API client functions
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions
│   └── assets/         # Images, icons, etc.
├── public/             # Static assets
├── index.html          # HTML entry point
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
└── tailwind.config.js  # Tailwind configuration
```

## Privacy

- All data processing happens locally
- No external analytics or tracking
- API calls only to local backend
- Optional LLM features with clear warnings
