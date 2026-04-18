import 'dotenv/config.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = http.createServer((req, res) => {
    // API endpoints
    if (req.url === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            apiKey: process.env.API_KEY_PLACEHOLDER,
            apiUrl: process.env.API_URL || 'http://localhost:3000',
            nodeEnv: NODE_ENV
        }));
        return;
    }

    // Static files
    let requestUrl = req.url === '/' ? '/index.html' : req.url;
    if (requestUrl.startsWith('/GEMINI/')) {
        requestUrl = requestUrl.replace(/^\/GEMINI/, '') || '/index.html';
    }

    requestUrl = path.normalize(requestUrl).replace(/^(\\.\\.[\\/\\\\])+/, '');
    const filePath = path.join(__dirname, requestUrl);

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    switch (ext) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'text/javascript'; break;
        case '.json': contentType = 'application/json'; break;
        case '.avif': contentType = 'image/avif'; break;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT} [${NODE_ENV}]`);
});
