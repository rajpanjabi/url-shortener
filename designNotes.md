# Full Stack Development Notes

## Table of Contents
1. [Node.js Module Systems](#nodejs-module-systems)
2. [Express Middleware](#express-middleware)
3. [Database - PostgreSQL](#database-postgresql)
4. [Redis](#redis)
5. [URL Shortening](#url-shortening)
6. [React 101](#react-101)
7. [Redux 101](#redux-101)
8. [Docker](#docker)
9. [Nginx](#nginx)
10. [Docker Compose](#docker-compose)
11. [Terraform](#terraform)
12. [Networking 101](#networking-101)

---

## Node.js Module Systems

### Import vs Require

By default, Node.js uses `require` (CommonJS). To use `import` statements, you need to add `"type": "module"` in your `package.json`.

#### require (CommonJS Modules)

**Characteristics:**
- **Synchronous Loading**: `require` loads modules synchronously, meaning program execution pauses until the module is fully loaded and processed
- **Dynamic Loading**: Can be called conditionally and dynamically from anywhere in the code. The module path can be determined at runtime
- **Still prevalent** in many existing Node.js projects, especially older ones
- Suitable for situations where synchronous loading or dynamic module paths are necessary

**Usage:**
```javascript
const fs = require('fs');
const myModule = require('./myModule.js');

// Dynamic require (runtime determined)
const moduleName = condition ? 'moduleA' : 'moduleB';
const myModule = require(`./${moduleName}`);
```

**Exports:**
```javascript
// Exporting
module.exports = myFunction;
// or
exports.propertyName = value;
```

#### import (ES Modules - ESM)

**Characteristics:**
- **Asynchronous Loading**: Designed for asynchronous loading, especially beneficial for modern applications and browser environments
- **Static Analysis**: Import statements are hoisted to the top of the file and parsed during the initial loading phase, allowing for static analysis and optimization by tools
- **Modern and Preferred**: The recommended approach for new Node.js projects and browser environments
- **Benefits**: Offers static analysis, tree-shaking, and better integration with modern JavaScript features

**Usage:**
```javascript
import fs from 'fs';
import { myFunction } from './myModule.js';
import * as myModule from './myModule.js';
```

**When to use what:**
- **require**: Legacy codebases, dynamic imports, or when you need synchronous loading
- **import**: New projects, modern JavaScript, when you want tree-shaking and better tooling support

---

## Express Middleware

### cors (Cross-Origin Resource Sharing)

**Why we need it:**
Since backend and frontend run on different ports (e.g., backend on `localhost:5000`, frontend on `localhost:3000`), the browser blocks requests from one domain to another to maintain security. This is the browser's Same-Origin Policy.

**What it does:**
CORS is a middleware that enables Cross-Origin Resource Sharing, telling the browser "it's okay to accept requests from this origin."

**Usage:**
```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend
  credentials: true
}));
```

### helmet

**What it does:**
Security middleware that sets various HTTP headers to protect against common web vulnerabilities.

Think of it as: **A security guard that adds protective headers to every response**

**Usage:**
```javascript
import helmet from 'helmet';

app.use(helmet());
```

**Headers it sets:**
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Strict-Transport-Security` - Enforces HTTPS

### compression

**What it does:**
Middleware that compresses response bodies (gzip/deflate), making responses smaller and faster to transfer.

**Usage:**
```javascript
import compression from 'compression';

app.use(compression());
```

### express-rate-limit

**What it does:**
Middleware to limit repeated requests from the same IP. Prevents abuse by limiting how many requests an IP can make in a time window.

**Usage:**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### The Flow

```
Request → cors → helmet → compression → rate-limit → Your Routes
```

---

## Database - PostgreSQL

### Why PostgreSQL?

We're using PostgreSQL, which is a **relational database** (structured data with tables, rows, columns, and relationships).

### Pool vs Client

#### Client

**When to use:**
- Single, one-off connections
- Scripts or data migration tasks
- Setup scripts

**Characteristics:**
- Establishes a **single connection**
- You need to **manually manage** the connection lifecycle (connect and disconnect)

**Usage:**
```javascript
import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});

await client.connect();
const result = await client.query('SELECT * FROM users');
await client.end(); // Manual cleanup
```

#### Pool (Recommended for Apps)

**When to use:**
- Production applications
- APIs with multiple concurrent requests
- When you need efficiency and auto-management

**Characteristics:**
- Manages a **pool of multiple connections**
- **Reuses** existing connections for multiple requests
- Keeps a few **idle connections** ready for new requests
- Prevents overwhelming the DB by limiting max concurrent connections
- **Automatically handles** timeouts, disconnections, and recovery
- **Connection lifecycle is auto-managed**

**Why Pool is better for APIs:**
Instead of creating a new database connection every time an API call happens, a pool:
1. Reuses existing connections
2. Keeps idle connections ready
3. Limits max connections (e.g., `max: 20`)
4. Auto-recovers from errors

**Creating a Connection Pool:**
```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                      // Maximum number of clients in pool
  idleTimeoutMillis: 30000,     // Close idle clients after 30s
  connectionTimeoutMillis: 2000 // Return error if connection takes > 2s
});

// Using the pool
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
// No need to manually connect/disconnect!
```

### Pool Events

**Two main events to handle:**

1. **`connect` event**: Fires whenever a new connection is established
2. **`error` event**: Ensures that if something bad happens (e.g., connection lost), the app logs it and exits gracefully

```javascript
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1); // Exit process on critical error
});
```

### Initialize Database Function

```javascript
async function initDatabase() {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database initialized successfully');
    
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(10) UNIQUE NOT NULL,
        long_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(-1);
  }
}
```

### Using psql in Terminal

```bash
# Connect to PostgreSQL
psql -U postgres

# Common commands
\l          # List all databases
\c dbname   # Connect to database
\dt         # List all tables
\d table    # Describe table structure
\q          # Quit
```

---

## Redis

### What is Redis?

Redis is a **high-performance, in-memory data store**. It's often used for caching, session storage, rate limiting, pub/sub messaging, and more.

### Key Characteristics

1. **In-memory**: Data is stored in RAM → extremely fast reads/writes
2. **Key-value store**: Everything is stored as key-value pairs
3. **Persistence optional**: Can persist data to disk using RDB (snapshots) or AOF (append-only file)
4. **Rich data structures**: Supports strings, hashes, lists, sets, sorted sets, bitmaps, and more
5. **Single-threaded**: Uses an event loop → fast for most workloads
6. **TTL support**: You can set expiration on keys (`EXPIRE`) → great for caching

### node-redis

**node-redis** is the official Redis client for Node.js/JavaScript.

**Usage:**
```javascript
import { createClient } from 'redis';

const redisClient = createClient({
  host: 'localhost',
  port: 6379
});

await redisClient.connect();

// Set with expiration (cache for 1 hour)
await redisClient.setEx('user:123', 3600, JSON.stringify(userData));

// Get
const cachedData = await redisClient.get('user:123');

// Delete
await redisClient.del('user:123');
```

**Common use cases:**
- **Caching**: Store frequently accessed data
- **Session storage**: Store user sessions
- **Rate limiting**: Track request counts per user/IP
- **Pub/Sub**: Real-time messaging
- **Leaderboards**: Using sorted sets

---

## URL Shortening

### Why Base62?

When generating short codes for URLs, we have two main approaches:

1. **Hashing** (inefficient for our use case)
   - Hash functions generate ~32 character outputs (way too long!)
   - Need to handle hash collisions
   - Not ideal for short URLs

2. **Base62** (our choice) ✅
   - Uses 62 characters: `0-9a-zA-Z` (10 digits + 26 lowercase + 26 uppercase)
   - **7 characters** = 62^7 = **~3.5 trillion unique combinations**
   - No collision handling needed (extremely unlikely)
   - Clean and readable URLs

### How Base62 Works

```javascript
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(num) {
  if (num === 0) return BASE62_CHARS[0];
  
  let result = '';
  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

// Example: Convert ID 12345 to base62
console.log(toBase62(12345)); // Output: "3D7"
```

### Using nanoid Library

Instead of implementing Base62 ourselves, we use the **nanoid** library for generating unique short codes:

```javascript
import { nanoid } from 'nanoid';

// Generate a 7-character unique ID
const shortCode = nanoid(7); // e.g., "V1StGXR"

// Store in database
await pool.query(
  'INSERT INTO urls (short_code, long_url) VALUES ($1, $2)',
  [shortCode, longUrl]
);
```

**Why nanoid?**
- Fast and secure
- Customizable length
- URL-safe characters
- Cryptographically random
- Tiny library size

---

## React 101

### What is React?

React is a JavaScript library for building user interfaces, particularly single-page applications.

### JSX (JavaScript XML)

**JSX allows you to write HTML inside JavaScript:**

```javascript
const element = <h1>Hello, World!</h1>;

// With JavaScript expressions
const name = "Raj";
const element = <h1>Hello, {name}!</h1>;

// Multiple lines
const element = (
  <div>
    <h1>Welcome</h1>
    <p>This is JSX</p>
  </div>
);
```

### Components

**Components are reusable blocks of UI:**

```javascript
// Function component
function Navbar() {
  return (
    <nav>
      <h1>My App</h1>
      <ul>
        <li>Home</li>
        <li>About</li>
      </ul>
    </nav>
  );
}

// Using the component
function App() {
  return (
    <div>
      <Navbar />  {/* Reusable! */}
      <Content />
    </div>
  );
}
```

### Props (Properties)

**Just like function parameters, we can pass data to components:**

```javascript
// Passing props
<Content name="Raj" age={23} />

// Receiving props
function Content(props) {
  return (
    <div>
      <p>Name: {props.name}</p>
      <p>Age: {props.age}</p>
    </div>
  );
}

// Or using destructuring (cleaner)
function Content({ name, age }) {
  return (
    <div>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
    </div>
  );
}
```

### State Management

**There are parts of the page that change dynamically. To manage them, we use state.**

**Example: Counter**

```javascript
import { useState } from 'react';

function Counter() {
  // useState returns [value, setter_function]
  const [count, setCount] = useState(0); // 0 is initial value
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}
```

**Key points:**
- `count` is the state variable (holds the value)
- `setCount` is the function to update the state
- `0` is the initial value
- Never modify state directly! Always use the setter function

### React Hooks

**Hooks are special functions to use React features like state and effects.**

Common hooks:
- `useState` - Add state to functional components
- `useEffect` - Perform side effects (API calls, subscriptions, timers)
- `useContext` - Access context values
- `useRef` - Access DOM elements or persist values
- `useMemo` - Memoize expensive calculations
- `useCallback` - Memoize functions

**useEffect Example:**

```javascript
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // This runs after component mounts or when userId changes
    async function fetchUser() {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
      setLoading(false);
    }
    
    fetchUser();
  }, [userId]); // Dependency array - runs when userId changes
  
  if (loading) return <p>Loading...</p>;
  
  return <div>{user.name}</div>;
}
```

### Virtual DOM

**What is DOM?**

DOM (Document Object Model) is a programming interface for web documents. It represents the entire document as a tree of nodes, where nodes are the parts of the page like elements, text, and attributes.

The browser uses the DOM to render the webpage, and JavaScript can dynamically interact with it to change or update content.

**Problem:** Direct manipulation of the Real DOM is computationally expensive.

**Solution:** Virtual DOM

### How Virtual DOM Works

The **Virtual DOM (VDOM)** in React is a lightweight, in-memory representation of the Real DOM. It's a programming concept where a "virtual" representation of the UI is kept in memory and synced with the "real" DOM by React.

**The Update Process:**

```
1. Initial Render
   ↓
   React creates Virtual DOM tree
   ↓
   Renders to Real DOM

2. State/Props Change
   ↓
   React creates NEW Virtual DOM tree
   ↓
   Compares with OLD Virtual DOM (Diffing)
   ↓
   Calculates minimum changes needed (Reconciliation)
   ↓
   Updates ONLY changed parts in Real DOM
```

**Example:**

```javascript
// Initial state
<div>
  <h1>Count: 0</h1>
  <button>Increment</button>
</div>

// After clicking button (count becomes 1)
// React only updates the text node "0" → "1"
// The <div>, <h1>, and <button> elements remain untouched!
```

**Benefits:**
- **Faster updates** - Only changes what's necessary
- **Better performance** - Batches multiple updates
- **Smoother UX** - More responsive user experience

### Conditional Rendering

**Show different UI based on conditions:**

```javascript
function Greeting({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <Login />
      )}
    </div>
  );
}

