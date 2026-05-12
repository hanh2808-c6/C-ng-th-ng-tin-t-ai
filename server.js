import 'dotenv/config.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DOCUMENTS_FILE = path.join(__dirname, 'van_ban_phap_luat_dat_dai.json');
const documents = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));

// FIX #1: Xóa toàn bộ http.createServer thủ công — Express tự tạo server
// FIX #2: Khai báo đầy đủ tất cả biến môi trường
const PORT           = Number(process.env.PORT || 3000);
const NODE_ENV       = process.env.NODE_ENV || 'development';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';   // FIX #3: khai báo thiếu trong bản gốc
const GEMINI_MODEL   = (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    .replace(/^gemini-1(?:\.5)?(?:-flash)?$/i, 'gemini-2.5-flash');
const OPENAI_MODEL   = process.env.OPENAI_MODEL   || 'gpt-4o-mini';      // FIX #4: khai báo thiếu

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIX #5: CORS nên đặt trước route tĩnh
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Static files
app.use(express.static(__dirname));

// Simple vector-search-like endpoint for AI chat context
app.post('/api/vector-search', (req, res) => {
    const query = String(req.body?.query || '').trim().toLowerCase();
    const topK = Number(req.body?.topK) || 3;

    if (!query) {
        return res.json({ success: true, results: [] });
    }

    const tokens = query.split(/\s+/).filter(Boolean);
    const results = documents
        .map((doc) => {
            const text = `${doc.title} ${doc.excerpt} ${doc.type} ${doc.agency}`.toLowerCase();
            const score = tokens.reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
            return {
                ...doc,
                similarity: tokens.length ? Math.min(1, score / tokens.length) : 0
            };
        })
        .filter((doc) => doc.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    res.json({ success: true, results });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ai_chat.html'));
});

// ===== /api/ai-summary =====
app.post('/api/ai-summary', async (req, res) => {
    const { title, excerpt } = req.body;

    if (!title || !excerpt) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin tài liệu để tóm tắt.' });
    }

    // FIX #3: Dùng biến đã khai báo đúng
    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
        return res.status(500).json({ success: false, error: 'Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY.' });
    }

    const prompt = `Phân tích tóm tắt văn bản pháp luật sau bằng tiếng Việt: ${title}. Mô tả: ${excerpt}. Hãy chỉ ra 3 điểm quan trọng nhất mà người dân cần lưu ý.`;

    try {
        let answer = '';

        if (GEMINI_API_KEY) {
            // FIX #6: Sửa endpoint Gemini — v1beta2 + generateText là API cũ (đã deprecated).
            //         Dùng v1beta + generateContent (Gemini 1.5+)
            // FIX #7: Sửa Authorization header — Gemini dùng query param ?key=, không dùng Bearer token
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
                    })
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Gemini lỗi ${response.status}: ${text}`);
            }

            const data = await response.json();
            // FIX #8: Sửa path lấy text — generateContent trả về candidates[0].content.parts[0].text
            answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không nhận được phản hồi từ Gemini.';

        } else {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: OPENAI_MODEL,
                    messages: [
                        { role: 'system', content: 'Bạn là trợ lý trả lời ngắn gọn, chính xác, chuyên về pháp luật đất đai Việt Nam.' },
                        { role: 'user',   content: prompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`OpenAI lỗi ${response.status}: ${text}`);
            }

            const data = await response.json();
            answer = data.choices?.[0]?.message?.content?.trim() || 'Không nhận được phản hồi từ OpenAI.';
        }

        res.json({ success: true, text: answer });
    } catch (error) {
        console.error('AI summary backend error:', error);
        res.status(500).json({ success: false, error: error.message || 'Lỗi server AI.' });
    }
});

// ===== /api/ai-chat =====
app.post('/api/ai-chat', async (req, res) => {
    const { question, sources = [] } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ success: false, error: 'Thiếu câu hỏi.' });
    }

    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
        return res.status(500).json({ success: false, error: 'Chưa cấu hình OPENAI_API_KEY hoặc GEMINI_API_KEY.' });
    }

    const sourceContext = Array.isArray(sources) && sources.length
        ? sources.map((doc, idx) =>
            `${idx + 1}. ${doc.title || 'Văn bản'} (${doc.type || 'N/A'})\n${doc.excerpt || doc.fullText || ''}`
          ).join('\n\n')
        : '';

    try {
        let answer = '';

        if (GEMINI_API_KEY) {
            const promptText = sourceContext
                ? `Bạn là chuyên gia pháp luật đất đai Việt Nam. Hỏi: ${question}\n\nTài liệu tham khảo:\n${sourceContext}`
                : `Bạn là chuyên gia pháp luật đất đai Việt Nam. Hỏi: ${question}`;

            // FIX #6 & #7: Endpoint và auth đúng
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
                    })
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Gemini lỗi ${response.status}: ${text}`);
            }

            const data = await response.json();
            // FIX #8: Sửa path lấy text
            answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không nhận được phản hồi từ Gemini.';

        } else {
            const messageText = sourceContext
                ? `Bạn là chuyên gia pháp luật đất đai Việt Nam. Hỏi: ${question}\n\nTài liệu tham khảo:\n${sourceContext}`
                : `Bạn là chuyên gia pháp luật đất đai Việt Nam. Hỏi: ${question}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: OPENAI_MODEL,
                    messages: [
                        { role: 'system', content: 'Bạn là trợ lý trả lời ngắn gọn, chính xác, chuyên về pháp luật đất đai Việt Nam.' },
                        { role: 'user',   content: messageText }
                    ],
                    temperature: 0.2,
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`OpenAI lỗi ${response.status}: ${text}`);
            }

            const data = await response.json();
            answer = data.choices?.[0]?.message?.content?.trim() || 'Không nhận được phản hồi từ OpenAI.';
        }

        res.json({ success: true, text: answer });
    } catch (error) {
        console.error('AI chat backend error:', error);
        res.status(500).json({ success: false, error: error.message || 'Lỗi server AI.' });
    }
});

// FIX #9: app.listen nằm đúng cấp — không lồng bên trong callback nào khác
app.listen(PORT, () => {
    console.log(`AI backend đang chạy trên http://localhost:${PORT} [${NODE_ENV}]`);
});