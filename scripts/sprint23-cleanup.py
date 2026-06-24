#!/usr/bin/env python3
"""Sprint 2.3: aiteam-creator-modal.tsx localStorage cleanup"""
import sys

f = r'd:\BigLionX\NvwaX\packages\nvwax-web\components\aiteam-creator-modal.tsx'
with open(f, 'r', encoding='utf-8') as fp:
    c = fp.read()

changes = 0

# T1.1: sendMessageContent - replace localStorage + manual headers
old1 = """      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/aiteam-creation/sessions/${sessionId}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: userMessage.content }),
      });"""

new1 = """      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage.content }),
      });"""

if old1 in c:
    c = c.replace(old1, new1)
    changes += 1
    print('OK: sendMessageContent')
else:
    print('MISS: sendMessageContent')

# T1.2: triggerNvwaXMatch
old2 = """      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/aiteam-creation/sessions/${sessionId}/nvwax-match`, {
        method: 'POST',
        headers,
      });"""

new2 = """      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/nvwax-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });"""

if old2 in c:
    c = c.replace(old2, new2)
    changes += 1
    print('OK: triggerNvwaXMatch')
else:
    print('MISS: triggerNvwaXMatch')

# T1.3: handleConfirmAndSave (confirm call + publish call share same headers)
old3 = """      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Step 1: 确认并保存团队
      const response = await fetch(`${API_URL}/aiteam-creation/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers,
      });"""

new3 = """      const authedHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Step 1: 确认并保存团队（Sprint 2.3: 走 authedFetch）
      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: authedHeaders,
      });"""

if old3 in c:
    c = c.replace(old3, new3)
    changes += 1
    print('OK: handleConfirmAndSave confirm')
else:
    print('MISS: handleConfirmAndSave confirm')

# T1.3b: the publish-to-marketplace call in the same function
old3b = """          const publishResponse = await fetch(`${API_URL}/aiteam-creation/sessions/${sessionId}/publish-to-marketplace`, {
            method: 'POST',
            headers,
          });"""

new3b = """          const publishResponse = await authedFetch(`/aiteam-creation/sessions/${sessionId}/publish-to-marketplace`, {
            method: 'POST',
            headers: authedHeaders,
          });"""

if old3b in c:
    c = c.replace(old3b, new3b)
    changes += 1
    print('OK: handleConfirmAndSave publish')
else:
    print('MISS: handleConfirmAndSave publish')

# T1.4: handleDownload
old4 = """      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers,
      });"""

new4 = """      const response = await authedFetch(url, {
        method: 'GET',
      });"""

if old4 in c:
    c = c.replace(old4, new4)
    changes += 1
    print('OK: handleDownload')
else:
    print('MISS: handleDownload')

# T1.5: handleIntegrateToProClaw
old5 = """      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 调用后端 API 将团队集成到 ProClaw
      // TODO: 后端接口尚未实现，返回占位响应
      const response = await fetch(`${API_URL}/aiteam-creation/sessions/${teamSessionId}/integrate-proclaw`, {
        method: 'POST',
        headers,
      });"""

new5 = """      // Sprint 2.3: 走 authedFetch（OIDC cookie 由 /api/auth/proxy 注入 Authorization）
      const response = await authedFetch(`/aiteam-creation/sessions/${teamSessionId}/integrate-proclaw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });"""

if old5 in c:
    c = c.replace(old5, new5)
    changes += 1
    print('OK: handleIntegrateToProClaw')
else:
    print('MISS: handleIntegrateToProClaw')

with open(f, 'w', encoding='utf-8') as fp:
    fp.write(c)

print(f'\nTotal replacements: {changes}/6')
if changes < 6:
    sys.exit(1)