// Or with &&
function Notification({ hasMessages, messageCount }) {
  return (
    <div>
      {hasMessages && <p>You have {messageCount} new messages</p>}
    </div>
  );
}
```

---

## Redux 101

### What is Redux?

Redux is a **state management library** for JavaScript apps. It provides a centralized store for state that needs to be shared across your entire application.

### Why Do We Need Redux?

**The Problem: Prop Drilling**

```
App (has state: user data)
 ├─ Header (doesn't need user)
 │   └─ Navigation (doesn't need user)
 │       └─ UserMenu (NEEDS user) ❌
 │
 └─ Dashboard (doesn't need user)
     └─ Sidebar (doesn't need user)
         └─ UserProfile (NEEDS user) ❌

// We have to pass props through multiple levels!
```

**The Solution: Redux**

```
App
 ├─ Header
 │   └─ Navigation
 │       └─ UserMenu ← Subscribes directly to Redux store ✅
 │
 └─ Dashboard
     └─ Sidebar
         └─ UserProfile ← Subscribes directly to Redux store ✅

Redux Store (centralized)
 └─ user: { name: "Raj", loggedIn: true }
```

### Benefits of Redux

- **No prop drilling** - Components access state directly from the store
- **Easier debugging** - All state changes are tracked
- **Better scalability** - Organized state management
- **Time-travel debugging** - Can replay actions
- **Predictable state** - State updates follow strict patterns

### Redux Architecture

```
User Action (click button)
    ↓
Event Handler (dispatch action)
    ↓
Redux Store (doesn't know how to handle it)
    ↓
Reducer Function (updates state)
    ↓
Redux Store (updated state)
    ↓
Subscribed Components (re-render)
```

### Core Concepts

#### 1. State

**The single source of truth for our app. Stored in a store.**

```javascript
// Example state structure
{
  user: {
    name: "Raj",
    loggedIn: true,
    email: "raj@example.com"
  },
  urls: [
    { id: 1, longUrl: "https://example.com/very/long/url", shortCode: "abc123" },
    { id: 2, longUrl: "https://another.com/url", shortCode: "xyz789" }
  ],
  loading: false,
  error: null
}
```

#### 2. Actions

**Actions describe what happened in our app. They are plain JavaScript objects with a `type` and optional `payload`.**

Think of actions as **events** or **messages**.

```javascript
// Action types (string constants - labels for messages)
const ADD_URL = 'ADD_URL';

// Action object
const addUrlAction = {
  type: ADD_URL,
  payload: {
    id: 1,
    longUrl: "https://example.com/long",
    shortCode: "abc123"
  }
};
```

#### 3. Action Types (REQUEST/SUCCESS/FAILURE Pattern)

**For async operations, we use 3 action types to show different UI states:**

```javascript
export const CREATE_URL_REQUEST = 'CREATE_URL_REQUEST';  // "Starting..."
export const CREATE_URL_SUCCESS = 'CREATE_URL_SUCCESS';  // "Done!"
export const CREATE_URL_FAILURE = 'CREATE_URL_FAILURE';  // "Error!"
```

**Why 3 actions?**

```
REQUEST → Show loading spinner
SUCCESS → Hide spinner, show data
FAILURE → Hide spinner, show error message
```

**User flow:**

```javascript
// 1. User clicks "Shorten URL" button
dispatch({ type: CREATE_URL_REQUEST }); // UI shows loading spinner

// 2. API call happens (in background)
try {
  const response = await api.createShortUrl(longUrl);
  
  // 3. Success!
  dispatch({
    type: CREATE_URL_SUCCESS,
    payload: response.data
  }); // UI hides spinner, shows success
} catch (error) {
  // 3. Error!
  dispatch({
    type: CREATE_URL_FAILURE,
    payload: error.message
  }); // UI hides spinner, shows error
}
```

#### 4. Action Creators

**A function that creates actions (makes code cleaner and reusable).**

**Without action creator (repetitive):**
```javascript
// Every time we want to create a URL, we write:
dispatch({ type: 'CREATE_URL_REQUEST' });
dispatch({ type: 'CREATE_URL_SUCCESS', payload: data });
// Repetitive! 😫
```

**With action creator (clean):**
```javascript
// Define once
export const createShortUrl = (longUrl) => {
  return async (dispatch) => {
    // 1. Send "Starting" message
    dispatch({ type: CREATE_URL_REQUEST });
    
    try {
      // 2. Do the actual work (API call)
      const response = await api.createShortUrl(longUrl);
      
      // 3. Send "Success" message with data
      dispatch({ 
        type: CREATE_URL_SUCCESS, 
        payload: response.data 
      });
    } catch (error) {
      // 4. Send "Failed" message with error
      dispatch({ 
        type: CREATE_URL_FAILURE, 
        payload: error.message 
      });
    }
  };
};

// Use anywhere
dispatch(createShortUrl('https://example.com/long-url'));
// Clean! 😊
```

#### 5. Reducers

**Reducers specify how the state changes in response to an action.**

**Rules:**
- **Pure functions** - Same input always gives same output
- **No side effects** - No API calls, no mutations
- **No direct state mutation** - Always return new state

```javascript
const initialState = {
  urls: [],
  loading: false,
  error: null,
  total: 0
};

function urlReducer(state = initialState, action) {
  switch(action.type) {
    case CREATE_URL_REQUEST:
      return {
        ...state,        // Keep existing state
        loading: true,   // Update loading
        error: null      // Clear previous errors
      };
    
    case CREATE_URL_SUCCESS:
      return {
        ...state,
        loading: false,
        urls: [...state.urls, action.payload], // Add new URL
        total: state.total + 1
      };
    
    case CREATE_URL_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    default:
      return state; // Always return current state for unknown actions
  }
}
```

**Why spread operator `...state` is crucial:**

```javascript
// ❌ WITHOUT spread - LOSES data!
return { loading: false };
// Result: { loading: false }
// Lost: urls, total, error!

// ✅ WITH spread - KEEPS everything!
return { ...state, loading: false };
// Result: { urls: [...], total: 5, loading: false, error: null }
// Kept everything, only updated loading!
```

#### 6. Store

**The actual place where all states are maintained.**

```javascript
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

// Create store with reducer and middleware
const store = createStore(
  rootReducer,
  applyMiddleware(thunk) // Allows async actions
);

export default store;
```

**What is Thunk?**

**Without thunk:**
```javascript
// You can only dispatch plain objects ❌
dispatch({ type: 'ADD_URL', payload: url });
```

**With thunk:**
```javascript
// You can dispatch FUNCTIONS that do async stuff ✅
dispatch(async (dispatch) => {
  const data = await fetchFromAPI();
  dispatch({ type: 'SUCCESS', payload: data });
});
```

Thunk is middleware that allows action creators to return functions instead of plain objects, enabling async operations.

### Redux Flow

```
Component
    ↓
  User clicks button
    ↓
  dispatch(action)
    ↓
Redux Store
    ↓
  Passes to Reducer
    ↓
Reducer
    ↓
  Returns new state
    ↓
Redux Store
    ↓
  Updates state
    ↓
Component
    ↓
  Re-renders with new data
```

### Redux Hooks

#### useSelector - Read data from store

```javascript
import { useSelector } from 'react-redux';

function UrlList() {
  // useSelector passes the ENTIRE store to your function
  const urls = useSelector(state => state.url.urls);
  //                         ↑       ↑      ↑
  //                      entire  from    from
  //                      store   root    initial
  //                            reducer   state
  
  const loading = useSelector(state => state.url.loading);
  
  console.log(urls); // [{ id: 1, shortUrl: 'abc' }, ...]
  
  return (
    <div>
      {loading ? <Spinner /> : <UrlTable urls={urls} />}
    </div>
  );
}
```

**How it works:**
1. `useSelector` subscribes to the store
2. It "watches" the data you selected
3. When state changes:
   - Redux compares old value vs new value
   - If different → Component re-renders
   - If same → No re-render (optimization!)

#### useDispatch - Send actions

```javascript
import { useDispatch } from 'react-redux';
import { createShortUrl } from './actions';

function CreateUrlForm() {
  const dispatch = useDispatch();
  const [longUrl, setLongUrl] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createShortUrl(longUrl)); // Dispatch action
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={longUrl} 
        onChange={(e) => setLongUrl(e.target.value)} 
      />
      <button type="submit">Shorten</button>
    </form>
  );
}
```

---

## Docker

### What is Docker?

**Docker is a tool that allows you to package your application with all its dependencies into a single container, ensuring it runs the same way across different environments.**

It solves the classic problem: **"It works on my machine but not on yours."**

### The Problem Docker Solves

**Without Docker:**

```
Developer A's Machine:
- Node.js v18
- PostgreSQL 14
- Ubuntu 22.04
- npm packages v1.2.3
✅ Works!

Developer B's Machine:
- Node.js v16
- PostgreSQL 13
- macOS Ventura
- npm packages v1.0.0
❌ Doesn't work!

Production Server:
- Node.js v20
- PostgreSQL 15
- CentOS 8
❌ Crashes!
```

**With Docker:**

```
Everyone uses the same Docker image:
- Exact same Node.js version
- Exact same PostgreSQL version
- Exact same dependencies
- Exact same OS environment
✅ Works everywhere!
```

### Docker Concepts

#### Image vs Container

```
Image                    Container
---------               -----------
Blueprint               Running instance
Static file             Active process
Like a class            Like an object
Stored on disk          Running in memory

Example:
node:22-alpine (image) → my-app (container)
```

**Analogy:**
- **Image** = Recipe for a cake
- **Container** = The actual baked cake

### How Docker Works

#### 1. Base Image

Every Dockerfile starts with a base image that provides the OS and runtime environment.

```dockerfile
FROM node:22-alpine
# Start with Node.js 22 on Alpine Linux (lightweight)
```

#### 2. Working Directory

```dockerfile
WORKDIR /app
# All subsequent commands run in /app directory
```

#### 3. Copy Dependencies First (Important!)

```dockerfile
COPY package*.json ./
RUN npm install
```

**Why copy package files first?**

Docker builds images in **layers**, and each layer is **cached**.

```
Layer 1: FROM node:22-alpine      (cached ✅)
Layer 2: WORKDIR /app              (cached ✅)
Layer 3: COPY package*.json        (cached ✅ if unchanged)
Layer 4: RUN npm install           (cached ✅ if package.json unchanged)
Layer 5: COPY . .                  (rebuilds if code changed)
Layer 6: CMD                       (always runs)
```

**Benefit:** If you only change your code (not dependencies), Docker reuses the cached `npm install` layer, making builds **much faster**!

#### 4. Copy Application Code

```dockerfile
COPY . .
# Copy all files from current directory to /app
```

#### 5. Expose Port

```dockerfile
EXPOSE 5000
# Documents that the app listens on port 5000
# (doesn't actually publish the port - that's done with -p flag)
```

#### 6. Health Check

```dockerfile
HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1
# Lets Docker (or Kubernetes) monitor if your app is running correctly
```

#### 7. Start Command

```dockerfile
CMD ["node", "server.js"]
# The command that runs when container starts
# Executes at runtime, not during build
```

### Complete Dockerfile Example

```dockerfile
# 1. Base image
FROM node:22-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy and install dependencies (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# 4. Copy application code
COPY . .

# 5. Expose port
EXPOSE 5000

# 6. Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# 7. Start the application
CMD ["node", "server.js"]
```

### Docker Commands

#### Building Images

```bash
# Build image with tag
docker build -t my-app .
#              ↑       ↑
#            tag   Dockerfile location

# Build with specific Dockerfile
docker build -t my-app -f Dockerfile.prod .
```

#### Running Containers

```bash
# Basic run
docker run my-app

# Run in detached mode (background)
docker run -d my-app

# Run with custom name
docker run --name my-container my-app

# Run with port binding
docker run -p 3000:5000 my-app
#            ↑    ↑
#         host  container
# Access on localhost:3000, routes to container:5000

# Run with environment variables
docker run -e DB_HOST=localhost -e DB_PORT=5432 my-app

# Run in interactive mode (with terminal)
docker run -it my-app /bin/bash
```

#### Managing Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Start existing container
docker start container_name

# Stop running container
docker stop container_name

# Restart container
docker restart container_name

# Remove container
docker rm container_name

# Remove running container (force)
docker rm -f container_name
```

#### Managing Images

```bash
# List images
docker images

# Pull image from Docker Hub
docker pull nginx:latest

# Pull specific version
docker pull postgres:15

# Remove image
docker rmi image_name

# Remove unused images
docker image prune
```

#### Troubleshooting

```bash
# View container logs
docker logs container_name

# Follow logs (real-time)
docker logs -f container_name

# Execute command in running container
docker exec -it container_name /bin/bash

# Inspect container details
docker inspect container_name

# View container resource usage
docker stats
```

### Docker Tags and Versions

Tags are basically **versions** for images.

```bash
# Default tag is :latest
docker pull mysql
# Same as: docker pull mysql:latest

# Specific version
docker pull mysql:8.0
docker pull mysql:8.0.32

# Different variants
docker pull node:22-alpine    # Lightweight Alpine Linux
docker pull node:22-slim      # Debian slim
docker pull node:22           # Full Debian
```

### Docker Image Layers

Docker images are built in **layers**. Each instruction in the Dockerfile creates a new layer.

```dockerfile
FROM node:22-alpine           # Layer 1 (base)
WORKDIR /app                  # Layer 2
COPY package*.json ./         # Layer 3
RUN npm install               # Layer 4
COPY . .                      # Layer 5
CMD ["node", "server.js"]     # Layer 6
```

**Layer sharing example:**

```
mysql:8.0  and  mysql:latest

Layer 1: Base Ubuntu          (shared ✅)
Layer 2: Install dependencies (shared ✅)
Layer 3: MySQL 8.0 binaries   (shared ✅)
Layer 4: MySQL config         (different ❌)

When you pull mysql:latest after having mysql:8.0,
Docker only downloads the different layers!
```

### Port Binding

Ports inside Docker containers are **isolated** from the host machine.

```bash
# Container runs on port 5000
# But you can't access it from localhost:5000!

# Solution: Port binding
docker run -p 3000:5000 my-app
#            ↑    ↑
#         host  container

# Now:
# Container listens on 5000 (internal)
# Host machine maps 3000 → 5000
# Access via: localhost:3000
```

**Multiple containers, same image:**

```bash
# Container 1
docker run -p 3001:5000 --name app1 my-app

# Container 2
docker run -p 3002:5000 --name app2 my-app

# Both run the same app, accessible on different ports:
# localhost:3001 → Container 1
# localhost:3002 → Container 2
```

### Docker Networks

**Problem:** Multiple containers need to communicate with each other without dealing with localhost and ports.

**Solution:** Docker networks

```bash
# Create a network
docker network create my-network

# List networks (3 default networks exist)
docker network ls
# Output:
# bridge  (default)
# host
# none

# Run containers on the same network
docker run --network my-network --name backend my-backend
docker run --network my-network --name postgres postgres:15

# Now backend can connect to postgres using:
# Host: postgres (not localhost!)
# Port: 5432 (internal port, no binding needed)
```

**Example with network:**

```javascript
// Backend connecting to database
const pool = new Pool({
  host: 'postgres',  // ← Container name, not localhost!
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});
```

### Docker vs Virtual Machines

```
Virtual Machine (VM):
┌─────────────────────────┐
│   App A   │   App B     │
├───────────┼─────────────┤
│   OS      │   OS        │  ← Each has full OS!
├───────────┴─────────────┤
│      Hypervisor         │
├─────────────────────────┤
│      Host OS            │
├─────────────────────────┤
│      Hardware           │
└─────────────────────────┘
Heavy, slow startup (~minutes)

Docker Container:
┌─────────────────────────┐
│   App A   │   App B     │  ← Just apps!
├───────────┴─────────────┤
│     Docker Engine       │
├─────────────────────────┤
│      Host OS            │  ← Shared OS kernel
├─────────────────────────┤
│      Hardware           │
└─────────────────────────┘
Lightweight, fast startup (~seconds)
```

**Key differences:**

| Feature | VM | Docker |
|---------|----|----|
| Size | GBs | MBs |
| Startup | Minutes | Seconds |
| Isolation | Full OS | Process-level |
| Performance | Slower | Near-native |

### Docker on Mac/Windows

**Problem:** Docker was built for Linux. How does it run on Mac/Windows?

**Solution:** Docker Desktop

Docker Desktop creates a **lightweight Linux VM** using a hypervisor layer, which runs the Docker Engine. This allows Docker containers to run on Mac and Windows.

```
macOS/Windows
    ↓
Docker Desktop
    ↓
Lightweight Linux VM (hypervisor)
    ↓
Docker Engine
    ↓
Your Containers
```

### .dockerignore

Just like `.gitignore`, `.dockerignore` prevents unnecessary files from being copied into the image.

```
# .dockerignore
node_modules
npm-debug.log
.env
.git
.DS_Store
*.md
.vscode
coverage
.pytest_cache
__pycache__
```

**Benefits:**
- Faster builds (fewer files to copy)
- Smaller images
- Better security (no secrets accidentally copied)

---

## Nginx

### Why We Need Nginx

**The Problem:**

When you run a React app in development:

```bash
npm start
# Uses webpack-dev-server
# ❌ Slow
# ❌ Memory-heavy
# ❌ Not optimized for production
# ❌ Not secure for production
```

**The Solution: Nginx**

Nginx is a **high-performance web server** ideal for production environments.

```
Development:
webpack-dev-server → Slow, dev-only

Production:
npm run build → Static files
Nginx serves files → Fast, lightweight, optimized ✅
```

### How Nginx Works for React Apps

#### Step 1: Build React App

```bash
npm run build
# Creates optimized production files in /build folder
# - Minified JavaScript
# - Optimized CSS
# - Compressed assets
```

#### Step 2: Nginx Serves Static Files

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Multi-Stage Dockerfile for React + Nginx

```dockerfile
# ==================
# Stage 1: BUILD
# ==================
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy code and build
COPY . .
RUN npm run build
# Creates /app/build folder with static files

# ==================
# Stage 2: PRODUCTION
# ==================
FROM nginx:alpine

# Copy build files from build stage to Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
```

**Why multi-stage?**

```
Stage 1 (build):
- Uses node:22-alpine (large ~150MB with node_modules)
- Installs dependencies
- Builds React app
- We only need the /build output

Stage 2 (production):
- Uses nginx:alpine (tiny ~23MB)
- Only copies /build folder from Stage 1
- Final image is small and fast!

Final image size: ~25MB (instead of 150MB+)
```

### Nginx Configuration for React Router

**Problem:** React Router uses client-side routing. If you refresh on `/dashboard`, Nginx looks for a `/dashboard` file (doesn't exist) → 404 error!

**Solution:** `try_files` directive

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**How `try_files` works:**

```
User visits: http://myapp.com/analytics

1. try_files $uri
   → Looks for file: /analytics
   → Not found ❌

2. try_files $uri/
   → Looks for directory: /analytics/
   → Not found ❌

3. try_files /index.html
   → Serves: index.html ✅

4. React loads and sees URL is /analytics

5. React Router shows Analytics component ✅
```

### Complete Nginx Config Example

```nginx
server {
    listen 80;
    server_name myapp.com;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if backend on same server)
    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

---

## Docker Compose

### What is Docker Compose?

**Docker Compose is a tool for defining and running multi-container applications using a single YAML file.**

**Without Docker Compose:**

```bash
# Start database
docker run -d --name postgres --network my-net \
  -e POSTGRES_PASSWORD=password postgres:15

# Start Redis
docker run -d --name redis --network my-net redis:alpine

# Start backend
docker run -d --name backend --network my-net \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  -p 5000:5000 my-backend

# Start frontend
docker run -d --name frontend -p 3000:80 my-frontend

# Manage 4 containers separately! 😫
```

**With Docker Compose:**

```bash
# One command to start everything!
docker compose up -d

# One command to stop everything!
docker compose down
```

### Docker Compose File Structure

```yaml
version: '3.8'  # Optional (modern versions don't require this)

services:
  # Service 1: PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: url_shortener_db
    environment:
      POSTGRES_DB: urlshortener
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secretpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Service 2: Redis Cache
  redis:
    image: redis:alpine
    container_name: url_shortener_redis
    ports:
      - "6379:6379"
    networks:
      - app-network
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  # Service 3: Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: url_shortener_backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: urlshortener
      DB_USER: admin
      DB_PASSWORD: secretpassword
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network
    volumes:
      - ./backend:/app
      - /app/node_modules

  # Service 4: Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: url_shortener_frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - app-network
    environment:
      REACT_APP_API_URL: http://localhost:5000

# Volumes for data persistence
volumes:
  postgres_data:
  redis_data:

# Networks
networks:
  app-network:
    driver: bridge
```

### Docker Compose Commands

```bash
# Start all services (detached mode)
docker compose up -d

# Start with build (rebuild images)
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes data!)
docker compose down -v

# View logs
docker compose logs

# Follow logs (real-time)
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# List running services
docker compose ps

# Restart specific service
docker compose restart backend

# Stop specific service
docker compose stop backend

# Execute command in running service
docker compose exec backend sh

# Scale service (run multiple instances)
docker compose up -d --scale backend=3
```

### Key Features

#### 1. Automatic Network Creation

Docker Compose **automatically creates a network** and connects all services to it!

```yaml
services:
  backend:
    # No network configuration needed!
    # Can access postgres using hostname "postgres"
    
  postgres:
    # Can be reached by other services as "postgres"
```

**How services communicate:**

```javascript
// Backend can connect to postgres using service name!
const pool = new Pool({
  host: 'postgres',  // ← Service name from docker-compose.yml
  port: 5432,
  database: 'urlshortener',
  user: 'admin',
  password: 'secretpassword'
});
```

#### 2. Volumes for Data Persistence

**Problem:** When containers stop, data is lost!

**Solution:** Volumes

```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
      #     ↑                    ↑
      #  volume name      container path

volumes:
  postgres_data:  # Define named volume
```

**What happens:**

```
Host Machine                Container
/var/lib/docker/volumes  ←→  /var/lib/postgresql/data
   ↑
Persistent storage!
Data survives container restarts ✅
```

**Volume types:**

```yaml
volumes:
  # Named volume (recommended)
  - postgres_data:/var/lib/postgresql/data
  
  # Bind mount (host directory)
  - ./data:/var/lib/postgresql/data
  
  # Anonymous volume
  - /var/lib/postgresql/data
```

#### 3. Service Dependencies

```yaml
services:
  backend:
    depends_on:
      postgres:
        condition: service_healthy  # Wait for health check
      redis:
        condition: service_started  # Just wait for start
```

**Startup order:**

```
1. postgres starts
   ↓
2. Wait for postgres health check ✅
   ↓
3. redis starts
   ↓
4. backend starts
```

#### 4. Environment Variables

**Method 1: Inline**

```yaml
services:
  backend:
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
```

**Method 2: .env file**

```yaml
# docker-compose.yml
services:
  backend:
    env_file:
      - .env
```

```bash
# .env file
DB_HOST=postgres
DB_PORT=5432
DB_PASSWORD=secretpassword
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect postgres_data

# Remove unused volumes
docker volume prune

# Remove specific volume
docker volume rm postgres_data

# Backup volume data
docker run --rm -v postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Development vs Production

**docker-compose.dev.yml:**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app  # Live code reload
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: npm run dev  # Hot reload
```

**docker-compose.prod.yml:**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
    command: node server.js  # Production server
    restart: always  # Auto-restart on failure
```

**Usage:**

```bash
# Development
docker compose -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

---

## Terraform

### What is Terraform?

**Terraform is a tool to write infrastructure as code (IaC) by HashiCorp.**

Think of it like:
- **Dockerfile** = Recipe for application container
- **Terraform** = Recipe for cloud infrastructure

### The Problem Terraform Solves

**Without Terraform (Manual):**

```
1. Login to AWS Console 👨‍💻
2. Click VPC → Create VPC
3. Click Subnets → Create 4 subnets
4. Click Internet Gateway → Attach to VPC
5. Click Route Tables → Configure routing
6. Click RDS → Create database
7. Click ECS → Create cluster
8. Click ALB → Create load balancer
9. Configure security groups
10. Link everything together
... 50+ clicks later ... 😫

Problems:
- Time-consuming
- Error-prone
- Hard to replicate
- No version control
- No collaboration
```

**With Terraform (Code):**

```
1. WRITE → .tf files (your infrastructure code)
2. PLAN → terraform plan (preview changes)
3. APPLY → terraform apply (create infrastructure)
4. STATE → terraform.tfstate (what currently exists)
5. DESTROY → terraform destroy (delete everything)

Benefits:
✅ Version controlled (Git)
✅ Repeatable
✅ Fast
✅ Documented
✅ Collaborative
```

### Terraform Workflow

```
Write Code (.tf files)
    ↓
terraform init (download providers)
    ↓
terraform plan (preview changes)
    ↓
terraform apply (create resources)
    ↓
Infrastructure Created! ✅
    ↓
terraform destroy (delete everything)
```

### Basic Terraform Syntax (HCL)

Terraform files are written in **HCL (HashiCorp Configuration Language)** with `.tf` extensions.

```hcl
resource "provider_resourcetype" "name" {
  argument1 = value1
  argument2 = value2
  
  nested_block {
    nested_arg = value
  }
}
```

**Example:**

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  
  tags = {
    Name = "my-vpc"
    Project = "url-shortener"
  }
}
```

### Main Terraform Files

#### main.tf

```hcl
# Terraform version
terraform {
  required_version = ">= 1.0"
  
  # Required providers
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Backend: Store state in S3
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "url-shortener/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"  # For state locking
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "url-shortener"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

**Why S3 backend?**

```
Local state (default):
terraform.tfstate file on your computer
❌ No collaboration
❌ No backup
❌ Single point of failure

S3 backend:
terraform.tfstate stored in AWS S3
✅ Team collaboration
✅ Automatic backups
✅ State locking (DynamoDB)
✅ Versioning
```

#### variables.tf

```hcl
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Won't show in logs!
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

**Using variables:**

```hcl
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr  # Access with var.name
  
  tags = {
    Environment = var.environment
  }
}
```

**Providing variable values:**

```bash
# Method 1: terraform.tfvars file
aws_region  = "us-west-2"
environment = "staging"
db_password = "secret123"

# Method 2: Command line
terraform apply -var="environment=production"

# Method 3: Environment variable
export TF_VAR_db_password="secret123"
```

#### outputs.tf

```hcl
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true  # Hide from logs
}
```

**Viewing outputs:**

```bash
# Show all outputs
terraform output

# Show specific output
terraform output alb_dns_name
# Output: my-alb-123456.us-east-1.elb.amazonaws.com

# Use in scripts
DB_HOST=$(terraform output -raw database_endpoint)
```

### Resource Dependencies

Terraform automatically figures out the order!

```hcl
# 1. Create VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# 2. Create Subnet (references VPC)
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # ← Reference VPC!
  cidr_block = "10.0.1.0/24"
}

# 3. Create Security Group (references VPC)
resource "aws_security_group" "backend" {
  vpc_id = aws_vpc.main.id  # ← Reference VPC!
  # ...
}

# 4. Create RDS (references Subnet + Security Group)
resource "aws_db_instance" "postgres" {
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.backend.id]
  # ...
}
```

**Terraform creates in correct order:**

```
VPC
 ├─ Subnet
 ├─ Security Group
 └─ RDS (waits for Subnet + SG)
```

### Default Tags

Every resource automatically gets these tags!

```hcl
provider "aws" {
  default_tags {
    tags = {
      Project     = "url-shortener"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# When you create a VPC:
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  # Automatically tagged with:
  # - Project: url-shortener
  # - Environment: production
  # - ManagedBy: Terraform
}
```

### Terraform Commands

#### Initialize

```bash
terraform init
```

**What it does:**
- Downloads provider plugins (AWS, Azure, GCP)
- Initializes backend (S3)
- Sets up working directory

#### Plan

```bash
terraform plan
```

**What it does:**
- Compares your code to current state
- Shows what will change (add, modify, delete)
- **Doesn't actually create anything**

**Output:**

```
Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + cidr_block = "10.0.0.0/16"
      + id         = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

#### Apply

```bash
terraform apply
```

**What it does:**
1. Shows plan (like `terraform plan`)
2. Asks for confirmation
3. **Actually creates resources** in AWS

**Output:**

```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 2s [id=vpc-abc123]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

**Auto-approve (skip confirmation):**

```bash
terraform apply -auto-approve
```

#### Destroy

```bash
terraform destroy
```

**What it does:**
- **Deletes ALL resources** Terraform created
- **DANGEROUS!** Use with caution

#### Show

```bash
terraform show
```

**What it does:**
- Shows current state
- Displays all resources and their attributes

#### State Commands

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show aws_vpc.main

# Remove resource from state (doesn't delete resource!)
terraform state rm aws_vpc.main

# Import existing resource
terraform import aws_vpc.main vpc-abc123
```

#### Output

```bash
# Show all outputs
terraform output

# Show specific output
terraform output alb_dns_name
# Output: my-alb-123456.us-east-1.elb.amazonaws.com

# Raw output (for scripts)
terraform output -raw alb_dns_name
```

### Terraform State

#### What is State?

The state file (`terraform.tfstate`) tracks:
- What resources exist
- Resource IDs
- Dependencies
- Metadata

**Example state (JSON):**

```json
{
  "version": 4,
  "terraform_version": "1.5.0",
  "resources": [
    {
      "type": "aws_vpc",
      "name": "main",
      "instances": [{
        "attributes": {
          "id": "vpc-abc123",
          "cidr_block": "10.0.0.0/16",
          "tags": {
            "Name": "my-vpc"
          }
        }
      }]
    }
  ]
}
```

**Why state is important:**

```
Without state:
terraform apply
  ↓
Creates VPC
  ↓
terraform apply again
  ↓
Creates ANOTHER VPC! ❌ Duplicate!

With state:
terraform apply
  ↓
Creates VPC, saves to state
  ↓
terraform apply again
  ↓
Checks state, sees VPC exists ✅
  ↓
Does nothing (no changes needed)
```

---

## Networking 101

### 1. CIDR Block (IP Address Ranges)

**CIDR = Classless Inter-Domain Routing**

A way to define a range of IP addresses.

```
10.0.0.0/16
  ↑     ↑
  IP    Subnet Mask
```

#### Understanding the Mask

```
/32 = 1 address       (most specific, single IP)
/24 = 256 addresses   (common for small networks)
/16 = 65,536 addresses (common for VPCs)
/8  = 16 million addresses (huge!)
```

**Formula:**

```
/24 means first 24 bits are fixed, last 8 bits vary
Available IPs = 2^(32-24) = 2^8 = 256 addresses
```

#### Example: 10.0.1.0/24

```
CIDR: 10.0.1.0/24

Available IPs:
10.0.1.0   → Network address (reserved, can't use)
10.0.1.1   ✅ Can use
10.0.1.2   ✅ Can use
10.0.1.3   ✅ Can use
...
10.0.1.254 ✅ Can use
10.0.1.255 → Broadcast address (reserved, can't use)

Total: 256 addresses
Usable: 254 addresses (excluding network and broadcast)
```

#### Common CIDR Blocks

```
VPC Level:
10.0.0.0/16    → 65,536 IPs (typical VPC size)

Subnet Level:
10.0.1.0/24    → 256 IPs (public subnet 1)
10.0.2.0/24    → 256 IPs (public subnet 2)
10.0.10.0/24   → 256 IPs (private subnet 1)
10.0.11.0/24   → 256 IPs (private subnet 2)
```

#### Subnet Masks Explained

```
IP Address in Binary:
10.0.1.5 = 00001010.00000000.00000001.00000101

/24 Subnet Mask:
255.255.255.0 = 11111111.11111111.11111111.00000000
                 ↑ First 24 bits fixed ↑  ↑ Last 8 vary

Network portion: 10.0.1
Host portion:    0-255

Result: All IPs from 10.0.1.0 to 10.0.1.255
```

### 2. Gateways

#### Internet Gateway (IGW)

**What it does:** The door to the internet from your VPC

**Characteristics:**
- **Two-way communication** (inbound and outbound)
- Outbound: Resources can reach the internet
- Inbound: Internet can reach public resources (like ALB, public EC2)
- One VPC = One Internet Gateway

**Example:**

```hcl
# Create Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "main-igw"
  }
}

# Attach to route table
resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"  # All internet traffic
  gateway_id             = aws_internet_gateway.main.id
}
```

**Traffic flow:**

```
Internet
    ↕  (two-way)
Internet Gateway
    ↕
Public Subnet (ALB, public EC2)
```

#### NAT Gateway (Network Address Translation)

**What it does:** Allows private subnet resources to access the internet, but NOT vice versa

**Use case:**

```
Backend in Private Subnet needs to:
- Download npm packages from npmjs.com
- Call external APIs (Stripe, SendGrid)
- Download Docker images
- Update OS packages

But we DON'T want internet to directly access backend!
```

**Characteristics:**
- **One-way** (outbound only)
- Private resources can initiate connections to internet
- Internet CANNOT initiate connections to private resources
- Must be placed in a **public subnet**
- Requires an Elastic IP

**Example:**

```hcl
# Create Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "nat-gateway-eip"
  }
}

# Create NAT Gateway in public subnet
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id  # Must be in public subnet!
  
  tags = {
    Name = "main-nat-gateway"
  }
}

