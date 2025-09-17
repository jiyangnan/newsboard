document.addEventListener('DOMContentLoaded', function() {
    initializeArticle();
});

function initializeArticle() {
    loadComments();
    setupCommentForm();
    updateViewCount();
}

let activeReplyForm = null;
const COMMENT_MAX_LENGTH = 1000;

// 加载评论列表
async function loadComments() {
    try {
        const response = await fetch(`/api/comments/${articleId}`);
        if (!response.ok) {
            throw new Error('获取评论失败');
        }
        
        const data = await response.json();
        const comments = data.comments || [];
        const totalCount = typeof data.total_count === 'number' ? data.total_count : comments.length;

        renderComments(comments);
        updateCommentsCount(totalCount);
        
    } catch (error) {
        console.error('加载评论失败:', error);
        showError('加载评论失败，请稍后重试');
    }
}

// 渲染评论列表
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const noComments = document.getElementById('noComments');
    activeReplyForm = null;
    
    if (comments.length === 0) {
        commentsList.innerHTML = '';
        noComments.style.display = 'block';
        return;
    }
    
    noComments.style.display = 'none';
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment, 0);
        commentsList.appendChild(commentElement);
    });
}

// 创建单个评论元素
function createCommentElement(comment, depth = 0) {
    const div = document.createElement('div');
    div.className = depth === 0 ? 'comment-item' : 'comment-item comment-reply-item';
    div.dataset.commentId = comment.id;
    
    const time = new Date(comment.created_at).toLocaleString('zh-CN');
    const safeUsername = escapeHtml(comment.username || '未知用户');
    const safeContent = escapeHtml(comment.content || '');
    const parentName = comment.parent_username && depth > 0 ? escapeHtml(comment.parent_username) : null;
    const parentHtml = parentName ? `<div class="comment-parent">回复 <span class="comment-parent-name">@${parentName}</span></div>` : '';
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${safeUsername}</span>
            <span class="comment-time">${time}</span>
        </div>
        <div class="comment-content">
            ${parentHtml}
            <div class="comment-text">${safeContent}</div>
        </div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const replyButton = document.createElement('button');
    replyButton.type = 'button';
    replyButton.className = 'comment-action-button';
    replyButton.innerHTML = '<i class="fas fa-reply"></i> 回复';
    replyButton.addEventListener('click', () => toggleReplyForm(div, comment));

    actions.appendChild(replyButton);
    div.appendChild(actions);

    if (Array.isArray(comment.replies) && comment.replies.length > 0) {
        const repliesWrapper = document.createElement('div');
        repliesWrapper.className = 'comment-replies';
        comment.replies.forEach(reply => {
            repliesWrapper.appendChild(createCommentElement(reply, depth + 1));
        });
        div.appendChild(repliesWrapper);
    }
    
    return div;
}

function toggleReplyForm(commentElement, comment) {
    const existingForm = commentElement.querySelector('.reply-form');
    if (existingForm) {
        existingForm.remove();
        if (activeReplyForm && activeReplyForm.element === commentElement) {
            activeReplyForm = null;
        }
        return;
    }

    if (activeReplyForm && activeReplyForm.form.parentNode) {
        activeReplyForm.form.remove();
        activeReplyForm = null;
    }

    const form = createReplyForm(comment);
    const repliesBlock = commentElement.querySelector('.comment-replies');
    if (repliesBlock) {
        commentElement.insertBefore(form, repliesBlock);
    } else {
        commentElement.appendChild(form);
    }

    activeReplyForm = { element: commentElement, form };

    const textarea = form.querySelector('textarea');
    if (textarea) {
        textarea.focus();
    }
}

function createReplyForm(comment) {
    const wrapper = document.createElement('div');
    wrapper.className = 'reply-form';

    const textarea = document.createElement('textarea');
    textarea.className = 'reply-textarea';
    textarea.placeholder = `回复 ${comment.username || ''}...`;
    textarea.maxLength = COMMENT_MAX_LENGTH;

    const actions = document.createElement('div');
    actions.className = 'reply-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'reply-cancel';
    cancelButton.textContent = '取消';

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.className = 'reply-submit';
    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 发布';

    cancelButton.addEventListener('click', () => {
        wrapper.remove();
        if (activeReplyForm && activeReplyForm.form === wrapper) {
            activeReplyForm = null;
        }
    });

    submitButton.addEventListener('click', () => submitReply(comment.id, textarea, submitButton));

    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);

    wrapper.appendChild(textarea);
    wrapper.appendChild(actions);

    return wrapper;
}

async function submitReply(parentId, textarea, submitButton) {
    const content = textarea.value.trim();

    if (!content) {
        showError('回复内容不能为空');
        return;
    }

    if (content.length > COMMENT_MAX_LENGTH) {
        showError('回复内容过长');
        return;
    }

    const originalHtml = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';

    try {
        const response = await fetch(`/api/comments/${articleId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, parent_id: parentId })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('回复成功！');

            if (activeReplyForm && activeReplyForm.form.contains(textarea)) {
                activeReplyForm.form.remove();
                activeReplyForm = null;
            }

            await loadComments();
        } else {
            showError(data.message || '回复失败');
        }
    } catch (error) {
        console.error('回复失败:', error);
        showError('回复失败，请稍后重试');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalHtml;
    }
}

// 设置评论表单
function setupCommentForm() {
    const commentTextarea = document.getElementById('commentContent');
    const submitButton = document.getElementById('submitComment');
    const charCount = document.getElementById('charCount');
    const warningThreshold = COMMENT_MAX_LENGTH - 100;
    
    // 字数统计和限制
    commentTextarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        if (length > warningThreshold) {
            charCount.classList.add('warning');
        } else {
            charCount.classList.remove('warning');
        }
        
        submitButton.disabled = length === 0 || length > COMMENT_MAX_LENGTH;
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
    
    if (content.length > COMMENT_MAX_LENGTH) {
        showError('评论内容过长');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';
    
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
            document.getElementById('charCount').classList.remove('warning');
            submitButton.disabled = true;
            
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
        submitButton.innerHTML = '发布';
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
