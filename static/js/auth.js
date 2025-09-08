// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    // 获取DOM元素
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    
    // 绑定事件监听器
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForm('register');
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForm('login');
        });
    }
}

// 切换表单显示
function showForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (formType === 'register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        document.querySelector('.form-header h1').textContent = '创建账户';
        document.querySelector('.form-header p').textContent = '请填写以下信息完成注册';
    } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        document.querySelector('.form-header h1').textContent = '欢迎回来';
        document.querySelector('.form-header p').textContent = '请登录您的账户';
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('请填写完整的登录信息', 'error');
        return;
    }
    
    const button = e.target.querySelector('button');
    const buttonText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    
    // 显示加载状态
    buttonText.style.display = 'none';
    spinner.style.display = 'block';
    button.disabled = true;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // 登录成功后重定向到资讯列表
            setTimeout(() => {
                window.location.href = '/news';
            }, 1000);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        // 恢复按钮状态
        buttonText.style.display = 'block';
        spinner.style.display = 'none';
        button.disabled = false;
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (!username || !email || !password) {
        showNotification('请填写完整的注册信息', 'error');
        return;
    }
    
    // 简单的验证
    if (username.length < 3) {
        showNotification('用户名至少需要3个字符', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('密码至少需要6个字符', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('请输入有效的邮箱地址', 'error');
        return;
    }
    
    const button = e.target.querySelector('button');
    const buttonText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    
    // 显示加载状态
    buttonText.style.display = 'none';
    spinner.style.display = 'block';
    button.disabled = true;
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // 注册成功后切换到登录表单
            setTimeout(() => {
                showForm('login');
                // 清空注册表单
                document.getElementById('registerForm').reset();
            }, 1000);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        // 恢复按钮状态
        buttonText.style.display = 'block';
        spinner.style.display = 'none';
        button.disabled = false;
    }
}

// 显示通知
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 添加输入框焦点效果
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.input-icon input');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
});