# Add route to private subnet route table
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
```

**Traffic flow:**

```
Internet
    ↑ (one-way out only)
Internet Gateway
    ↑
NAT Gateway (in public subnet)
    ↑
Private Subnet (backend, database)
```

#### Comparison

| Feature | Internet Gateway | NAT Gateway |
|---------|-----------------|-------------|
| Direction | Two-way ↕ | One-way ↑ (outbound only) |
| Location | VPC level | Public subnet |
| Use case | Public resources | Private resources need internet |
| Cost | Free | Paid (~$0.045/hour + data) |
| Elastic IP | Not required | Required |

### 3. Route Tables

**What they are:** Rules that tell traffic where to go

Think of Route Tables as: **GPS / Road signs**

#### Route Table Structure

```
Route Table = List of rules

Rule 1: If destination is 10.0.0.0/16 → Local (stay in VPC)
Rule 2: If destination is 0.0.0.0/0 → Internet Gateway
```

#### Example: Public Route Table

```hcl
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  # Local route (automatic, stay within VPC)
  # Destination: 10.0.0.0/16 → Target: local
  
  # Internet route
  route {
    cidr_block = "0.0.0.0/0"              # Any internet destination
    gateway_id = aws_internet_gateway.main.id  # Send to IGW
  }
  
  tags = {
    Name = "public-route-table"
  }
}

