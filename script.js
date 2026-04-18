// ===== API Configuration =====
// API Key được tải từ server (lưu trữ trong .env)
let API_KEY_PLACEHOLDER = null;
let mockDocs = [];

// Fetch config từ server
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to load config');
        const config = await response.json();
        API_KEY_PLACEHOLDER = config.apiKey;
        console.log('Config loaded successfully');
    } catch (err) {
        console.error('Failed to load API config:', err);
        API_KEY_PLACEHOLDER = 'MISSING_API_KEY';
    }
}

// ===== Initialize Documents =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig(); // Load API key from server first
    loadDocuments();
    updateDate();
    setupEventListeners();
});

function loadDocuments() {
    fetch('/van_ban_phap_luat_dat_dai.json')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            mockDocs = data || [];
            const searchResult = document.getElementById('searchResult');
            if (searchResult) {
                searchResult.innerHTML = '<div class="text-center py-10 text-gray-500">Nhập từ khóa để tìm kiếm văn bản pháp luật.</div>';
            }
        })
        .catch(err => {
            console.error('Failed to load documents:', err);
            const searchResult = document.getElementById('searchResult');
            if (searchResult) {
                searchResult.innerHTML = '<div class="text-center py-10 text-red-500">⚠️ Lỗi: Không thể tải dữ liệu văn bản. (' + err.message + ')</div>';
            }
        });
}

function setupEventListeners() {
    const globalSearch = document.getElementById('globalSearch');
    const chatInput = document.getElementById('chatInput');
    
    if (globalSearch) {
        globalSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                doSearch(globalSearch.value.trim());
            }
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChat();
            }
        });
    }
}

// ===== Dropdown Menu =====
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.warn(`Dropdown với ID "${dropdownId}" không tìm thấy`);
        return;
    }
    dropdown.classList.toggle('hidden');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target.tagName !== 'A') {
            dropdown.classList.add('hidden');
        }
    });
}

