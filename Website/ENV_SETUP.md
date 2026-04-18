# Environment Variables Setup

## Overview
This project uses `.env` files to manage environment variables using the `dotenv` package.

## Files
- **`.env`** - Local environment variables (excluded from Git - do not commit!)
- **`.env.example`** - Template for required environment variables (commit this)
- **`config.js`** - Centralized configuration object for easy access

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install dotenv
   ```

2. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

3. **Update `.env`** with your actual values:
   ```env
   PORT=3000
   NODE_ENV=development
   API_KEY_PLACEHOLDER=your-api-key
   DB_HOST=localhost
   DB_PORT=5432
   ```

## Usage

### Option 1: Direct access in code
```javascript
import 'dotenv/config.js';

const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY_PLACEHOLDER;
```

### Option 2: Using config module (Recommended)
```javascript
import config from './config.js';

console.log(config.port);        // 3000
console.log(config.apiKey);      // your-api-key
console.log(config.isDevelopment); // true
```

### Option 3: In server.js
```javascript
import 'dotenv/config.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
```

## Available Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `API_KEY_PLACEHOLDER` | - | API key |
| `API_URL` | http://localhost:3000 | API endpoint |
| `API_TIMEOUT` | 30000 | API request timeout (ms) |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_NAME` | myapp | Database name |
| `DB_USER` | admin | Database user |
| `DB_PASSWORD` | - | Database password |
| `TAILWIND_MODE` | watch | Tailwind CSS mode |

## Security

⚠️ **Important**: Never commit `.env` to Git!
- Added to `.gitignore` automatically
- Always use `.env.example` for templates
- Keep sensitive data in `.env` only locally