# Associate with public subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

**Traffic decision:**

```
EC2 in public subnet wants to reach:

1. 10.0.1.5 (another EC2 in VPC)
   → Route table: 10.0.0.0/16 → local
   → Traffic stays in VPC ✅

2. 8.8.8.8 (Google DNS on internet)
   → Route table: 0.0.0.0/0 → igw-123
   → Traffic goes to Internet Gateway ✅
```

#### Example: Private Route Table

```hcl
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  # Local route (automatic)
  # Destination: 10.0.0.0/16 → Target: local
  
  # Internet route (via NAT Gateway)
  route {
    cidr_block     = "0.0.0.0/0"           # Any internet destination
    nat_gateway_id = aws_nat_gateway.main.id  # Send to NAT Gateway
  }
  
  tags = {
    Name = "private-route-table"
  }
}

# Associate with private subnet
resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}
```

**Traffic decision:**

```
Backend in private subnet wants to reach:

1. 10.0.2.10 (database in VPC)
   → Route table: 10.0.0.0/16 → local
   → Traffic stays in VPC ✅

2. npmjs.com (external internet)
   → Route table: 0.0.0.0/0 → nat-123
   → Traffic goes to NAT Gateway
   → NAT Gateway forwards to Internet Gateway ✅

Internet tries to reach backend:
   → No route exists ❌
   → Traffic blocked ✅
```

