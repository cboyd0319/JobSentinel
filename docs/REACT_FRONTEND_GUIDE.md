# React Frontend Guide

Modern, privacy-first React SPA for JobSentinel.

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Visit application
open http://localhost:3000
```

## Architecture

### Tech Stack

- **React 19** - Latest React with improved performance and concurrent features ✨ NEW
- **TypeScript 5.7** - Type-safe development with latest features
- **Vite 7** - Lightning-fast dev server and build tool ✨ NEW
- **Tailwind CSS 4** - Modern utility-first CSS framework with @theme directive ✨ NEW
- **React Query 5** - Server state management and caching
- **Zustand 5** - Lightweight client state management
- **React Router 7** - Client-side routing with improved APIs
- **Recharts 2** - Data visualization
- **Axios 1.7** - HTTP client with interceptors
- **WebSocket Support** - Real-time job updates ✨ NEW

### Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── Layout.tsx     # Main layout with navigation
│   ├── pages/             # Route pages
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── Jobs.tsx       # Job search interface
│   │   ├── Tracker.tsx    # Application tracker
│   │   ├── Resume.tsx     # Resume analyzer
│   │   ├── LLMFeatures.tsx# LLM-powered features
│   │   └── Settings.tsx   # Settings panel
│   ├── api/               # API client
│   │   └── client.ts      # Axios instance and interceptors
│   ├── types/             # TypeScript definitions
│   │   └── index.ts       # Shared types
│   ├── hooks/             # Custom React hooks (future)
│   ├── utils/             # Helper functions (future)
│   ├── assets/            # Images, icons (future)
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Root component with routes
│   └── index.css          # Global styles + Tailwind
├── public/                # Static assets
├── index.html             # HTML entry point
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── postcss.config.js      # PostCSS configuration
```

## Development

### Running the App

```bash
# Start dev server (with hot reload)
npm run dev

# Type check
npm run type-check

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Integration

The frontend connects to the FastAPI backend via proxy:

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

**Start backend before frontend:**
```bash
# Terminal 1: Backend
python -m jsa.cli api --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

### State Management

#### Server State (React Query)

```typescript
import { useQuery } from '@tanstack/react-query'

// Fetch data with automatic caching
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => api.get('/jobs'),
})
```

#### Client State (Zustand)

Future implementation for:
- UI state (sidebar open/closed)
- User preferences
- Selected items

### Routing

```typescript
// src/App.tsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="jobs" element={<Jobs />} />
    <Route path="tracker" element={<Tracker />} />
    <Route path="resume" element={<Resume />} />
    <Route path="llm" element={<LLMFeatures />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

## Components

### Layout

Main application layout with navigation and footer.

```typescript
<Layout>
  <Outlet /> {/* Child routes render here */}
</Layout>
```

Features:
- Responsive navigation
- Active link highlighting
- Dark mode toggle (future)
- Privacy footer

### Dashboard

Main landing page showing:
- Job statistics (total, high-score, recent)
- ML features status
- LLM providers status
- Quick actions

### Pages (Placeholder)

Other pages are ready for implementation:
- **Jobs** - Advanced job search with filters
- **Tracker** - Kanban-style application tracking
- **Resume** - Resume analyzer with ML
- **LLM Features** - AI-powered job search tools
- **Settings** - User preferences and API keys

## Styling

### Tailwind CSS 4 ✨ NEW

**Major Changes from v3:**
- CSS-based theme configuration using `@theme` directive
- Simplified `tailwind.config.js`
- Better performance and smaller bundle sizes
- Native CSS imports instead of PostCSS directives

**Configuration:**

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Custom Colors */
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;

  /* Custom Animations */
  --animate-fade-in: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```

**Simplified Config:**
```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  // Theme configuration moved to @theme in index.css
  plugins: [],
}
```

### Custom Classes

```css
/* Global utility classes */
.btn { @apply px-4 py-2 rounded-lg font-medium; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.card { @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-6; }
.input { @apply w-full px-3 py-2 border rounded-lg; }
```

### Dark Mode

```typescript
// Toggle dark mode (future)
document.documentElement.classList.toggle('dark')
```

## Type Safety

### API Types

```typescript
// src/types/index.ts
export interface Job {
  id: number
  title: string
  company: string
  score: number
  // ...
}

export interface HealthResponse {
  status: string
  total_jobs: number
  // ...
}
```

### API Client

```typescript
// src/api/client.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// Automatic response unwrapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)
```

## Accessibility

### WCAG 2.1 AA Compliance

- ✅ Semantic HTML elements
- ✅ ARIA labels and roles (ready)
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Color contrast (4.5:1 minimum)
- ✅ Responsive text sizing

### Screen Reader Support

```typescript
<button aria-label="Search jobs">
  <SearchIcon />
</button>

<nav aria-label="Main navigation">
  {/* navigation links */}
</nav>
```

## Performance

### Vite Optimization

- ⚡ Hot Module Replacement (HMR)
- 📦 Tree-shaking
- 🗜️ Code splitting
- 🎯 Lazy loading (future)

### React Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

## Production Build

### Build Process

```bash
# Build for production
npm run build

# Output: ../static/frontend/
# - Minified JS bundles
# - Optimized CSS
# - Compressed assets
# - Source maps
```

### Deployment

The build outputs to `../static/frontend/` which can be served by:

1. **FastAPI Static Files** (built-in)
2. **Nginx** (reverse proxy)
3. **CDN** (e.g., Cloudflare)

### Environment Variables

```bash
# .env.production
VITE_API_URL=http://localhost:8000
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Testing (Future)

Planned testing setup:

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

Libraries:
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing

## Privacy Features

- ✅ No external analytics
- ✅ No tracking scripts
- ✅ All API calls to local backend
- ✅ Optional external LLM with clear warnings
- ✅ Data stays local by default

## Troubleshooting

### Port Already in Use

```bash
# Change port
npm run dev -- --port 3001
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors

```bash
# Check types
npm run type-check

# Update types
npm install --save-dev @types/react@latest
```

### API Connection Issues

```bash
# Verify backend is running
curl http://localhost:8000/api/v1/health

# Check proxy configuration in vite.config.ts
```

## Future Enhancements

### Phase 1 (Current)
- [x] Dashboard with stats
- [x] Basic navigation
- [x] API integration
- [x] Dark mode styling

### Phase 2 (Next)
- [ ] Job search with filters
- [ ] Application tracker (Kanban)
- [ ] Resume analyzer UI
- [ ] LLM features UI

### Phase 3 (Completed ✅)
- [x] Real-time updates (WebSocket) ✨ NEW
- [ ] Advanced visualizations
- [ ] Offline support (PWA)
- [ ] Mobile app (React Native)

### Phase 4 (Future)
- [ ] WebSocket integration in all pages
- [ ] Real-time job notifications
- [ ] Live scraper status updates
- [ ] Interactive charts with real-time data

## Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [React Query Documentation](https://tanstack.com/query/latest)

## See Also

- [FastAPI Guide](FASTAPI_GUIDE.md)
- [LLM Guide](LLM_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
