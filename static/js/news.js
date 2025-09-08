document.addEventListener('DOMContentLoaded', function() {
    initializeNews();
});

let newsOffset = 0;
const newsLimit = 30;
let isLoading = false;
let hasMore = true;

function initializeNews() {
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    // 首次加载
    loadMoreNews();
}

function handleScroll() {
    if (isLoading || !hasMore) return;
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const clientHeight = doc.clientHeight;
    const scrollHeight = doc.scrollHeight;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
    if (nearBottom) {
        loadMoreNews();
    }
}

async function loadMoreNews() {
    if (isLoading || !hasMore) return;
    isLoading = true;
    toggleLoading(true);

    try {
        const resp = await fetch(`/api/news?offset=${newsOffset}&limit=${newsLimit}`);
        if (resp.status === 401) {
            window.location.href = '/';
            return;
        }
        if (!resp.ok) {
            throw new Error('加载失败');
        }
        const data = await resp.json();
        renderNewsItems(data.items || []);
        newsOffset += (data.items || []).length;
        hasMore = !!data.has_more;
        
        if (!hasMore) {
            document.getElementById('endIndicator').style.display = 'block';
            toggleLoading(false);
        }
    } catch (e) {
        console.error(e);
    } finally {
        isLoading = false;
        if (hasMore) toggleLoading(false);
    }
}

function renderNewsItems(items) {
    const grid = document.getElementById('newsList');
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        
        const thumb = item.thumbnail_url || item.image_url;
        const imageHtml = thumb ? 
            `<img src="${thumb}" alt="${escapeHtml(item.title || '无标题')}" class="news-card-image" onerror="this.style.display='none'"/>` : 
            `<div class="news-card-image"></div>`;
        
        card.innerHTML = `
            ${imageHtml}
            <div class="news-card-content">
                <a href="/article/${item.id}" class="news-card-title" 
                   onclick="recordView(${item.id}, this)">${escapeHtml(item.title || '无标题')}</a>
                <div class="news-card-meta">
                    <span class="news-card-source">${escapeHtml(item.source || '')}</span>
                    <span class="news-card-time">${formatDateTime(item.published_at)}</span>
                </div>
                <div class="news-card-summary">${truncateHtml(item.summary || '', 120)}</div>
                <div class="news-card-actions">
                    <span class="news-card-action" data-view-count="${item.id}">
                        <i class="far fa-eye"></i> <span id="view-${item.id}">${item.view_count || 0}</span> 浏览
                    </span>
                    <span class="news-card-action"><i class="far fa-comment"></i> 评论</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function toggleLoading(show) {
    const el = document.getElementById('loadMoreIndicator');
    if (el) el.style.display = show ? 'block' : 'none';
}

function formatDateTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('zh-CN');
    } catch (_) {
        return '';
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncateHtml(html, maxLen) {
    const div = document.createElement('div');
    div.innerHTML = html;
    let text = div.textContent || div.innerText || '';
    text = removeUrls(text);
    if (text.length <= maxLen) return escapeHtml(text);
    return escapeHtml(text.slice(0, maxLen)) + '...';
}

async function recordView(articleId, linkElement) {
    try {
        const resp = await fetch(`/api/view/${articleId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (resp.ok) {
            const data = await resp.json();
            // 更新显示的浏览数
            const viewElement = document.getElementById(`view-${articleId}`);
            if (viewElement) {
                viewElement.textContent = data.view_count;
            }
        }
    } catch (e) {
        console.error('记录浏览失败:', e);
    }
    
    // 允许正常跳转
    return true;
}

// 过滤纯文本 URL 与常见"Article URL/Comments URL"等提示行
function removeUrls(text) {
    return String(text)
        // 移除常见英文提示行
        .replace(/\b(Article URL|Comments URL)\s*:\s*\S+/gi, '')
        // 移除 http/https URL
        .replace(/https?:\/\/\S+/gi, '')
        // 移除以 www 开头的域名
        .replace(/\bwww\.[\w.-]+\.[a-z]{2,}(\/\S*)?/gi, '')
        // 合并多余空白
        .replace(/\s{2,}/g, ' ')
        .trim();
}


