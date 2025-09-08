-- Supabase数据库表结构
-- 请在Supabase SQL编辑器中运行此脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建RSS文章表
CREATE TABLE IF NOT EXISTS rss_items (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    guid VARCHAR(512) UNIQUE,
    title VARCHAR(512) NOT NULL,
    link VARCHAR(1024) UNIQUE NOT NULL,
    summary TEXT,
    image_url VARCHAR(1024),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0
);

-- 创建网站统计表
CREATE TABLE IF NOT EXISTS site_stats (
    id SERIAL PRIMARY KEY,
    total_visits INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建文章浏览记录表
CREATE TABLE IF NOT EXISTS article_views (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES rss_items(id) ON DELETE CASCADE,
    user_ip VARCHAR(45) NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_ip)
);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES rss_items(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rss_items_published_at ON rss_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_items_link ON rss_items(link);
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- 插入初始网站统计数据
INSERT INTO site_stats (total_visits) VALUES (0) ON CONFLICT DO NOTHING;

-- 启用行级安全策略（RLS）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取RSS文章
CREATE POLICY "允许所有用户读取RSS文章" ON rss_items FOR SELECT USING (true);

-- 创建策略：允许所有用户读取评论
CREATE POLICY "允许所有用户读取评论" ON comments FOR SELECT USING (true);

-- 创建策略：用户只能修改自己的数据
CREATE POLICY "用户只能修改自己的数据" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "用户只能删除自己的数据" ON users FOR DELETE USING (auth.uid() = id);

-- 创建策略：用户只能创建和修改自己的评论
CREATE POLICY "用户只能创建自己的评论" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户只能修改自己的评论" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户只能删除自己的评论" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 创建策略：允许所有用户创建浏览记录
CREATE POLICY "允许创建浏览记录" ON article_views FOR INSERT WITH CHECK (true);