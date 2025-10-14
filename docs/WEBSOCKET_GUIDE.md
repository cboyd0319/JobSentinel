# WebSocket Real-Time Updates Guide

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Status:** Production Ready

---

## Overview

JobSentinel now supports **real-time WebSocket connections** for instant job updates. Get notified immediately when:
- New jobs are found and added to the database
- Existing jobs are updated
- Scraping operations start or complete
- System events occur

**Key Features:**
- ✅ Real-time bidirectional communication
- ✅ Automatic reconnection with exponential backoff
- ✅ Message filtering by type
- ✅ Heartbeat/ping-pong keep-alive
- ✅ Connection state management
- ✅ 100% privacy-first (all local, no external connections)
- ✅ Production-ready with comprehensive error handling

---

## WebSocket Endpoint

### Connection URL

```
ws://localhost:8000/api/v1/ws/jobs
```

For production deployments, use your server's hostname:
```
ws://your-server.com:8000/api/v1/ws/jobs
```

### Connection Lifecycle

1. **Connect:** Client initiates WebSocket connection
2. **Handshake:** Server accepts and sends connection confirmation
3. **Active:** Client receives real-time updates, can send pings
4. **Disconnect:** Connection closed gracefully or due to error

---

## Message Types

All messages follow this structure:

```typescript
{
  type: string        // Message type identifier
  timestamp: string   // ISO 8601 timestamp
  data: object        // Message-specific data
}
```

### Server → Client Messages

#### 1. Connected
Sent immediately after successful connection.

```json
{
  "type": "connected",
  "timestamp": "2025-10-14T00:00:00Z",
  "data": {
    "message": "Connected to JobSentinel WebSocket",
    "version": "0.6.0"
  }
}
```

#### 2. New Job
Sent when a new job is found and added to the database.

```json
{
  "type": "new_job",
  "timestamp": "2025-10-14T00:01:23Z",
  "data": {
    "job_id": 123,
    "title": "Senior Backend Engineer",
    "company": "TechCorp",
    "location": "Remote",
    "score": 0.95,
    "url": "https://..."
  }
}
```

#### 3. Job Updated
Sent when an existing job's details are updated.

```json
{
  "type": "job_updated",
  "timestamp": "2025-10-14T00:02:45Z",
  "data": {
    "job_id": 123,
    "changes": ["score", "description"],
    "new_score": 0.97
  }
}
```

#### 4. Scrape Started
Sent when a scraping operation begins.

```json
{
  "type": "scrape_started",
  "timestamp": "2025-10-14T00:05:00Z",
  "data": {
    "source": "greenhouse",
    "expected_duration_seconds": 30
  }
}
```

#### 5. Scrape Completed
Sent when a scraping operation finishes.

```json
{
  "type": "scrape_completed",
  "timestamp": "2025-10-14T00:05:32Z",
  "data": {
    "source": "greenhouse",
    "jobs_found": 42,
    "new_jobs": 10,
    "updated_jobs": 5,
    "duration_seconds": 32.5,
    "errors": 0
  }
}
```

#### 6. Heartbeat
Keep-alive message sent every 30 seconds.

```json
{
  "type": "heartbeat",
  "timestamp": "2025-10-14T00:06:00Z",
  "data": {}
}
```

#### 7. Subscribed
Confirmation of subscription to specific event types.

```json
{
  "type": "subscribed",
  "timestamp": "2025-10-14T00:00:05Z",
  "data": {
    "events": ["new_job", "scrape_completed"]
  }
}
```

#### 8. Pong
Response to client ping.

```json
{
  "type": "pong",
  "timestamp": "2025-10-14T00:07:00Z",
  "data": {}
}
```

### Client → Server Messages

#### 1. Ping
Keep connection alive, test connectivity.

```json
{
  "type": "ping",
  "timestamp": "2025-10-14T00:07:00Z"
}
```

#### 2. Subscribe
Filter messages by type (optional).

```json
{
  "type": "subscribe",
  "events": ["new_job", "scrape_completed"]
}
```

---

## React Hook Usage

JobSentinel provides a ready-to-use React hook: `useWebSocket`

### Basic Example

```tsx
import { useWebSocket } from '@/hooks/useWebSocket'

function Dashboard() {
  const { state, lastMessage, messages } = useWebSocket()

  return (
    <div>
      <p>Connection: {state}</p>
      {lastMessage && (
        <div>
          <h3>Latest Update</h3>
          <p>Type: {lastMessage.type}</p>
          <pre>{JSON.stringify(lastMessage.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

### Advanced Example with Filtering

```tsx
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect } from 'react'