### 4. Subnets

**What they are:** Segments of a VPC's IP address range

#### Public vs Private Subnets

```
Public Subnet:
- Has route to Internet Gateway
- Resources get public IPs
- Can be accessed from internet
- Use for: ALB, Bastion hosts, NAT Gateway

Private Subnet:
- Has route to NAT Gateway (not Internet Gateway)
- Resources have only private IPs
- Cannot be accessed from internet
- Use for: Backend, Database, Internal services
```

#### Example Architecture

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# Public Subnet 1 (us-east-1a)
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true  # Auto-assign public IPs
  
  tags = {
    Name = "public-subnet-1"
    Type = "Public"
  }
}

# Public Subnet 2 (us-east-1b)
resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet-2"
    Type = "Public"
  }
}

# Private Subnet 1 (us-east-1a)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
  
  tags = {
    Name = "private-subnet-1"
    Type = "Private"
  }
}

# Private Subnet 2 (us-east-1b)
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1b"
  
  tags = {
    Name = "private-subnet-2"
    Type = "Private"
  }
}
```

**Visual representation:**

```
VPC: 10.0.0.0/16
│
├─ Public Subnet 1 (10.0.1.0/24) - AZ 1a
│  └─ Route: 0.0.0.0/0 → Internet Gateway
│
├─ Public Subnet 2 (10.0.2.0/24) - AZ 1b
│  └─ Route: 0.0.0.0/0 → Internet Gateway
│
├─ Private Subnet 1 (10.0.10.0/24) - AZ 1a
│  └─ Route: 0.0.0.0/0 → NAT Gateway
│
└─ Private Subnet 2 (10.0.11.0/24) - AZ 1b
   └─ Route: 0.0.0.0/0 → NAT Gateway
