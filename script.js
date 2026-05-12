// ===== Dữ liệu văn bản =====
let mockDocs = [];

// FIX #4: Dùng cờ trạng thái thay vì setTimeout cố định
let docsLoaded = false;
let docsLoadError = null;

// ===== Khởi động =====
document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();
    updateDate();
    setupEventListeners();
});

function loadDocuments() {
    fetch('van_ban_phap_luat_dat_dai.json')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            mockDocs = data || [];
            docsLoaded = true;
            docsLoadError = null;
            const el = document.getElementById('searchResult');
            if (el) el.innerHTML = '<div class="text-center py-10 text-gray-500">Nhập từ khóa để tìm kiếm văn bản pháp luật.</div>';
        })
        .catch(err => {
            console.error('Lỗi tải dữ liệu:', err);
            docsLoaded = false;
            docsLoadError = err.message;
            const el = document.getElementById('searchResult');
            if (el) el.innerHTML = `<div class="text-center py-10 text-red-500">⚠️ Không thể tải dữ liệu văn bản. (${err.message})</div>`;
        });
}

function setupEventListeners() {
    const globalSearch = document.getElementById('globalSearch');
    const chatInput    = document.getElementById('chatInput');

    globalSearch?.addEventListener('keypress', e => {
        if (e.key === 'Enter') doSearch(globalSearch.value.trim());
    });
    chatInput?.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendChat();
    });
}

// ===== Dropdown =====
// FIX #5: Dùng một listener duy nhất, không tích lũy
let dropdownCloseHandler = null;

function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const isHidden = el.classList.contains('hidden');

    // Đóng tất cả dropdown đang mở trước
    document.querySelectorAll('[id$="Dropdown"]').forEach(d => d.classList.add('hidden'));

    // Nếu dropdown đang đóng thì mở, nếu đang mở thì thôi (đã đóng ở trên)
    if (isHidden) {
        el.classList.remove('hidden');

        // Xóa listener cũ nếu còn
        if (dropdownCloseHandler) {
            document.removeEventListener('click', dropdownCloseHandler);
        }

        dropdownCloseHandler = function(e) {
            if (!el.contains(e.target)) {
                el.classList.add('hidden');
                document.removeEventListener('click', dropdownCloseHandler);
                dropdownCloseHandler = null;
            }
        };

        // Dùng setTimeout để tránh listener bắt ngay click hiện tại
        setTimeout(() => document.addEventListener('click', dropdownCloseHandler), 0);
    }
}

