from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, case
import os
import time
import re
from urllib.parse import urlparse, urljoin
from datetime import datetime
import feedparser
import threading
import requests as pyrequests
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

app = Flask(__name__)
# 基础配置改为读取环境变量，确保生产环境安全、路径一致
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')
_db_url_env = os.environ.get('DATABASE_URL')
if _db_url_env:
    app.config['SQLALCHEMY_DATABASE_URI'] = _db_url_env
else:
    abs_sqlite = os.path.abspath(os.path.join('instance', 'users.db'))
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{abs_sqlite}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.username}>'

class RSSItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(255), nullable=False)
    guid = db.Column(db.String(512), unique=True, nullable=True)
    title = db.Column(db.String(512), nullable=False)
    link = db.Column(db.String(1024), unique=True, nullable=False)
    summary = db.Column(db.Text)
    image_url = db.Column(db.String(1024))
    published_at = db.Column(db.DateTime, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    view_count = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'source': self.source,
            'guid': self.guid,
            'title': self.title,
            'link': self.link,
            'summary': self.summary,
            'image_url': self.image_url,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'view_count': self.view_count
        }

class SiteStats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    total_visits = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ArticleView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('rss_item.id'), nullable=False)
    user_ip = db.Column(db.String(45), nullable=False)  # IPv4/IPv6
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('article_id', 'user_ip'),)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('rss_item.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联关系
    user = db.relationship('User', backref=db.backref('comments', lazy=True))
    article = db.relationship('RSSItem', backref=db.backref('comments', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'article_id': self.article_id,
            'user_id': self.user_id,
            'username': self.user.username,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }

# RSS 源配置：可通过环境变量 RSS_FEED_URLS 设置，逗号分隔；默认使用少数派官方与 RSSHub（可提供更多条目）
DEFAULT_FEEDS = 'https://sspai.com/feed,https://rsshub.app/sspai/index?limit=100,https://rsshub.nodejs.cn/sspai/index?limit=100,https://rsshub.rssforever.com/sspai/index?limit=100'
FEED_URLS = [u.strip() for u in os.environ.get('RSS_FEED_URLS', DEFAULT_FEEDS).split(',') if u.strip()]
RSS_ONLY_DOMAIN = os.environ.get('RSS_ONLY_DOMAIN', '').strip()

# 抓取条数与间隔
FETCH_LIMIT = int(os.environ.get('RSS_FETCH_LIMIT', '1000'))
FETCH_INTERVAL_SECONDS = int(os.environ.get('RSS_FETCH_INTERVAL_SECONDS', '300'))  # 5分钟

def _parse_struct_time_to_datetime(struct_time_value):
    if not struct_time_value:
        return None
    try:
        timestamp = time.mktime(struct_time_value)
        return datetime.fromtimestamp(timestamp)
    except Exception:
        return None

def fetch_and_store_rss(limit: int = FETCH_LIMIT):
    """抓取 RSS 源并存储至数据库（幂等插入）。"""
    for feed_url in FEED_URLS:
        try:
            parsed = feedparser.parse(feed_url)
        except Exception:
            continue

        entries = list(getattr(parsed, 'entries', []))[:max(0, int(limit))]
        for entry in entries:
            title = getattr(entry, 'title', None) or '(无标题)'
            link = getattr(entry, 'link', None)
            summary = getattr(entry, 'summary', '')
            guid = getattr(entry, 'id', None) or getattr(entry, 'guid', None) or link
            published_dt = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published_dt = _parse_struct_time_to_datetime(entry.published_parsed)
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                published_dt = _parse_struct_time_to_datetime(entry.updated_parsed)
            if not published_dt:
                published_dt = datetime.utcnow()

            if not link:
                continue

            exists = RSSItem.query.filter(or_(RSSItem.guid == guid, RSSItem.link == link)).first()
            if exists:
                continue

            image_url = extract_image_from_entry(entry, summary)

            item = RSSItem(
                source=parsed.feed.get('title', feed_url) if hasattr(parsed, 'feed') else feed_url,
                guid=guid,
                title=title,
                link=link,
                summary=summary,
                image_url=image_url,
                published_at=published_dt
            )
            db.session.add(item)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

def _normalize_url(url_value: str, base: str = None):
    if not url_value:
        return None
    try:
        # 处理 //example.com/path
        if url_value.startswith('//'):
            return 'https:' + url_value
        # 处理相对路径
        if base and url_value.startswith('/'):
            return urljoin(base, url_value)
    except Exception:
        pass
    return url_value

def extract_image_from_entry(entry, summary_html: str = None):
    """从 RSS entry 元素中提取图片 URL（媒体标签、enclosure、summary HTML）。"""
    # 1) media:content / media:thumbnail
    for key in ('media_content', 'media_thumbnail'):
        try:
            arr = getattr(entry, key)
            if arr and isinstance(arr, list):
                for it in arr:
                    url = it.get('url') if isinstance(it, dict) else None
                    if url:
                        return url
        except Exception:
            pass
    # 2) enclosures or links with image type
    for key in ('enclosures', 'links'):
        try:
            arr = getattr(entry, key)
            if arr and isinstance(arr, list):
                for it in arr:
                    if not isinstance(it, dict):
                        continue
                    typev = it.get('type') or ''
                    href = it.get('href') or it.get('url')
                    if href and (typev.startswith('image/') or it.get('rel') == 'enclosure'):
                        return href
        except Exception:
            pass
    # 3) 从 summary 中提取 <img src>
    if summary_html:
        img_re = re.compile(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', re.IGNORECASE)
        m = img_re.search(summary_html)
        if m:
            return m.group(1)
    return None

def fetch_og_image_from_page(article_url: str, timeout_seconds: int = 4):
    """从文章页面抓取 og:image/twitter:image 作为封面图。"""
    if not article_url:
        return None
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
        }
        resp = pyrequests.get(article_url, headers=headers, timeout=timeout_seconds)
        if resp.status_code != 200 or not resp.text:
            return None
        html = resp.text
        # og:image / twitter:image
        patterns = [
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+name=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+property=["\']og:image:url["\'][^>]+content=["\']([^"\']+)["\']',
        ]
        for pat in patterns:
            m = re.search(pat, html, flags=re.IGNORECASE)
            if m:
                img = m.group(1).strip()
                return _normalize_url(img, base=article_url)
    except Exception:
        return None
    return None

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('news'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify({'success': True, 'message': '登录成功！'})
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误！'}), 401

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': '用户名已存在！'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': '邮箱已被注册！'}), 400
    
    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': '注册成功！'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

def _login_required_page():
    if 'user_id' not in session:
        return False
    return True

def _login_required_api():
    return 'user_id' in session

@app.route('/dashboard')
def dashboard():
    if not _login_required_page():
        return redirect(url_for('index'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/news')
def news():
    if not _login_required_page():
        return redirect(url_for('index'))
    return render_template('news.html', username=session['username'])

@app.route('/api/news')
def api_news():
    if not _login_required_api():
        return jsonify({'authenticated': False}), 401

    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 30))
    except ValueError:
        offset, limit = 0, 30

    # 放开域名限制；少数派优先，其次按发布时间倒序
    sspai_like = f"%sspai.com%"
    priority_expr = case(
        (RSSItem.link.like(sspai_like), 1),
        else_=0
    )
    # 进一步用 source 名称兜底提升优先级
    priority_expr = case(
        (RSSItem.source.like("%sspai%"), 1),
        else_=priority_expr
    )
    query = RSSItem.query.order_by(priority_expr.desc(), RSSItem.published_at.desc())
    # 优化：避免昂贵的 COUNT(*)，改为抓取 limit+1 判断 has_more
    rows = query.offset(offset).limit(limit + 1).all()
    has_more = len(rows) > limit
    items = rows[:limit]

    def extract_image_from_html(html_text: str):
        if not html_text:
            return None
        img_re = re.compile(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', re.IGNORECASE)
        match = img_re.search(html_text)
        return match.group(1) if match else None

    def build_unsplash_url(title_value: str, source_value: str):
        # 使用 title 或 source 作为查询关键词，退化为 'news'
        base = 'news'
        query = (title_value or source_value or base).strip() or base
        # 控制长度，避免过长
        query = query[:60]
        return f"https://source.unsplash.com/featured/160x100/?{query}"

    items_json = []
    dirty = False
    for i in items:
        d = i.to_dict()
        # 优先：内容第一张图；其次：存储的 image_url；最后：Unsplash 随机
        content_img = extract_image_from_html(i.summary)
        d['image_url'] = content_img or i.image_url
        if not d['image_url']:
            # 尝试抓取页面 og:image，并缓存回数据库
            page_img = fetch_og_image_from_page(i.link)
            if page_img:
                i.image_url = page_img
                d['image_url'] = page_img
                dirty = True
        d['thumbnail_url'] = d['image_url'] or build_unsplash_url(d.get('title'), d.get('source'))
        items_json.append(d)

    if dirty:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    return jsonify({
        'items': items_json,
        'total': None,
        'has_more': has_more
    })

@app.route('/api/user')
def get_user():
    if not _login_required_api():
        return jsonify({'authenticated': False}), 401
    
    user = User.query.get(session['user_id'])
    # 更新网站总访问量
    site_stats = SiteStats.query.first()
    if not site_stats:
        site_stats = SiteStats(total_visits=1)
        db.session.add(site_stats)
    else:
        site_stats.total_visits += 1
    db.session.commit()

    return jsonify({
        'authenticated': True,
        'username': user.username,
        'email': user.email,
        'created_at': user.created_at.isoformat(),
        'site_total_visits': site_stats.total_visits
    })

@app.route('/api/view/<int:article_id>', methods=['POST'])
def record_view(article_id):
    """记录资讯点击浏览"""
    if not _login_required_api():
        return jsonify({'success': False}), 401
    
    # 获取用户IP
    user_ip = get_client_ip(request)
    
    # 检查是否已记录过该IP
    existing_view = ArticleView.query.filter_by(
        article_id=article_id,
        user_ip=user_ip
    ).first()
    
    if not existing_view:
        # 记录新浏览
        new_view = ArticleView(article_id=article_id, user_ip=user_ip)
        db.session.add(new_view)
        
        # 更新资讯浏览计数
        article = RSSItem.query.get(article_id)
        if article:
            article.view_count += 1
        
        db.session.commit()
    
    # 返回最新浏览数
    article = RSSItem.query.get(article_id)
    return jsonify({
        'success': True,
        'view_count': article.view_count if article else 0
    })

@app.route('/article/<int:article_id>')
def article_detail(article_id):
    """资讯详情页"""
    if not _login_required_page():
        return redirect(url_for('index'))
    
    article = RSSItem.query.get_or_404(article_id)
    
    # 记录浏览
    user_ip = get_client_ip(request)
    
    existing_view = ArticleView.query.filter_by(
        article_id=article_id,
        user_ip=user_ip
    ).first()
    
    if not existing_view:
        new_view = ArticleView(article_id=article_id, user_ip=user_ip)
        db.session.add(new_view)
        article.view_count += 1
        db.session.commit()
    
    return render_template('article_detail.html', 
                         article=article, 
                         username=session.get('username'))

@app.route('/api/comments/<int:article_id>')
def get_comments(article_id):
    """获取文章的评论列表"""
    if not _login_required_api():
        return jsonify({'authenticated': False}), 401
    
    comments = Comment.query.filter_by(article_id=article_id)\
                           .order_by(Comment.created_at.desc())\
                           .all()
    
    return jsonify({
        'comments': [comment.to_dict() for comment in comments]
    })

@app.route('/api/comments/<int:article_id>', methods=['POST'])
def add_comment(article_id):
    """发表评论"""
    if not _login_required_api():
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    data = request.get_json()
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'success': False, 'message': '评论内容不能为空'}), 400
    
    if len(content) > 1000:
        return jsonify({'success': False, 'message': '评论内容过长'}), 400
    
    comment = Comment(
        article_id=article_id,
        user_id=session['user_id'],
        content=content
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'comment': comment.to_dict()
    })

