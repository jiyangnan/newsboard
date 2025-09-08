from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import time
import re
import feedparser
import threading
from supabase import create_client, Client

# 直接设置配置
SUPABASE_URL = "https://xbvxwsjkgnuukbmlkenf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhidnh3c2prZ251dWtibWxrZW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDY3NTcsImV4cCI6MjA3MjkyMjc1N30.PR0psWgdeJSryGM85-aVDtYm4WLsIOwpMJ6hPsoHzE0"

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# 创建Supabase客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

@app.route('/article/<int:article_id>')
def article_detail(article_id):
    """资讯详情页 - 修复版本"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    try:
        # 获取文章信息
        article_response = supabase.table('rss_item').select('*').eq('id', article_id).execute()
        if not article_response.data:
            return "文章不存在", 404
        
        article = article_response.data[0]
        
        # 记录浏览 - 暂时跳过，避免数据库约束错误
        try:
            # 仅更新浏览计数，不记录详细浏览
            new_count = article['view_count'] + 1
            supabase.table('rss_item').update({'view_count': new_count}).eq('id', article_id).execute()
            article['view_count'] = new_count
        except Exception as e:
            print(f"浏览计数更新失败: {e}")
        
        return render_template('article_detail.html', 
                             article=article, 
                             username=session.get('username'))
    except Exception as e:
        print(f"文章详情页错误: {e}")
        return "加载文章时出错，请稍后重试", 500

@app.route('/api/comments/<int:article_id>')
def get_comments(article_id):
    """获取文章的评论列表 - 修复版本"""
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    
    try:
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
                'username': comment['user']['username'] if 'user' in comment else '未知用户',
                'content': comment['content'],
                'created_at': comment['created_at']
            })
        
        return jsonify({'comments': comments_data})
    except Exception as e:
        print(f"获取评论失败: {e}")
        return jsonify({'comments': []})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8088)