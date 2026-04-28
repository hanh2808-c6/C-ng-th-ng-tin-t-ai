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
    let filePath = path.join(__dirname, 'GEMINI', req.url === '/' ? 'index.html' : req.url);

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    switch (ext) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'text/javascript'; break;
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