```

### 5. Security Groups

**What they are:** Virtual firewalls for resources

**Characteristics:**
- **Stateful** - If you allow inbound, outbound response is automatically allowed
- Work at instance level (not subnet level)
- Allow rules only (no deny rules)
- Evaluate all rules before deciding to allow traffic

#### Example: Backend Security Group

```hcl
resource "aws_security_group" "backend" {
  name        = "backend-sg"
  description = "Security group for backend ECS tasks"
  vpc_id      = aws_vpc.main.id
  
  # Inbound rules
  ingress {
    description     = "Allow HTTP from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]  # Only from ALB!
  }
  
  # Outbound rules
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"  # All protocols
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "backend-sg"
  }
}
```

#### Example: Database Security Group

```hcl
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id
  
  # Only allow PostgreSQL from backend
  ingress {
    description     = "PostgreSQL from backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]  # Only backend!
  }
  
  # No outbound restrictions
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "database-sg"
  }
}
```

**Security group chain:**

```
Internet
    ↓
ALB (alb-sg)
    ↓ (allowed: port 5000)
Backend (backend-sg)
    ↓ (allowed: port 5432)
Database (database-sg)

Direct internet → Database: ❌ BLOCKED
```

### 6. Complete Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VPC: 10.0.0.0/16                       │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │  Public Subnet (AZ 1a)   │  │  Public Subnet (AZ 1b)   ││
│  │  10.0.1.0/24             │  │  10.0.2.0/24             ││
│  │                          │  │                          ││
│  │  ┌────────┐              │  │  ┌────────┐             ││
│  │  │  ALB   │              │  │  │  ALB   │             ││
│  │  └────────┘              │  │  └────────┘             ││
│  │                          │  │                          ││
│  │  ┌──────────────┐        │  │  ┌──────────────┐       ││
│  │  │ NAT Gateway  │        │  │  │ NAT Gateway  │       ││
│  │  └──────────────┘        │  │  └──────────────┘       ││
│  └────────────┬─────────────┘  └────────────┬────────────┘│
│               │                             │             │
│  ┌────────────▼─────────────┐  ┌───────────▼─────────────┐│
│  │ Private Subnet (AZ 1a)   │  │ Private Subnet (AZ 1b)  ││
│  │ 10.0.10.0/24             │  │ 10.0.11.0/24            ││
│  │                          │  │                         ││
│  │  ┌──────────┐            │  │  ┌──────────┐          ││
│  │  │ Backend  │            │  │  │ Backend  │          ││
│  │  │  (ECS)   │            │  │  │  (ECS)   │          ││
│  │  └──────────┘            │  │  └──────────┘          ││
│  │                          │  │                         ││
│  │  ┌──────────┐            │  │  ┌──────────┐          ││
│  │  │   RDS    │            │  │  │   RDS    │          ││
│  │  │(Standby) │            │  │  │(Primary) │          ││
│  │  └──────────┘            │  │  └──────────┘          ││
│  └──────────────────────────┘  └─────────────────────────┘│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Internet Gateway                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                      Internet
```

### Traffic Flows

#### Inbound Request (User → Backend)

```
1. User (Internet)
   ↓
2. Internet Gateway
   ↓
3. ALB (Public Subnet)
   ↓ (Security Group: Allow from Internet on port 80/443)
4. Backend (Private Subnet)
   ↓ (Security Group: Allow from ALB on port 5000)
5. Database (Private Subnet)
   (Security Group: Allow from Backend on port 5432)
```

#### Outbound Request (Backend → Internet)

```
1. Backend (Private Subnet)
   ↓
2. NAT Gateway (Public Subnet)
   ↓
3. Internet Gateway
   ↓
4. Internet (npmjs.com, external APIs)
```

---

## Summary of Key Concepts

### Module Systems
- Use **`require`** for legacy/CommonJS projects
- Use **`import`** for modern ES modules (requires `"type": "module"`)

### Database
- Use **Pool** for production apps (connection pooling)
- Use **Client** for one-off scripts

### State Management
- **React useState** for component-level state
- **Redux** for application-level state across components

### Docker
- **Image** = Blueprint (class)
- **Container** = Running instance (object)
- Use **multi-stage builds** to reduce final image size
- Use **docker-compose** for multi-container applications

### Infrastructure
- Use **Terraform** to manage infrastructure as code
- Store state in **S3** for team collaboration
- Use **variables** to make configurations reusable

### Networking
- **Public subnets** have routes to Internet Gateway
- **Private subnets** have routes to NAT Gateway
- Use **Security Groups** as virtual firewalls
- **CIDR blocks** define IP address ranges

---

## Best Practices

### Development Workflow

```
1. Write code locally
2. Test with Docker locally (docker-compose up)
3. Commit to Git
4. CI/CD pipeline builds Docker images
5. Push images to registry (ECR, Docker Hub)
6. Terraform provisions infrastructure
7. Deploy containers to production (ECS, Kubernetes)
```

### Security

```
✅ Use environment variables for secrets
✅ Never commit .env files
✅ Use security groups to restrict access
✅ Put databases in private subnets
✅ Use HTTPS/SSL certificates
✅ Enable encryption at rest and in transit
✅ Regular security updates
✅ Implement rate limiting
```

### Performance

```
✅ Use Redis for caching
✅ Use connection pooling for databases
✅ Compress responses (gzip)
✅ Optimize Docker images (multi-stage builds)
✅ Use CDN for static assets
✅ Implement database indexing
✅ Monitor and log everything
```

---

## Quick Reference Commands

### Docker
```bash
docker build -t app .              # Build image
docker run -d -p 3000:80 app       # Run container
docker ps                          # List containers
docker logs -f container           # View logs
docker exec -it container sh       # Access shell
```

### Docker Compose
```bash
docker compose up -d               # Start all services
docker compose down                # Stop all services
docker compose logs -f             # View logs
docker compose ps                  # List services
```

### Terraform
```bash
terraform init                     # Initialize
terraform plan                     # Preview changes
terraform apply                    # Create resources
terraform destroy                  # Delete resources
terraform output                   # Show outputs
```

### PostgreSQL
```bash
psql -U postgres                   # Connect
\l                                 # List databases
\c dbname                          # Connect to DB
\dt                                # List tables
\q                                 # Quit
```

---

*These notes are a living document and will be updated as I learn more concepts!* 🚀





































































<!-- 
by default it is set to require, to use imports we need to add a line "type:'module'' in package.json
import vs require in node.js applications

require: Still prevalent in many existing Node.js projects, especially older ones. It's suitable for situations where synchronous loading or dynamic module paths are necessary.
import: The modern and preferred approach for new Node.js projects and in browser environments. It offers benefits like static analysis, tree-shaking, and better integration with modern JavaScript features.


import (ES Modules - ESM):
Asynchronous Loading: import statements are designed for asynchronous loading, especially beneficial for modern applications and browser environments.
Static Analysis: import statements are hoisted to the top of the file and parsed during the initial loading phase, allowing for static analysis and optimization by tools.
Usage:
JavaScript

    import fs from 'fs';
    import { myFunction } from './myModule.js';
    import * as myModule from './myModule.js';



require (CommonJS Modules):
Synchronous Loading: require loads modules synchronously, meaning the program execution pauses until the module is fully loaded and processed.
Dynamic Loading: require can be called conditionally and dynamically from anywhere in the code. The module path can be determined at runtime.
Usage:
JavaScript

    const fs = require('fs');
    const myModule = require('./myModule.js');
Exports: Modules export using module.exports = ... or exports.propertyName = ....

cors (Cross-Origin Resource Sharing)
Since backend and frontend runs on different ports. Browser blocks req from one domain to another to maintain security
cors is a middleware to enable CORS


helmet is a Security middleware.  Sets various HTTP headers to protect against common web vulnerabilities
Think of it as: A security guard that adds protective headers to every response

compression is a Middleware that compresses response bodies

express-rate-limit : Middleware to limit repeated requests. Prevents abuse by limiting how many requests an IP can make

The flow 








Design choices for database
Here we are using postgresql which is a relational databse
while setting up connection with this db, we use Pool instead of client.
what is client?
Client is mainly used when we just need to establish a single connection. for instances where we are perfoirming singular tasks like scripts or one-off connections (like data migration or setup scripts).
Also we need to manage client's connection lifecycle i.e on and off (manual connect and disconnect)