if __name__ == '__main__':
    with app.app_context():
        # 确保 instance 目录存在（SQLite 默认路径）
        try:
            os.makedirs('instance', exist_ok=True)
        except Exception:
            pass
        db.create_all()
        # 尝试为旧表添加 image_url 和 view_count 字段（SQLite）
        try:
            table_name = RSSItem.__table__.name
            with db.engine.begin() as conn:
                cols = [r[1] for r in conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()]
                if 'image_url' not in cols:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN image_url VARCHAR(1024)")
                if 'view_count' not in cols:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN view_count INTEGER DEFAULT 0")
        except Exception:
            pass
        # 可通过环境变量关闭抓取器（如本地开发/测试）
        if os.environ.get('DISABLE_FETCHER', '').lower() not in ('1', 'true', 'yes'):
            # 启动前先抓取一次
            try:
                fetch_and_store_rss(FETCH_LIMIT)
            except Exception:
                pass
            # 启动后台抓取线程（每5分钟一次）
            def background_fetch_loop():
                while True:
                    try:
                        fetch_and_store_rss(FETCH_LIMIT)
                    except Exception:
                        pass
                    time.sleep(FETCH_INTERVAL_SECONDS)

            t = threading.Thread(target=background_fetch_loop, daemon=True)
            t.start()
    # 禁用调试与重载以便后台运行稳定
    port = int(os.environ.get('PORT', '8088'))
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=port)

# 通用小工具
def get_client_ip(req):
    ip = req.environ.get('HTTP_X_FORWARDED_FOR', req.remote_addr) or ''
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    return ip
