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
    """资讯详情页 - 最简化版本"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    try:
        # 获取文章信息
        article_response = supabase.table('rss_item').select('*').eq('id', article_id).execute()
        if not article_response.data:
            return "文章不存在", 404
        
        article = article_response.data[0]
        
        # 简单返回文章详情页
        return render_template('article_detail.html', 
                             article=article, 
                             username=session.get('username'))
    except Exception as e:
        print(f"文章详情页错误: {e}")
        return f"文章加载失败: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8088)