what is pool?
A pool on other hand is a pool of multiple connections.
A Pool manages a set of reusable connections to your database.
Instead of creating a new database connection every time an API call happens, a pool:
	•	Reuses existing connections for multiple requests.
	•	Keeps a few idle connections ready for new requests.
	•	Prevents overwhelming the DB by limiting the max number of concurrent connections (max: 20).
	•	Automatically handles timeouts, disconnections, and recovery.
Connection Lifecycle is Auto-managed


creating a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

2 main events of pool:
a)connect event fires whenever a new connection is established.
b)error event ensures that if something bad happens (e.g., connection lost), the app logs it and exits gracefully.

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit



initdatabse function




To use psql in terminal 
psql -U postgres

Redis

Redis is a high-performance, in-memory data store. It’s often used for caching, session storage, rate limiting, pub/sub messaging, and more.

In-memory: Data is stored in RAM → extremely fast reads/writes.
	2.	Key-value store: Everything is stored as a key-value pair.
	3.	Persistence optional: Can persist data to disk using RDB or AOF.
	4.	Data structures: Redis supports strings, hashes, lists, sets, sorted sets, bitmaps, and more.
	5.	Single-threaded: Uses an event loop → fast for most workloads.
	6.	TTL support: You can set expiration on keys (EXPIRE) → great for caching.

node-redis is the Redis client for Node.js/JavaScript

For generating short codes in url we use base 62 method, we can also use hashing but it is a bit inefficient, because we need to take care of collisions, also a hash of a url or anything is about 32 bits which is very long. to generate unique urls we need about 7 characters. by using 7 chars we can form about 3.5 trillion unique combinations

we use base62 method, 62 here means 62 chars which are '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

we use nanoid library 






React 101

JSX allows to write HTML inside javascript
Components in React are reusable blocks like <Navbar/> this can be used on multiple pages

Just like how we hava params that go into a function, we can pass props to a component <Content name="Raj" age="23">. here name and age are props passed to a component Content

There are certain parts of the page that changes, to manage them we use state. example a counter
we do something like const [count, setCount] =useState(0) where 0 is the init values and the count is the variable the value holder. the setCount is the method to update the state of this count variable whenever required.

useState, useEffect , etc are some of the hooks that are commonly used. Hooks are special functions to use React features like state, effects

React uses something known as virtual DOM for faster and efficient UI updates (re-rendering)

DOM is Document Object Model, a programming interface for web documents.
DOM represents the entire document as a tree of nodes, where nodes are the aprts of the page like elements, text, attributes. so, browser uses this dom to render the webpage and JS can dynamically interact with it to change or update content
. Direct manipulation of the Real DOM can be computationally expensive

The Virtual DOM (VDOM) in React is a lightweight, in-memory representation of the Real DOM. It is a programming concept where a "virtual" representation of the UI is kept in memory and synced with the "real" DOM by a library like React DOM

Here's how the updates look like:
1) Intial Render: When a React component first renders, React creates a Virtual DOM tree representing the UI and renders it to the Real DOM.
2) State/Props Changes: When a component's state or props change, instead of directly updating the Real DOM, React creates a new Virtual DOM tree representing the updated UI.
3) Diffing Algorithm: React then uses a process called "diffing" to compare the new Virtual DOM with the previous one. This algorithm efficiently identifies the differences between the two trees
4) Reconciliation: Based on the identified differences, React calculates the most efficient way to update the Real DOM. This involves applying only the necessary changes to the Real DOM, rather than re-rendering the entire page
5) Real DOM Update: Finally, React updates only the changed parts of the Real DOM, leading to improved performance and a more responsive user experience compared to direct Real DOM manipulation.

Conditional Rendering is another feature of React {isLoggedIn ? <Dashboard/> : <Login/>}



Redux 101
Redux is a state management library for JS apps.

Why do we need Redux?
Let's say we have a state at App level and that is used by several components and its nested and hten its nested components.
there may be components that do not use this state, but their grandchildren use it. this problem is known as prop drilling and is inefficient, to handle this we use redux toolkit

Redux states dont store your states at root or app level, instead put it in a store and all the components that use that state , just subscribes to them and then re-renders themselves whenver the state changes  
this way debugging, scalability improves.

Architecture of Redux:

whenever user does somehting or performs an event like incrementing counter or adding product ot cart or xyx, we need an handler funciton that handles it. the handler function dispatches this event to redux store.

for example lets consider the cart example, we have 1 product in cart, now user clicks on add product, what happesn is ecvent handler dispacthes the event to redux store which has vlaue 1 but it doesnot know how to deal with it so it passes this event(event naem:addProductToCart and initvalue:1) to a reducer fucntion(whcih we define for this event)
and reducer now return updated state (2) to redux store. now the components that subscribed to this state re-renders and updates ui.



