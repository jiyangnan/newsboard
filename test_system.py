#!/usr/bin/env python3
"""
登录系统测试脚本
用于验证系统的基本功能
"""

import requests
import json
import time

BASE_URL = "http://localhost:8088"

def test_homepage():
    """测试主页访问"""
    print("🔍 测试主页访问...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ 主页访问成功")
            return True
        else:
            print(f"❌ 主页访问失败: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 无法连接到服务器: {e}")
        return False

def test_register():
    """测试用户注册"""
    print("\n🔍 测试用户注册...")
    
    test_user = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/register",
            json=test_user,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ 用户注册成功")
                return True
            else:
                print(f"❌ 注册失败: {data.get('message')}")
                return False
        else:
            print(f"❌ 注册请求失败: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 注册请求异常: {e}")
        return False

def test_login():
    """测试用户登录"""
    print("\n🔍 测试用户登录...")
    
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ 用户登录成功")
                return True
            else:
                print(f"❌ 登录失败: {data.get('message')}")
                return False
        else:
            print(f"❌ 登录请求失败: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 登录请求异常: {e}")
        return False

def test_dashboard_access():
    """测试仪表板访问"""
    print("\n🔍 测试仪表板访问...")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard")
        if response.status_code == 200:
            print("✅ 仪表板访问成功")
            return True
        elif response.status_code == 302:
            print("✅ 仪表板重定向到登录页面（符合预期）")
            return True
        else:
            print(f"❌ 仪表板访问失败: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 仪表板访问异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试登录系统...")
    print("=" * 50)
    
    tests = [
        test_homepage,
        test_register,
        test_login,
        test_dashboard_access
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(1)  # 避免请求过快
    
    print("\n" + "=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！系统运行正常")
    else:
        print("⚠️  部分测试失败，请检查系统")
    
    print(f"\n🌐 系统地址: {BASE_URL}")
    print("💡 提示: 在浏览器中访问上述地址来测试用户界面")

if __name__ == "__main__":
    main()
