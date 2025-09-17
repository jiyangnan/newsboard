import os
from typing import Optional

try:
    from supabase import create_client, Client
except Exception:  # 可选依赖
    create_client = None
    Client = None  # type: ignore

# Supabase 配置改为读取环境变量，避免在仓库中硬编码密钥
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

def get_supabase_client() -> Optional["Client"]:
    if not create_client or not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        return None
