# NewsBoard - 极简RSS新闻聚合系统

一个现代化的RSS新闻聚合系统，采用极简设计，提供优雅的阅读体验。

## ✨ 特性

- 🎨 **极简设计**: 现代极简美学，专注内容
- 📱 **响应式**: 完美适配移动端
- 🔐 **用户认证**: 完整的注册/登录系统
- 💬 **评论系统**: 文章详情页评论功能
- 📰 **RSS聚合**: 自动抓取新闻源
- ⚡ **实时更新**: 后台定时抓取

## 🚀 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 运行项目
```bash
python3 app.py
```

访问 http://127.0.0.1:8088

### 测试账号
- 用户名: demo
- 密码: demo123

## 📁 项目结构

```
├── app.py                 # 主应用文件
├── templates/            # HTML模板
│   ├── login.html       # 登录页面
│   ├── news.html        # 新闻列表
│   └── article_detail.html # 详情页
├── static/              # 静态资源
│   ├── css/
│   │   └── minimal.css  # 极简设计
│   └── js/              # 前端逻辑
├── instance/
│   └── users.db        # 数据库
├── requirements.txt     # 依赖列表
└── 2025-09-05_conclude.md # 项目总结
```

## 🛠️ 技术栈

- **后端**: Python Flask + SQLAlchemy
- **数据库**: SQLite
- **前端**: HTML5 + CSS3 + JavaScript
- **设计**: 极简现代风格

## 🔧 配置

### RSS源配置
在环境变量中设置：
```bash
export RSS_FEED_URLS="https://sspai.com/feed,https://rsshub.app/sspai/index?limit=100"
```

### 运行参数
- 端口: 8088
- 抓取间隔: 5分钟
- 每次抓取: 1000条

## 📊 数据模型

- **User**: 用户表
- **RSSItem**: 新闻文章
- **Comment**: 用户评论
- **ArticleView**: 浏览记录

## 🎨 设计亮点

- **极简美学**: 纯净白色背景，精致排版
- **iOS风格**: 蓝色强调色，圆角设计
- **响应式**: 完美适配所有设备
- **流畅动画**: 微妙的过渡效果

## 🚀 部署

### 开发环境
```bash
python3 app.py
```

### 生产环境
建议使用Gunicorn:
```bash
gunicorn app:app -b 0.0.0.0:8088
```

## 📄 许可证

MIT License - 详见LICENSE文件

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 联系

如有问题，请通过GitHub Issues联系。