function JobMonitor() {
  const {
    state,
    lastMessage,
    messages,
    send,
    clearMessages,
  } = useWebSocket({
    messageTypes: ['new_job', 'scrape_completed'],
    reconnect: true,
    maxReconnectAttempts: 10,
    onConnectionChange: (newState) => {
      console.log('Connection state changed:', newState)
    },
  })

  useEffect(() => {
    if (lastMessage?.type === 'new_job') {
      // Show notification
      const job = lastMessage.data
      new Notification('New Job Found!', {
        body: `${job.title} at ${job.company}`,
      })
    }
  }, [lastMessage])

  return (
    <div>
      <div className="status">
        <span className={`indicator ${state}`} />
        {state}
      </div>

      <button onClick={() => send({ type: 'ping' })}>
        Test Connection
      </button>

      <button onClick={clearMessages}>
        Clear History
      </button>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <span className="type">{msg.type}</span>
            <span className="time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Hook Options

```typescript
interface UseWebSocketOptions {
  /** WebSocket URL (default: ws://localhost:8000/api/v1/ws/jobs) */
  url?: string

  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean

  /** Max reconnection attempts (default: 5) */
  maxReconnectAttempts?: number

  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number

  /** Heartbeat interval in seconds (default: 30) */
  heartbeatInterval?: number

  /** Message filter - only receive messages of these types */
  messageTypes?: string[]

  /** Callback for connection state changes */
  onConnectionChange?: (state: ConnectionState) => void
}
```

### Hook Return Values

```typescript
interface UseWebSocketReturn {
  /** Current connection state */
  state: ConnectionState  // 'connecting' | 'connected' | 'disconnected' | 'error'

  /** Latest received message */
  lastMessage: WebSocketMessage | null

  /** All received messages (limited to last 100) */
  messages: WebSocketMessage[]

  /** Send a message to the server */
  send: (message: Record<string, any>) => void

  /** Manually connect */
  connect: () => void

  /** Manually disconnect */
  disconnect: () => void

  /** Clear message history */
  clearMessages: () => void
}
```

---

## Python Backend Usage

### Broadcasting Job Updates

```python
from jsa.fastapi_app.routers.websocket import broadcast_job_update

# When a new job is found
await broadcast_job_update(
    "new_job",
    {
        "job_id": job.id,
        "title": job.title,
        "company": job.company,
        "score": job.score,
        "url": job.url,
    }
)
```

### Broadcasting Scrape Events

```python
from jsa.fastapi_app.routers.websocket import broadcast_scrape_event

# When scraping starts
await broadcast_scrape_event(
    "scrape_started",
    source="greenhouse",
    data={"expected_duration": 30}
)

# When scraping completes
await broadcast_scrape_event(
    "scrape_completed",
    source="greenhouse",
    data={
        "jobs_found": 42,
        "new_jobs": 10,
        "updated_jobs": 5,
        "duration_seconds": 32.5,
        "errors": 0,
    }
)
```

---

## Testing WebSocket Connection

### Using `wscat` (CLI Tool)

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/api/v1/ws/jobs

# Send ping
> {"type": "ping"}

# Subscribe to specific events
> {"type": "subscribe", "events": ["new_job"]}
```

### Using Browser Console

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/jobs')

ws.onopen = () => {
  console.log('Connected!')
  // Send ping
  ws.send(JSON.stringify({ type: 'ping' }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log('Received:', message)
}

ws.onerror = (error) => {
  console.error('Error:', error)
}

ws.onclose = () => {
  console.log('Disconnected')
}
```

---

## Security & Privacy

### Privacy Guarantees

- ✅ **100% Local:** All WebSocket traffic stays on your machine or local network
- ✅ **No External Connections:** No data sent to third parties
- ✅ **No Tracking:** No analytics or telemetry
- ✅ **No Logging:** Message content not logged by default (only metadata)

### Security Features

- ✅ **Rate Limiting:** Prevents abuse (100 req/min, 1000 req/hour)
- ✅ **Connection Limits:** Automatic cleanup of stale connections
- ✅ **Input Validation:** All messages validated before processing
- ✅ **Error Handling:** Graceful degradation on errors

### Production Recommendations

For production deployments:

1. **Use WSS (WebSocket Secure)**
   ```
   wss://your-domain.com/api/v1/ws/jobs
   ```

2. **Add Authentication**
   - API key in connection URL
   - JWT token validation
   - Session-based auth

3. **Enable CORS Properly**
   ```python
   # In .env
   CORS_ORIGINS=https://your-frontend.com
   ```

4. **Monitor Connections**
   - Track active connections
   - Set connection limits
   - Log connection events

---

## Troubleshooting

### Connection Fails Immediately

**Problem:** WebSocket connection refused.

**Solutions:**
1. Ensure FastAPI server is running: `python -m jsa.cli api`
2. Check port availability: `lsof -i :8000`
3. Verify WebSocket endpoint: `curl -i http://localhost:8000/api/v1/ws/jobs`
4. Check firewall settings

### Disconnects After 30 Seconds

**Problem:** Connection drops after inactivity.

**Solutions:**
1. Ensure heartbeat is enabled (default: 30s)
2. Check proxy/load balancer timeouts
3. Verify network stability

### Messages Not Received

**Problem:** Connected but no messages.

**Solutions:**
1. Check message filtering: Remove `messageTypes` filter
2. Verify scraper is running: `python -m jsa.cli run-once`
3. Check server logs for errors
4. Test with `wscat` to isolate client issues

### Reconnection Loop

**Problem:** Constantly reconnecting.

**Solutions:**
1. Check server health: `curl http://localhost:8000/api/v1/health`
2. Review server logs for errors
3. Reduce `maxReconnectAttempts` or disable `reconnect`
4. Check network stability

---

## Performance Considerations

### Message Volume

- **Low:** 1-10 messages/minute (typical personal use)
- **Medium:** 10-100 messages/minute (active scraping)
- **High:** 100+ messages/minute (multiple sources, frequent updates)

### Memory Usage

- Frontend: ~1MB per 100 messages (automatically limited)
- Backend: ~100KB per active connection

### Scaling

For high-volume deployments:

1. **Use Message Filtering:** Only subscribe to needed events
2. **Clear Message History:** Regularly call `clearMessages()`
3. **Connection Pooling:** Limit concurrent connections
4. **Redis Pub/Sub:** For multi-server deployments

---

## Examples

### Real-Time Job Dashboard

```tsx
import { useWebSocket } from '@/hooks/useWebSocket'
import { useState } from 'react'

function LiveJobFeed() {
  const [jobs, setJobs] = useState([])
  const { state, lastMessage } = useWebSocket({
    messageTypes: ['new_job'],
  })

  useEffect(() => {
    if (lastMessage?.type === 'new_job') {
      setJobs((prev) => [lastMessage.data, ...prev].slice(0, 20))
    }
  }, [lastMessage])

  return (
    <div>
      <h2>Live Job Feed ({state})</h2>
      {jobs.map((job) => (
        <div key={job.job_id} className="job-card">
          <h3>{job.title}</h3>
          <p>{job.company} • Score: {job.score}</p>
        </div>
      ))}
    </div>
  )
}
```

### Scraper Status Monitor

```tsx
import { useWebSocket } from '@/hooks/useWebSocket'

function ScraperMonitor() {
  const [scrapers, setScrapers] = useState({})
  const { lastMessage } = useWebSocket({
    messageTypes: ['scrape_started', 'scrape_completed'],
  })

  useEffect(() => {
    if (!lastMessage) return

    const { type, data } = lastMessage
    const { source } = data

    if (type === 'scrape_started') {
      setScrapers((prev) => ({
        ...prev,
        [source]: { status: 'running', startTime: Date.now() }
      }))
    } else if (type === 'scrape_completed') {
      setScrapers((prev) => ({
        ...prev,
        [source]: { 
          status: 'completed',
          ...data
        }
      }))
    }
  }, [lastMessage])

  return (
    <div>
      <h2>Scraper Status</h2>
      {Object.entries(scrapers).map(([source, info]) => (
        <div key={source}>
          <strong>{source}:</strong> {info.status}
          {info.jobs_found && ` (${info.new_jobs} new jobs)`}
        </div>
      ))}
    </div>
  )
}
```

---

## See Also

- [FastAPI Guide](FASTAPI_GUIDE.md) - Backend API documentation
- [React Frontend Guide](REACT_FRONTEND_GUIDE.md) - Frontend architecture
- [Architecture](ARCHITECTURE.md) - System design overview

---

**Last Updated:** October 14, 2025  
**Next Review:** January 2026  
**Status:** Production Ready
