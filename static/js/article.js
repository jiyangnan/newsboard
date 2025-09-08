document.addEventListener('DOMContentLoaded', function() {
    initializeArticle();
});

function initializeArticle() {
    loadComments();
    setupCommentForm();
    updateViewCount();
}

// 加载评论列表
async function loadComments() {
    try {
        const response = await fetch(`/api/comments/${articleId}`);
        if (!response.ok) {
            throw new Error('获取评论失败');
        }
        
        const data = await response.json();
        const comments = data.comments || [];
        
        renderComments(comments);
        updateCommentsCount(comments.length);
        
    } catch (error) {
        console.error('加载评论失败:', error);
        showError('加载评论失败，请稍后重试');
    }
}

// 渲染评论列表
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const noComments = document.getElementById('noComments');
    
    if (comments.length === 0) {
        commentsList.innerHTML = '';
        noComments.style.display = 'block';
        return;
    }
    
    noComments.style.display = 'none';
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
}

// 创建单个评论元素
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    const time = new Date(comment.created_at).toLocaleString('zh-CN');
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.username)}</span>
            <span class="comment-time">${time}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
    `;
    
    return div;
}

// 设置评论表单
function setupCommentForm() {
    const commentTextarea = document.getElementById('commentContent');
    const submitButton = document.getElementById('submitComment');
    const charCount = document.getElementById('charCount');
    
    // 字数统计和限制
    commentTextarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        if (length > 900) {
            charCount.classList.add('warning');
        } else {
            charCount.classList.remove('warning');
        }
        
        submitButton.disabled = length === 0 || length > 1000;
    });
    
    // 提交评论
    submitButton.addEventListener('click', submitComment);
    
    // 回车提交（Ctrl+Enter）
    commentTextarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!submitButton.disabled) {
                submitComment();
            }
        }
    });
}

// 提交评论
async function submitComment() {
    const content = document.getElementById('commentContent').value.trim();
    const submitButton = document.getElementById('submitComment');
    
    if (!content) {
        showError('评论内容不能为空');
        return;
    }
    
    if (content.length > 1000) {
        showError('评论内容过长');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发表中...';
    
    try {
        const response = await fetch(`/api/comments/${articleId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清空输入框
            document.getElementById('commentContent').value = '';
            document.getElementById('charCount').textContent = '0';
            
            // 重新加载评论
            await loadComments();
            
            // 滚动到最新评论
            const commentsList = document.getElementById('commentsList');
            if (commentsList.firstChild) {
                commentsList.firstChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            showSuccess('评论发表成功！');
            
        } else {
            showError(data.message || '发表评论失败');
        }
        
    } catch (error) {
        console.error('发表评论失败:', error);
        showError('发表评论失败，请稍后重试');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 发表评论';
    }
}

// 更新浏览数显示
function updateViewCount() {
    const viewCountElement = document.getElementById('viewCount');
    if (viewCountElement) {
        const currentCount = parseInt(viewCountElement.textContent) || 0;
        viewCountElement.textContent = currentCount;
    }
}

// 更新评论数量
function updateCommentsCount(count) {
    const countElement = document.getElementById('commentsCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// 显示成功消息
function showSuccess(message) {
    showMessage(message, 'success');
}

// 显示错误消息
function showError(message) {
    showMessage(message, 'error');
}

// 显示消息提示
function showMessage(message, type) {
    // 移除现有消息
    const existing = document.querySelector('.message-toast');
    if (existing) {
        existing.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `message-toast message-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载时的动画效果
document.addEventListener('DOMContentLoaded', function() {
    // 添加淡入效果
    const articleContent = document.querySelector('.article-content');
    const commentsSection = document.querySelector('.comments-section');
    
    if (articleContent) {
        articleContent.style.opacity = '0';
        articleContent.style.transform = 'translateY(20px)';
        articleContent.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            articleContent.style.opacity = '1';
            articleContent.style.transform = 'translateY(0)';
        }, 100);
    }
    
    if (commentsSection) {
        commentsSection.style.opacity = '0';
        commentsSection.style.transform = 'translateY(20px)';
        commentsSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            commentsSection.style.opacity = '1';
            commentsSection.style.transform = 'translateY(0)';
        }, 300);
    }
});

// 消息提示样式
const style = document.createElement('style');
style.textContent = `
    .message-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease;
    }
    
    .message-success {
        background: #27ae60;
    }
    
    .message-error {
        background: #e74c3c;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);