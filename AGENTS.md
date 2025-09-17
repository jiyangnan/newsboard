# 项目说明（AGENTS）

## 1. 项目概述
新闻聚合面板（Newsboard）是一个基于 Flask 构建的轻量级 RSS 聚合与内容浏览平台。后端负责：
- 定时抓取多个 RSS 源，去重后存入 SQLite（或通过 `DATABASE_URL` 使用外部数据库）。
- 提供用户注册、登录、评论、浏览统计等接口。
- 渲染登录页、资讯列表、仪表盘、资讯详情等页面。
前端采用 Jinja 模板配合 `static/js` 的脚本完成登录表单提交、资讯列表渲染、详情页评论交互等逻辑。

## 2. 安装、环境变量与运行命令
### 2.1 环境准备
- Python ≥ 3.11
- 建议使用虚拟环境（`python3 -m venv .venv && source .venv/bin/activate`）
- （可选）SQLite 随 Python 自带；若使用 Postgres，需保证 `psycopg2-binary` 可用

### 2.2 安装依赖
```bash
pip install -r requirements.txt
```

### 2.3 环境变量
所有环境变量可写入 `.env` 方便开发：

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `SECRET_KEY` | Flask 会话签名密钥，生产环境务必自定义 | `dev-secret` |
| `DATABASE_URL` | SQLAlchemy 连接串（留空则使用 `instance/users.db` SQLite） | 空 |
| `RSS_FEED_URLS` | 以逗号分隔的 RSS 源列表 | 少数派、掘金、腾讯新闻示例源 |
| `RSS_FETCH_LIMIT` | 单次抓取最多条数 | `1000` |
| `RSS_FETCH_INTERVAL_SECONDS` | 后台抓取间隔（秒） | `60` |
| `RSS_ONLY_DOMAIN` | 预留的域名过滤（当前未启用） | 空 |
| `DISABLE_FETCHER` | 设为 `1/true` 可禁用后台抓取线程（本地调试时使用） | 空 |
| `PORT` | Flask 服务监听端口 | `8088` |

### 2.4 运行与构建命令
- 开发模式：`python3 app.py`（默认监听 `http://127.0.0.1:8088`）。
- 生产部署示例：`gunicorn app:app -b 0.0.0.0:8088`。
- 运行前会自动创建 `instance/` 目录与 SQLite 数据库，并在未禁用抓取器时启动后台线程。

### 2.5 测试
启动服务后可在另一个终端运行：
```bash
python3 test_system.py
```
该脚本包含注册/登录/资讯页的基础 HTTP 冒烟测试。

## 3. 目录结构、页面路由与 API 接口
### 3.1 核心目录结构
```
├── app.py                # Flask 应用主入口、模型、路由、RSS 抓取线程
├── config.py             # 备用配置示例
├── templates/            # Jinja 模板（login、news、dashboard、article_detail）
├── static/
│   ├── css/              # 前端样式
│   └── js/               # 前端交互脚本（auth、news、article、navbar）
├── requirements.txt      # Python 依赖清单
├── test_system.py        # 冒烟测试脚本
├── instance/             # 运行期生成的 SQLite 数据库与配置（gitignore）
├── SUPABASE_MIGRATION_GUIDE.md / supabase_schema.sql
│                         # 使用 Supabase 时的参考文档（可选）
└── 其他调试日志文件      # `app.log`、`server.log` 等运行时输出
```

### 3.2 页面路由（返回 HTML）
- `GET /`：登录页，已登录用户会跳转 `/news`。
- `GET /dashboard`：仪表盘，需登录。
- `GET /news`：资讯列表页，需登录。
- `GET /article/<int:article_id>`：资讯详情页，记录一次浏览。
- `GET /logout`：清除会话后返回登录页。

### 3.3 API 接口
- `POST /login`：传入 `username`、`password`，验证成功后写入会话。
- `POST /register`：注册用户，需 `username`、`email`、`password`。
- `GET /api/news`：分页获取资讯（查询参数 `offset`、`limit`），带有推荐优先级与缩略图。
- `GET /api/user`：返回当前登录用户信息并累加站点访问量。
- `POST /api/view/<article_id>`：记录文章浏览次数（按用户 IP 去重）。
- `GET /api/comments/<article_id>`：获取指定文章的评论树结构。
- `POST /api/comments/<article_id>`：发表评论或回复，字段 `content`、可选 `parent_id`。
所有 `/api/*` 接口均要求已登录会话，未登录返回 401。

## 4. 关键技术栈与依赖说明
- **Flask 2.3**：Web 框架，提供路由、会话管理与模板渲染。
- **Flask-SQLAlchemy**：ORM 与数据库抽象层，默认使用 SQLite，可扩展至 Postgres。
- **Werkzeug**：提供密码哈希（`generate_password_hash`/`check_password_hash`）与基础 WSGI 支持。
- **Feedparser**：解析 RSS/Atom 源并提取文章数据。
- **Requests**：在缺少图像时抓取文章页的 `og:image` 元数据。
- **python-dotenv**：本地开发加载 `.env` 文件中的环境变量。
- **psycopg2-binary**：可选，用于连接 Postgres（Supabase 等部署场景）。
- 前端资源使用原生 JavaScript 与 CSS，实现登录、资讯列表滚动加载、评论交互等功能。

如需扩展 Supabase，请参考仓库中的 `SUPABASE_MIGRATION_GUIDE.md` 与 `supabase_schema.sql`。
