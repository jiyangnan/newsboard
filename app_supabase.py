from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import time
import re
import feedparser
import threading
import requests as pyrequests
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Supabase配置
SUPABASE_URL = "https://xbvxwsjkgnuukbmlkenf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhidnh3c2prZ251dWtibWxrZW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDY3NTcsImV4cCI6MjA3MjkyMjc1N30.PR0psWgdeJSryGM85-aVDtYm4WLsIOwpMJ6hPsoHzE0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# RSS 源配置
DEFAULT_FEEDS = 'https://sspai.com/feed,https://rsshub.app/sspai/index?limit=100,https://rsshub.nodejs.cn/sspai/index?limit=100,https://rsshub.rssforever.com/sspai/index?limit=100'
FEED_URLS = [u.strip() for u in os.environ.get('RSS_FEED_URLS', DEFAULT_FEEDS).split(',') if u.strip()]

# 抓取条数与间隔
FETCH_LIMIT = int(os.environ.get('RSS_FETCH_LIMIT', '1000'))
FETCH_INTERVAL_SECONDS = int(os.environ.get('RSS_FETCH_INTERVAL_SECONDS', '300'))

def _parse_struct_time_to_datetime(struct_time_value):
    if not struct_time_value:
        return None
    try:
        timestamp = time.mktime(struct_time_value)
        return datetime.fromtimestamp(timestamp)
    except Exception:
        return None