// ===== Tìm kiếm =====
function doSearch(query = '') {
    const container = document.getElementById('searchResult');
    if (!container) return;

    if (!query.trim()) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Nhập từ khóa để tìm kiếm văn bản pháp luật.</div>';
        return;
    }

    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-gov-blue text-2xl"></i><p class="mt-2 text-sm">Đang tìm kiếm...</p></div>';

    // FIX #4: Kiểm tra trạng thái tải thực sự, không dùng timeout cố định
    if (docsLoadError) {
        container.innerHTML = `<div class="text-center py-10 text-red-500">⚠️ Dữ liệu chưa tải được (${docsLoadError}). Vui lòng làm mới trang.</div>`;
        return;
    }

    if (!docsLoaded) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Dữ liệu đang tải, vui lòng thử lại sau giây lát...</div>';
        return;
    }

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = mockDocs.filter(doc => {
        const haystack = `${doc.title} ${doc.excerpt} ${doc.type}`.toLowerCase();
        return words.some(w => haystack.includes(w));
    });

    if (!filtered.length) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Không tìm thấy văn bản nào phù hợp.</div>';
        return;
    }

    container.innerHTML = '';

    filtered.forEach((doc, index) => {
        const div = document.createElement('div');
        div.className = 'group border-b pb-4 last:border-0 hover:bg-yellow-50/50 p-2 transition-colors';

        // FIX #2: Không nhúng JSON vào onclick attribute — dùng dataset + addEventListener
        div.dataset.docIndex = index;

        div.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-bold bg-gov-blue text-white px-2 rounded uppercase">${escapeHtml(doc.type || 'VĂN BẢN')}</span>
                <span class="text-[10px] text-gray-500 italic"><i class="far fa-clock mr-1"></i>${escapeHtml(doc.date || 'N/A')}</span>
            </div>
            <h3 class="text-gov-blue font-bold group-hover:underline cursor-pointer decoration-gov-red doc-title">
                ${escapeHtml(doc.title || 'Không có tiêu đề')}
            </h3>
            <p class="text-xs text-gray-600 font-medium mb-2 uppercase">Cơ quan ban hành: ${escapeHtml(doc.agency || 'N/A')}</p>
            <p class="text-xs text-gray-700 line-clamp-2 italic">"${escapeHtml(doc.excerpt || 'Không có mô tả')}"</p>
            <div class="mt-3 flex gap-2">
                <button class="btn-open text-xs border border-gov-blue text-gov-blue px-3 py-1 hover:bg-gov-blue hover:text-white font-bold rounded">
                    XEM CHI TIẾT
                </button>
                <button class="btn-ai text-xs bg-gov-red text-white px-3 py-1 hover:opacity-90 font-bold rounded shadow-sm">
                    <i class="fas fa-bolt mr-1"></i>TÓM TẮT AI
                </button>
            </div>
        `;

        // FIX #2: Gắn event listener thay vì dùng onclick attribute với JSON
        div.querySelector('.doc-title').addEventListener('click', () => openDoc(doc));
        div.querySelector('.btn-open').addEventListener('click', () => openDoc(doc));
        div.querySelector('.btn-ai').addEventListener('click', () => summarizeAI(doc));

        container.appendChild(div);
    });
}

// ===== Xem chi tiết văn bản =====
function openDoc(doc) {
    if (!doc) return;

    const viewer = document.getElementById('docViewer');
    if (!viewer) return;

    viewer.classList.remove('hidden');
    viewer.scrollIntoView({ behavior: 'smooth' });
    viewer.innerHTML = `
        <div class="bg-gray-100 p-3 flex justify-between items-center border-b">
            <span class="text-xs font-bold text-gov-blue uppercase italic">
                <i class="fas fa-file-alt mr-2"></i>Thông tin văn bản
            </span>
            <button onclick="document.getElementById('docViewer').classList.add('hidden')"
                    class="text-gray-500 hover:text-red-500 text-xl">&times;</button>
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
            <p><strong>Cơ quan ban hành:</strong> ${escapeHtml(doc.agency || '')}</p>
            <div id="aiSummaryArea" class="mt-8 border-t pt-4 hidden">
                <h4 class="font-bold text-gov-blue mb-2">
                    <i class="fas fa-magic mr-2 text-yellow-500"></i>AI Phân tích chi tiết:
                </h4>
                <div id="aiSummaryContent" class="text-xs bg-gray-50 p-4 rounded border-l-4 border-gov-red leading-relaxed whitespace-pre-line"></div>
            </div>
        </div>
    `;
}

// ===== Tóm tắt AI =====
// FIX #3: summarizeAI nhận object doc trực tiếp, không dùng encoded string.
//         Luôn gọi openDoc() trước để đảm bảo #aiSummaryArea tồn tại trong DOM.
async function summarizeAI(doc) {
    if (!doc) return;

    const viewer = document.getElementById('docViewer');

    // Luôn render lại docViewer để đảm bảo #aiSummaryArea có trong DOM
    openDoc(doc);

    // Sau khi openDoc() đồng bộ render xong, lấy element
    const area    = document.getElementById('aiSummaryArea');
    const content = document.getElementById('aiSummaryContent');
    if (!area || !content) {
        console.error('Không tìm thấy #aiSummaryArea sau openDoc()');
        return;
    }

    area.classList.remove('hidden');
    content.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Đang yêu cầu AI phân tích...';

    try {
        const res = await fetch('/api/ai-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: doc.title, excerpt: doc.excerpt })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        content.innerHTML = `<div class="whitespace-pre-line">${escapeHtml(data.text)}</div>`;
    } catch (err) {
        console.error('Lỗi AI summary:', err);
        content.innerHTML = `<span class="text-red-500">❌ Lỗi: ${escapeHtml(err.message)}</span>`;
    }
}

// ===== NLP: nhận diện chủ đề =====
function detectIntent(text) {
    const t = text.toLowerCase();
    if (t.includes('bồi thường'))        return 'BỒI THƯỜNG';
    if (t.includes('thu hồi'))           return 'THU HỒI ĐẤT';
    if (t.includes('giá đất'))           return 'GIÁ ĐẤT';
    if (t.includes('sổ đỏ') || t.includes('giấy chứng nhận')) return 'SỔ ĐỎ / GCN';
    if (t.includes('chuyển mục đích'))   return 'CHUYỂN MỤC ĐÍCH';
    if (t.includes('thủ tục') || t.includes('quy trình')) return 'THỦ TỤC HÀNH CHÍNH';
    return 'TỔNG HỢP';
}

// ===== Chat =====
async function sendChat() {
    const input   = document.getElementById('chatInput');
    const chatBox = document.getElementById('chatBox');
    const question = input?.value.trim();
    if (!question || !chatBox) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'flex justify-end gap-2';
    userDiv.innerHTML = `
        <div class="bg-gov-blue text-white p-3 rounded-lg shadow-sm max-w-[85%]">${escapeHtml(question)}</div>
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-gov-blue shrink-0">
            <i class="fas fa-user text-xs"></i>
        </div>
    `;
    chatBox.appendChild(userDiv);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const aiId  = 'ai-' + Date.now();
    const aiDiv = document.createElement('div');
    aiDiv.className = 'flex items-start gap-2';
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

    try {
        const intent = detectIntent(question);
        const res = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: `[${intent}] ${question}` })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        document.getElementById(aiId).innerHTML =
            `<div class="whitespace-pre-line">${escapeHtml(data.text)}</div>`;
    } catch (err) {
        console.error('Lỗi AI chat:', err);
        document.getElementById(aiId).innerHTML =
            `<span class="text-red-500">❌ Lỗi: ${escapeHtml(err.message)}</span>`;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== Tiện ích =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
}

function updateDate() {
    const el = document.getElementById('currentDate');
    if (!el) return;
    const now  = new Date();
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    const d    = String(now.getDate()).padStart(2, '0');
    const m    = String(now.getMonth() + 1).padStart(2, '0');
    el.innerHTML = `<i class="fas fa-calendar-alt mr-1"></i> ${days[now.getDay()]}, ngày ${d}/${m}/${now.getFullYear()}`;
}

// FIX #7: Tạm dừng interval khi tab không active để tiết kiệm tài nguyên
let dateInterval = setInterval(updateDate, 60_000);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(dateInterval);
    } else {
        updateDate(); // Cập nhật ngay khi tab active lại
        dateInterval = setInterval(updateDate, 60_000);
    }
});