// ===== Search Functions =====
function doSearch(query = '') {
    const container = document.getElementById('searchResult');
    if (!container) {
        console.error('Search result container not found');
        return;
    }
    
    if (!query.trim()) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Nhập từ khóa để tìm kiếm văn bản pháp luật.</div>';
        return;
    }
    
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-gov-blue text-2xl"></i><p class="mt-2 text-sm">Đang tải dữ liệu văn bản...</p></div>';

    // Simulate search delay
    setTimeout(() => {
        if (!mockDocs.length) {
            container.innerHTML = '<div class="text-center py-10 text-red-500">Lỗi: Dữ liệu không được tải. Làm mới trang.</div>';
            return;
        }

        container.innerHTML = '';
        
        const filteredDocs = mockDocs.filter(doc => {
            const searchText = (
                (doc.title || '') + ' ' + 
                (doc.excerpt || '') + ' ' + 
                (doc.type || '')
            ).toLowerCase();
            
            const queryWords = query.toLowerCase().split(/\s+/);
            return queryWords.some(word => searchText.includes(word) && word.length > 0);
        });
        
        if (filteredDocs.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-gray-500">Không tìm thấy văn bản nào phù hợp.</div>';
            return;
        }
        
        filteredDocs.forEach(doc => {
            const div = document.createElement('div');
            div.className = "group border-b pb-4 last:border-0 hover:bg-yellow-50/50 p-2 transition-colors";
            
            const docString = encodeURIComponent(JSON.stringify(doc));
            div.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[10px] font-bold bg-gov-blue text-white px-2 rounded uppercase">${escapeHtml(doc.type || 'VĂNS BẢN')}</span>
                    <span class="text-[10px] text-gray-500 italic"><i class="far fa-clock mr-1"></i>${escapeHtml(doc.date || 'N/A')}</span>
                </div>
                <h3 class="text-gov-blue font-bold group-hover:underline cursor-pointer decoration-gov-red" onclick="openDoc('${docString}')">
                    ${escapeHtml(doc.title || 'Không có tiêu đề')}
                </h3>
                <p class="text-xs text-gray-600 font-medium mb-2 uppercase">Cơ quan ban hành: ${escapeHtml(doc.agency || 'N/A')}</p>
                <p class="text-xs text-gray-700 line-clamp-2 italic">"${escapeHtml(doc.excerpt || 'Không có mô tả')}"</p>
                <div class="mt-3 flex gap-2">
                    <button onclick="openDoc('${docString}')" class="text-xs border border-gov-blue text-gov-blue px-3 py-1 hover:bg-gov-blue hover:text-white font-bold rounded">TÓM TẮT AI</button>
                    <button onclick="summarizeAI('${escapeHtml(doc.id || '')}')" class="text-xs bg-gov-red text-white px-3 py-1 hover:opacity-90 font-bold rounded shadow-sm"><i class="fas fa-bolt mr-1"></i>XEM CHI TIẾT</button>
                </div>
            `;
            container.appendChild(div);
        });
    }, 600);
}

function openDoc(docString) {
    try {
        const doc = JSON.parse(decodeURIComponent(docString));
        const viewer = document.getElementById('docViewer');
        
        if (!viewer) {
            console.error('Document viewer not found');
            return;
        }
        
        viewer.classList.remove('hidden');
        viewer.scrollIntoView({ behavior: 'smooth' });

        viewer.innerHTML = `
            <div class="bg-gray-100 p-3 flex justify-between items-center border-b">
                <span class="text-xs font-bold text-gov-blue uppercase italic"><i class="fas fa-file-alt mr-2"></i>Văn bản tóm tắt</span>
                <button onclick="document.getElementById('docViewer').classList.add('hidden')" class="text-gray-500 hover:text-red-500 text-xl">&times;</button>
            </div>
            <div class="p-6">
                <div class="text-center mb-6">
                    <p class="uppercase text-xs font-bold mb-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p class="uppercase text-xs font-bold border-b-2 border-black inline-block pb-1 px-4">Độc lập - Tự do - Hạnh phúc</p>
                </div>
                <h2 class="text-lg font-bold text-center text-gov-red mb-6 uppercase">${escapeHtml(doc.title || '')}</h2>
                <div class="bg-yellow-50 p-4 border rounded mb-6 text-sm italic border-yellow-200">
                    <strong>Nội dung tóm lược:</strong> ${escapeHtml(doc.excerpt || '')}
                </div>
                <div class="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm">
                    <p class="mb-4">${escapeHtml(doc.fullText || doc.excerpt || '')}</p>
                    <p><strong>Cơ quan ban hành:</strong> ${escapeHtml(doc.agency || '')}</p>
                    <div id="aiSummaryArea" class="mt-8 border-t pt-4 hidden">
                        <h4 class="font-bold text-gov-blue mb-2"><i class="fas fa-magic mr-2 text-yellow-500"></i>AI Phân tích chi tiết:</h4>
                        <div id="aiSummaryContent" class="text-xs bg-gray-50 p-4 rounded border-l-4 border-gov-red leading-relaxed">
                            Đang xử lý nội dung bằng Gemini...
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error opening document:', err);
        alert('Lỗi: Không thể mở tài liệu. ' + err.message);
    }
}

async function summarizeAI(docId) {
    if (!docId || docId === 'undefined' || docId === null) {
        console.warn('Invalid docId:', docId);
        alert('⚠️ Lỗi: ID tài liệu không hợp lệ');
        return;
    }
    
    const doc = mockDocs.find(d => d.id === docId);
    if (!doc) {
        console.error('Document not found:', docId);
        alert('⚠️ Lỗi: Không tìm thấy tài liệu');
        return;
    }
    
    // Try to open doc viewer
    try {
        openDoc(encodeURIComponent(JSON.stringify(doc)));
    } catch (err) {
        console.error('Error in openDoc:', err);
    }
    
    const summaryArea = document.getElementById('aiSummaryArea');
    const summaryContent = document.getElementById('aiSummaryContent');
    
    if (!summaryArea || !summaryContent) {
        console.error('Summary elements not found');
        return;
    }
    
    summaryArea.classList.remove('hidden');
    summaryContent.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Đang yêu cầu trí tuệ nhân tạo phân tích nội dung văn bản...';

    // Check API Key
    if (API_KEY_PLACEHOLDER === "YOUR_API_KEY_HERE") {
        summaryContent.innerHTML = '<span class="text-red-500">⚠️ Lỗi: API Key chưa được cấu hình. Vui lòng thiết lập biến môi trường.</span>';
        console.warn('API Key is not configured properly');
        return;
    }

    try {
        const prompt = `Phân tích tóm tắt văn bản pháp luật sau bằng tiếng Việt: ${doc.title}. Mô tả: ${doc.excerpt}. Hãy chỉ ra 3 điểm quan trọng nhất mà người dân cần lưu ý.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY_PLACEHOLDER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!response.ok) {
            const errText = await response.text();
            console.error('AI summary API error', response.status, errText);
            
            if (response.status === 401) {
                summaryContent.innerHTML = '<span class="text-red-500">❌ Lỗi: API Key không hợp lệ hoặc không được phép</span>';
            } else if (response.status === 429) {
                summaryContent.innerHTML = '<span class="text-orange-500">⚠️ Lỗi: Quá nhiều yêu cầu. Vui lòng chờ và thử lại</span>';
            } else {
                summaryContent.innerHTML = `<span class="text-red-500">❌ Lỗi AI (${response.status})</span>`;
            }
            return;
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể thực hiện tóm tắt lúc này.";
        summaryContent.innerHTML = `<div class="whitespace-pre-line">${escapeHtml(text)}</div>`;
    } catch (error) {
        console.error('AI summary fetch failed', error);
        summaryContent.innerHTML = `<span class="text-red-500">❌ Lỗi: ${error.message}. Kiểm tra console để biết chi tiết.</span>`;
    }
}

// ===== NLP Functions =====
function preprocessText(text) {
    return (text || '').toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectIntent(text) {
    const clean = preprocessText(text);
    
    if (clean.includes("bồi thường") || clean.includes("bồi thương")) return "BỒI THƯỜNG";
    if (clean.includes("thu hồi") || clean.includes("thu hoi")) return "THU HỒI ĐẤT";
    if (clean.includes("giá đất") || clean.includes("gia dat")) return "GIÁ ĐẤT";
    if (clean.includes("sổ đỏ") || clean.includes("so do") || clean.includes("giấy chứng thực quyền")) return "SỔ ĐỎ / GCN";
    if (clean.includes("chuyển mục đích") || clean.includes("chuyen toc dich")) return "CHUYỂN MỤC ĐÍCH";
    if (clean.includes("thủ tục") || clean.includes("quy trình")) return "THỦ TỤC HÀNH CHÍNH";
    
    return "TỔNG HỢP";
}

// ===== Chat Functions =====
async function sendChat() {
    const input = document.getElementById('chatInput');
    const question = (input ? input.value : '').trim();
    
    if (!question) return;

    const chatBox = document.getElementById('chatBox');
    if (!chatBox) {
        console.error('Chat box not found');
        return;
    }
    
    // User message
    const userDiv = document.createElement('div');
    userDiv.className = "flex justify-end gap-2";
    userDiv.innerHTML = `
        <div class="bg-gov-blue text-white p-3 rounded-lg shadow-sm max-w-[85%]">
            ${escapeHtml(question)}
        </div>
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-gov-blue shrink-0">
            <i class="fas fa-user text-xs"></i>
        </div>
    `;
    chatBox.appendChild(userDiv);
    
    if (input) input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // AI placeholder
    const aiId = 'ai-' + Date.now();
    const aiDiv = document.createElement('div');
    aiDiv.className = "flex items-start gap-2";
    aiDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gov-red flex items-center justify-center text-white shrink-0 shadow">
            <i class="fas fa-gavel text-xs"></i>
        </div>
        <div id="${aiId}" class="bg-white p-3 rounded-lg border shadow-sm max-w-[85%]">
            <i class="fas fa-spinner fa-spin mr-2"></i>Đang tra cứu luật...
        </div>
    `;
    chatBox.appendChild(aiDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Check API Key
    if (API_KEY_PLACEHOLDER === "YOUR_API_KEY_HERE") {
        document.getElementById(aiId).innerHTML = '<span class="text-red-500">⚠️ Lỗi: API Key chưa được cấu hình</span>';
        return;
    }

    try {
        const intent = detectIntent(question);
        const systemPrompt = `Bạn là trợ lý ảo của Cổng Thông tin Pháp luật Đất đai Chính phủ Việt Nam. Hãy trả lời các câu hỏi về luật đất đai (đặc biệt là Luật Đất đai 2024) một cách trang trọng, chính xác và dễ hiểu. Trích dẫn các điều luật nếu có thể.\n\nChủ đề người dùng hỏi: ${intent}`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY_PLACEHOLDER}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: question }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });
        
        if (!response.ok) {
            const errText = await response.text();
            console.error('Chat API error', response.status, errText);
            
            if (response.status === 401) {
                document.getElementById(aiId).innerHTML = '<span class="text-red-500">❌ Lỗi: API Key không đúng</span>';
            } else {
                document.getElementById(aiId).innerHTML = `<span class="text-red-500">❌ Lỗi (${response.status})</span>`;
            }
            return;
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi chưa tìm thấy thông tin phù hợp.";
        
        document.getElementById(aiId).innerHTML = `<div class="whitespace-pre-line">${escapeHtml(text)}</div>`;
    } catch (error) {
        console.error('Chat fetch failed', error);
        document.getElementById(aiId).innerHTML = `<span class="text-red-500">❌ Lỗi: ${error.message}</span>`;
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== Utility Functions =====
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function updateDate() {
    const currentDateEl = document.getElementById('currentDate');
    if (!currentDateEl) return;
    
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];
    const date = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    currentDateEl.innerHTML = `<i class="fas fa-calendar-alt mr-1"></i> ${dayName}, ngày ${date}/${month}/${year}`;
}

setInterval(updateDate, 60000); // Update every minute