def fetch_and_store_rss(limit: int = FETCH_LIMIT):
    """抓取 RSS 源并存储至 Supabase 数据库"""
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

            # 检查是否已存在
            existing = supabase.table('rss_item').select('id').eq('link', link).execute()
            if existing.data:
                continue

            def extract_image_from_entry(e):
                # 1) media:content / media:thumbnail
                for key in ('media_content', 'media_thumbnail'):
                    try:
                        arr = getattr(e, key)
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
                        arr = getattr(e, key)
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
                if summary:
                    img_re = re.compile(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', re.IGNORECASE)
                    m = img_re.search(summary)
                    if m:
                        return m.group(1)
                return None

            image_url = extract_image_from_entry(entry)

            # 插入新文章
            article_data = {
                'source': parsed.feed.get('title', feed_url) if hasattr(parsed, 'feed') else feed_url,
                'guid': guid,
                'title': title,
                'link': link,
                'summary': summary,
                'image_url': image_url,
                'published_at': published_dt.isoformat(),
                'created_at': datetime.utcnow().isoformat(),
                'view_count': 0
            }
            
            try:
                supabase.table('rss_item').insert(article_data).execute()
            except Exception as e:
                print(f"插入文章失败: {e}")

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
    
    # 从Supabase查询用户
    response = supabase.table('user').select('*').eq('username', username).execute()
    
    if response.data and check_password_hash(response.data[0]['password_hash'], password):
        user = response.data[0]
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'success': True, 'message': '登录成功！'})
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误！'}), 401

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # 检查用户名是否已存在
    existing_user = supabase.table('user').select('id').eq('username', username).execute()
    if existing_user.data:
        return jsonify({'success': False, 'message': '用户名已存在！'}), 400
    
    # 检查邮箱是否已存在
    existing_email = supabase.table('user').select('id').eq('email', email).execute()
    if existing_email.data:
        return jsonify({'success': False, 'message': '邮箱已被注册！'}), 400
    
    # 创建新用户
    user_data = {
        'username': username,
        'email': email,
        'password_hash': generate_password_hash(password),
        'created_at': datetime.utcnow().isoformat()
    }
    
    try:
        response = supabase.table('user').insert(user_data).execute()
        return jsonify({'success': True, 'message': '注册成功！'})
    except Exception as e:
        return jsonify({'success': False, 'message': '注册失败，请重试'}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/news')
def news():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('news.html', username=session['username'])

@app.route('/api/news')
def api_news():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401

    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 30))
    except ValueError:
        offset, limit = 0, 30

    # 从Supabase获取新闻
    response = supabase.table('rss_item')\
        .select('*')\
        .order('published_at', desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    items = response.data or []
    
    # 获取总数
    count_response = supabase.table('rss_item').select('id', count='exact').execute()
    total = count_response.count or 0

    def extract_image_from_html(html_text: str):
        if not html_text:
            return None
        img_re = re.compile(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', re.IGNORECASE)
        match = img_re.search(html_text)
        return match.group(1) if match else None

    def build_unsplash_url(title_value: str, source_value: str):
        base = 'news'
        query = (title_value or source_value or base).strip() or base
        query = query[:60]
        return f"https://source.unsplash.com/featured/160x100/?{query}"

    items_json = []
    for item in items:
        d = {
            'id': item['id'],
            'source': item['source'],
            'guid': item['guid'],
            'title': item['title'],
            'link': item['link'],
            'summary': item['summary'],
            'image_url': item['image_url'],
            'published_at': item['published_at'],
            'view_count': item['view_count'],
            'created_at': item['created_at']
        }
        
        # 优先：内容第一张图；其次：存储的 image_url；最后：Unsplash 随机
        content_img = extract_image_from_html(item['summary'])
        d['image_url'] = content_img or item['image_url']
        if not d['image_url']:
            # 尝试抓取页面 og:image
            page_img = fetch_og_image_from_page(item['link'])
            if page_img:
                # 更新数据库中的图片URL
                supabase.table('rss_item').update({'image_url': page_img}).eq('id', item['id']).execute()
                d['image_url'] = page_img
        
        d['thumbnail_url'] = d['image_url'] or build_unsplash_url(d.get('title'), d.get('source'))
        items_json.append(d)

    return jsonify({
        'items': items_json,
        'total': total,
        'has_more': (offset + len(items)) < total
    })

@app.route('/api/user')
def get_user():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    
    # 获取用户信息
    user_response = supabase.table('user').select('*').eq('id', session['user_id']).execute()
    if not user_response.data:
        return jsonify({'authenticated': False}), 401
    
    user = user_response.data[0]
    
    # 更新网站总访问量
    stats_response = supabase.table('site_stat').select('*').execute()
    if not stats_response.data:
        supabase.table('site_stat').insert({'total_visits': 1}).execute()
        total_visits = 1
    else:
        current_visits = stats_response.data[0]['total_visits'] or 0
        supabase.table('site_stat').update({'total_visits': current_visits + 1}).execute()
        total_visits = current_visits + 1

    return jsonify({
        'authenticated': True,
        'username': user['username'],
        'email': user['email'],
        'created_at': user['created_at'],
        'site_total_visits': total_visits
    })

@app.route('/api/view/<int:article_id>', methods=['POST'])
def record_view(article_id):
    """记录资讯点击浏览"""
    if 'user_id' not in session:
        return jsonify({'success': False}), 401
    
    # 获取用户IP
    user_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    if ',' in user_ip:
        user_ip = user_ip.split(',')[0].strip()
    
    # 检查是否已记录过该IP
    existing_view = supabase.table('article_view')\
        .select('id')\
        .eq('article_id', article_id)\
        .eq('user_ip', user_ip)\
        .execute()
    
    if not existing_view.data:
        # 记录新浏览
        view_data = {
            'article_id': article_id,
            'user_ip': user_ip,
            'viewed_at': datetime.utcnow().isoformat()
        }
        try:
            supabase.table('article_view').insert(view_data).execute()
            
            # 更新资讯浏览计数
            article = supabase.table('rss_item').select('view_count').eq('id', article_id).execute()
            if article.data:
                new_count = (article.data[0]['view_count'] or 0) + 1
                supabase.table('rss_item').update({'view_count': new_count}).eq('id', article_id).execute()
        except Exception as e:
            print(f"浏览记录或计数更新失败: {e}")
    
    # 返回最新浏览数
    article = supabase.table('rss_item').select('view_count').eq('id', article_id).execute()
    view_count = article.data[0]['view_count'] if article.data else 0
    
    return jsonify({
        'success': True,
        'view_count': view_count
    })

@app.route('/article/<int:article_id>')
def article_detail(article_id):
    """资讯详情页"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    # 获取文章信息
    article_response = supabase.table('rss_item').select('*').eq('id', article_id).execute()
    if not article_response.data:
        return "文章不存在", 404
    
    article = article_response.data[0]
    
    # 记录浏览
    user_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    if ',' in user_ip:
        user_ip = user_ip.split(',')[0].strip()
    
    existing_view = supabase.table('article_view')\
        .select('id')\
        .eq('article_id', article_id)\
        .eq('user_ip', user_ip)\
        .execute()
    
    if not existing_view.data:
        view_data = {
            'article_id': article_id,
            'user_ip': user_ip,
            'viewed_at': datetime.utcnow().isoformat()
        }
        try:
            supabase.table('article_view').insert(view_data).execute()
            
            # 更新浏览计数
            new_count = article['view_count'] + 1
            supabase.table('rss_item').update({'view_count': new_count}).eq('id', article_id).execute()
            article['view_count'] = new_count
        except Exception as e:
            # 忽略浏览记录和计数更新错误，不影响页面显示
            print(f"浏览记录或计数更新失败: {e}")
    
    return render_template('article_detail.html', 
                         article=article, 
                         username=session.get('username'))

@app.route('/api/comments/<int:article_id>')
def get_comments(article_id):
    """获取文章的评论列表"""
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    
    comments = supabase.table('comment')\
        .select('*, user(username)')\
        .eq('article_id', article_id)\
        .order('created_at', desc=True)\
        .execute()
    
    comments_data = []
    for comment in comments.data or []:
        comments_data.append({
            'id': comment['id'],
            'article_id': comment['article_id'],
            'user_id': comment['user_id'],
            'username': comment['user']['username'],
            'content': comment['content'],
            'created_at': comment['created_at']
        })
    
    return jsonify({'comments': comments_data})

@app.route('/api/comments/<int:article_id>', methods=['POST'])
def add_comment(article_id):
    """发表评论"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    data = request.get_json()
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'success': False, 'message': '评论内容不能为空'}), 400
    
    if len(content) > 1000:
        return jsonify({'success': False, 'message': '评论内容过长'}), 400
    
    comment_data = {
        'article_id': article_id,
        'user_id': session['user_id'],
        'content': content,
        'created_at': datetime.utcnow().isoformat()
    }
    
    try:
        response = supabase.table('comment').insert(comment_data).execute()
        
        # 获取用户名
        user_response = supabase.table('user').select('username').eq('id', session['user_id']).execute()
        username = user_response.data[0]['username'] if user_response.data else '未知用户'
        
        comment_data['username'] = username
        
        return jsonify({
            'success': True,
            'comment': comment_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': '评论失败，请重试'}), 500

if __name__ == '__main__':
    # 启动前先抓取一次
    try:
        fetch_and_store_rss(FETCH_LIMIT)
    except Exception as e:
        print(f"初始抓取失败: {e}")
    
    # 启动后台抓取线程
    def background_fetch_loop():
        while True:
            try:
                fetch_and_store_rss(FETCH_LIMIT)
            except Exception as e:
                print(f"后台抓取失败: {e}")
            time.sleep(FETCH_INTERVAL_SECONDS)

    t = threading.Thread(target=background_fetch_loop, daemon=True)
    t.start()
    
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=8088)