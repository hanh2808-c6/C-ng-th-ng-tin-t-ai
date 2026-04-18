// config.js - Centralized environment variable configuration
import 'dotenv/config.js';

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // API
  apiKey: process.env.API_KEY_PLACEHOLDER,
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'myapp',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
  },

  // Tailwind
  tailwindMode: process.env.TAILWIND_MODE || 'watch',
};

export default config;