State: The single source of truth for our app. Stored in a store
e.g {
  user:{name:"Raj", loggedIn:true},
  urls:[{id:1, longUrl:"https://longurllll.com", shortCode:'ex1"}]

}

Actions: describe what happened in our app. they are plain javascript objects with type and optional payload.
(Events that happened)

const ADD_URL="ADD_URL";

const addUrlAction={
  type:ADD_URL,
  payload:{id:1, longUrl:"https://longurllll.com", shortCode:'ex1"}
};

Action types are just STRING CONSTANTS - labels for messages. Here we use 3 for one process:
export const CREATE_URL_REQUEST = 'CREATE_URL_REQUEST';  // "Starting..."
export const CREATE_URL_SUCCESS = 'CREATE_URL_SUCCESS';  // "Done!"
export const CREATE_URL_FAILURE = 'CREATE_URL_FAILURE';  // "Error!"

This 3 actions shows different ui:
REQUEST → Show loading spinner
SUCCESS → Hide spinner, show data
FAILURE → Hide spinner, show error

So whenever user clicks, first we immediately dispatch CREATE_URL_REQUEST type action, in the meanwhile we call the api, get data, pass it in the payload in CREATE_URL_SUCCESS action type and dispatch it. In case of error we dispatch CREATE_URL_FAILURE action type

Action Creator (A Function That Creates Messages)

// Instead of writing the message manually every time:
dispatch({ type: 'CREATE_URL_REQUEST' });  // Repetitive!

// We create a function to do it:
export const createShortUrl = (longUrl) => {
  return async (dispatch) => {
    // 1. Send "Starting" message
    dispatch({ type: CREATE_URL_REQUEST });
    
    try {
      // 2. Do the actual work (API call)
      const response = await api.createShortUrl(longUrl);
      
      // 3. Send "Success" message with data
      dispatch({ 
        type: CREATE_URL_SUCCESS, 
        payload: response.data 
      });
    } catch (error) {
      // 4. Send "Failed" message with error
      dispatch({ 
        type: CREATE_URL_FAILURE, 
        payload: error.message 
      });
    }
  };
};




Reducers: specify how the state changes in response to an action. pure functions, no side effects, no api calls
So they take in initial state, the action that took place, and based on the action update the state in the store

const initialState = {
  urls: []
};

  function urlReducer(state = initialState, action) {
      switch(action.type) {
        case "ADD_URL":
          return {
            ...state,
            urls: [...state.urls, action.payload]
          };
        default:
          return state;
      }
  }


Spread operator ...state is very important. we never do direct manipulation of state, instead we use { ...state, loading: false } this way we only add new data to the old data and not lose data

// WITHOUT spread - LOSES data!
return { loading: false };  
// Result: { loading: false } - Lost urls, total, error!

// WITH spread - KEEPS everything!
return { ...state, loading: false };
// Result: { urls: [...], total: 5, loading: false, error: null }


Store is the actual place where all states are maintained
We create a store, import reducers, middlewares
while creating store, we pass in reducers as params and also thunk as middleware. thunk allows us for async api calls

Without thunk:
javascript// You can only dispatch plain objects ❌
dispatch({ type: 'ADD_URL', payload: url });

With thunk:
javascript// You can dispatch FUNCTIONS that do async stuff ✅
dispatch(async (dispatch) => {
  const data = await fetchFromAPI();
  dispatch({ type: 'SUCCESS', payload: data });
});


the flow: 

Component dispatches action
    ↓
Action goes to reducer
    ↓
Reducer updates store
    ↓
Component re-renders with new data


two imp hooks defined by redux:
useSelector: this is used to read or get data from store
useDispatch: we use this to dipatch actions


import { useSelector } from 'react-redux';

function UrlList() {
  // useSelector passes the ENTIRE store to your function
  const urls = useSelector(state => state.url.urls);
  //                         ↑             ↑      ↑
  //                      entire       from     from
  //                      store     combineR  initial
  //                                eoucers   State
  
  console.log(urls);  // [{ id: 1, shortUrl: 'abc' }, ...]

  How it works:

useSelector subscribes to the store

It "watches" the data you selected


When state changes:

Redux compares old value vs new value
If different → Component re-renders




Dockerfile:
tells docker how to build your app into a container, lightweight, portable package

FROM - Start with Node.js
WORKDIR - Set workspace
COPY package.json - Copy dependency list
RUN npm ci - Install dependencies
COPY code - Copy application
EXPOSE - Document port
HEALTHCHECK - Monitor health
CMD - Start app

Why copy package files first?
Docker caches layers. If you only change code (not dependencies), Docker reuses the cached npm install layer, making builds faster! 


Docker is a tool that allows you to package your application with all its dependencies into a single container, ensuring it runs the same way across different environments.
It solves the classic problem of “It works on my machine but not on yours.”

⸻

⚙️ How Docker Works
	1.	Base Image
Every Dockerfile starts with a base image (like node:22-alpine or openjdk:17-jdk-slim) that provides the operating system and runtime environment your app needs.
	2.	Working Directory
The WORKDIR command defines where your app’s files will live inside the container, e.g.:
WORKDIR /app
	3.Copy Dependencies First
COPY package*.json ./
RUN npm install
Dependencies are copied and installed before the source code because Docker caches layers.
If your dependencies haven’t changed, Docker will reuse the cached layer and skip reinstalling them, saving time during rebuilds.
  4. Copy app code
  COPY ..
  This copies your project files into the container
  5. Expose port
  This lets Docker (or Kubernetes) monitor if your app is running correctly.
  6. Healthcheck 
  HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1
  7. Start command
The CMD instruction defines the command that runs when the container starts — it executes at runtime, not during the image build.


Image vs Container:
	•	An image is like a blueprint (similar to a class).
	•	A container is a running instance of that image (like an object).
	•	Caching and Layers:
Each instruction in the Dockerfile creates a layer. Docker caches layers to avoid rebuilding everything from scratch when small changes are made.
	•	Isolation:
Containers share the same OS kernel but run in isolated environments (separate file system, network, and process space), making them lightweight compared to virtual machines.
	•	Portability:
Once built, a Docker image can run anywhere — your laptop, AWS EC2, ECS, Kubernetes, or any system with Docker installed.


Without docker, devs used to work together on project and face may porblmes like different versions for dependencies, different os ,etc. even for deployment it had the same error.
to unify all the dependencies across the team and deployment we use docker
Docker containers are lightweight and portable. they are running instance
Docker image is an executable file (static snapshot). It is like a class, a blueprint, while containers are the objects or instances of this file. 

tags are basically version for the images
docker pull image_name

Now to build container for this image
docker run image_name
docker pull just pulls the image
docker run, if image not locally opresent, downloads/pulls image and then runs it

-it is interactive mode that allows you to use terminal of the docker conatiner
exit to exit the cotnainter and stop it

to view images
docker images. 

docker ps -a
shows list of all(-a) the containers running and stopped

Ok, now docker run creates a new contianer for the image, bu tif we already have existing containers then we use dokcer start container name/id and docker stop container name/id commands

Now to delete docker images or containers
docker rmi Image_Name
docker rm Container_Name

use --name ot anme a contianer while creating htem

when we pull image
it automatically pulls the latest images and uses default tag:latest
to download a specific version, we use docker pull Image_Name:version
To run docker containers in background we use docker run container -d (d is detached mode here)

Docker image is built in layers
it has base layer, then a couople of layers on top.

for different verisons of images, mysql:8 and mysql:latest 
if we have version 8 and then we download latest version then while downloading it checks that first couple of latyers already exists and only downloads upper layers 

now port binding 
ports inside docker containers are diff than those of the host machine. so to map them we use port binding -p Hostportnos:Containerportnos

to troubleshoot
docekr logs container_id/name 
docker exec -it docker_cotnainer /bin/bash

docker vs vm
vm virtaulsies app layer as well as os kernel layer, so heavy but they can work freelly on any machine(windows, mac, linux)

docker on other hand only virtualises app layer and use host amchine's os layer. this is problmeatic because docker was built for linux. so how does it work on mac , windows. docekr desktop coems into play. It creates a hypervisoe layer to system which uses lightweight linux distribution that allows us to use docker on our systems


docker network

Now what if we have multiple containers and we want them to interact with each other without any hassle of ports, localhost etc.
for that we create a docker network using command
docker network create network_name

by default 3 networks present
bridge, null, host

wehne we create a new network that is of bridge type by default











<!-- Now nginx -->

why we need nginx
so if we run our frontend files or app, it will by default use webpack dev server to load files, but it is slow, memory-heavy and not ideal for production env.

Nginx on other hand is ideal for prod env.
creates static files (npm run build)
nginx then serves those files fast, lightweight, optimised and handles routing

frontend docker file is spolit into two main stages: build and prod
in build stage we use node base image, and copy dependecies and code and run npm run build. 
in prod stage we use nginx base image, copy those build files to nginx's root web server in /usr/share/nginx/html (Nginx's default serving location)
expose the port and finally start the nginx server in foregroeund mode

try_files = Makes React Router work in production

User visits: http://myapp.com/analytics
Nginx looks for: /analytics file → Not found
Nginx serves: index.html ✅
React loads: Sees URL is /analytics
React Router: Shows Analytics component ✅

Docker compose:
is a tool for defining and running multi-container applications in a .yaml file


we define docker compose version (optional)

then define services(backedn, frontend, redis, db)

services:

    mongo:
      image:mongo
      ports: 
      -27017:27017
      environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: qwerty
      volumes:
      - host_dir:cont_dir

    backend:
    ...
  

to run this compose file

docker compose -f fileName.yaml up -d
this runs all the services insid eyaml fiel in detached mode 

docker compose -f fileName.yaml down -d


Now another imp concept, when we run the serives separately we explicitly had to mention a network for all the services, however in docker compose
we dont do it, in docker compose, it defaults create one network and run all the servies together in that network

There is no data persistence in contianers, for that we need to use 
volumes


we mount space from the host machine to the docker container for data persistence

we can map multiple containers to same volume

docker volume ls lists all volumes
to create us docker volume create my_volume
default volumes are stored in macos at 
/var/lib/docker/volumes
to delete 
docker volume rm myVolume





Now dockerising our own app
using dockerfile is a blueprint of how to dockerise our app

dockerfile we saw above

to use this dockerfile, we build it and then run

docker build -t testapp
-t is tag testapp is name

docker run testapp

we can also add dockerignore file








Terraform
Terraform = Tool to write infrastructure as code (IaC) by hashicorp
Think of it like:

Dockerfile = Recipe for application container
Terraform = Recipe for cloud infrastructure

without terraform:
Login to AWS Console 👨‍💻
2. Click VPC → Create VPC
3. Click Subnets → Create 4 subnets
4. Click RDS → Create database
5. Click ECS → Create cluster
6. Click ALB → Create load balancer
7. Configure security groups
8. Link everything together
... 50+ clicks later ...

1. WRITE → .tf files (your infrastructure code)
2. PLAN → terraform plan (preview changes)
3. APPLY → terraform apply (create infrastructure)
4. STATE → terraform.tfstate (what currently exists)
5. DESTROY → terraform destroy (delete everything)



main.tf file where you write required providers, can be mulitople, in our case lets take aws, also specify version of terraform that we will use. then we define or use an s3 bucket for storing the state of our infra that terraform creates. state file here is the database of what terraform created. we can store the state locally as well but then no collaborators, no backups,etc.

teraaform files written in hcl and have .tf extensions.

Basic Syntax:
hclresource "provider_resourcetype" "name" {
  argument1 = value1
  argument2 = value2
  
  nested_block {
    nested_arg = value
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  
  tags = {
    Name = "my-vpc"
  }
}

Default Tags: Every resource gets these tags automatically
Example:
Creating VPC → Automatically tagged:
  - Project: url-shortener
  - Environment: production
  - ManagedBy: Terraform


Resources can reference each other:

<!-- Create VPC -->
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

<!-- Create Subnet in that VPC -->
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # ← Reference VPC!
  cidr_block = "10.0.1.0/24"
}

 <!-- Create RDS in that Subnet -->
resource "aws_db_instance" "postgres" {
  subnet_group_name = aws_db_subnet_group.main.name  # ← Reference!
  <!-- ... -->
}


Terraform automatically figures out the order!
VPC → Subnet → Security Group → RDS
(creates in correct order)


Terraform commands

terraform init

Downloads provider plugins (AWS plugin)
Initializes backend (S3) to store state
Sets up working directory

terraform plan

Compares your code to current state
Shows what will change
Doesn't actually create anything

terraform apply

Shows plan (like terraform plan)
Asks for confirmation
Actually creates resources in AWS

terraform destroy

Deletes ALL resources Terraform created
DANGEROUS! Deletes everything!

terraform show

terraform show
What it does:

Shows current state
Displays all resources and their attributes

terraform output

Shows output values (like ALB DNS name)

Example:
terraform output alb_dns_name
Output: my-alb-123456.us-east-1.elb.amazonaws.com


just like env files we can create variables file in variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Won't show in logs
}


To use this variables:

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr  # Access with var.name
  
  tags = {
    Environment = var.environment
  }
}

What is State?
State file tracks:

What resources exist
Resource IDs
Dependencies
Metadata

Example state:
json{
  "version": 4,
  "terraform_version": "1.5.0",
  "resources": [
    {
      "type": "aws_vpc",
      "name": "main",
      "instances": [{
        "attributes": {
          "id": "vpc-abc123",
          "cidr_block": "10.0.0.0/16"
        }
      }]
    }
  ]
}

<!-- # List resources in state -->
terraform state list

<!-- # Show specific resource -->
terraform state show aws_vpc.main

<!-- # Remove resource from state (doesn't delete resource!) -->
terraform state rm aws_vpc.main

<!-- # Import existing resource -->
terraform import aws_vpc.main vpc-abc123



Some Networking 101

1. 🏠 CIDR Block (IP Address Ranges)
Classless Inter-Domain Routing

It is a way to define a range of IP addresses

10.0.0.0/16
  ↑     ↑
  IP    Subnet Mask


/32 = 1 address       (most specific)
/24 = 256 addresses   (common for small networks)
/16 = 65,536 addresses (common for VPCs)
/8  = 16 million addresses (huge!)


Formula:

/24 means first 24 bits are fixed, last 8 bits vary
2^8 = 256 


CIDR: 10.0.1.0/24

Available IPs:
10.0.1.0   (network address, reserved)
10.0.1.1   ✅ Can use
10.0.1.2   ✅ Can use
...
10.0.1.254 ✅ Can use
10.0.1.255 (broadcast, reserved)

Total usable: 254 addresses


Now Gateways:
two major types:
1) Internet Gateway: Door to the internet from your VPC 

(Two-way (in & out))

Outbound: Resources can reach internet
Inbound: Internet can reach public resources (like ALB)
One VPC = One Internet Gateway

2) NAT Gateway (Network Address Translation)
Allows private subnet resources to access internet, but NOT vice versa
Backend in Private Subnet needs to:
- Download npm packages
- Call external APIs
- Download Docker images

But we don't want internet to directly access backend!


Route Tables
What: Rules that tell traffic where to go
Route Table = GPS / Road signs -->


