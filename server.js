import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Serve static frontend files and local JSON data
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai_chat.html'));
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.post('/api/ai-summary', async (req, res) => {
  const { title, excerpt } = req.body;

  if (!title || !excerpt) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin tài liệu để tóm tắt.' });
  }

  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY.' });
  }

  try {
    const prompt = `Phân tích tóm tắt văn bản pháp luật sau bằng tiếng Việt: ${title}. Mô tả: ${excerpt}. Hãy chỉ ra 3 điểm quan trọng nhất mà người dân cần lưu ý.`;
    let answer = '';

    if (GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generateText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: { text: prompt },
          temperature: 0.2,
          maxOutputTokens: 600
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini lỗi ${response.status}: ${text}`);
      }

      const data = await response.json();
      answer = data?.candidates?.[0]?.output || 'Không nhận được phản hồi từ Gemini.';
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
            { role: 'user', content: prompt }
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

app.post('/api/ai-chat', async (req, res) => {
  const { question, sources = [] } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ success: false, error: 'Thiếu câu hỏi.' });
  }

  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Chưa cấu hình OPENAI_API_KEY hoặc GEMINI_API_KEY.' });
  }

  try {
    let answer = '';

    const sourceContext = Array.isArray(sources) && sources.length
      ? sources.map((doc, idx) => `${idx + 1}. ${doc.title || 'Văn bản'} (${doc.type || 'N/A'})\n${doc.excerpt || doc.fullText || ''}`).join('\n\n')
      : '';

    if (GEMINI_API_KEY) {
      const geminiRequest = {
        prompt: { text: `Bạn là chuyên gia pháp luật đất đai Việt Nam. Hỏi: ${question}` },
        temperature: 0.2,
        maxOutputTokens: 600
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generateText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify(geminiRequest)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini lỗi ${response.status}: ${text}`);
      }

      const data = await response.json();
      answer = data?.candidates?.[0]?.output || 'Không nhận được phản hồi từ Gemini.';
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
            { role: 'user', content: messageText }
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
    console.error('AI backend error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi server AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI backend đang chạy trên http://localhost:${PORT}`);
});
