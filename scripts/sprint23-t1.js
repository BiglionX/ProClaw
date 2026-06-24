// Sprint 2.3: aiteam-creator-modal.tsx localStorage cleanup
const fs = require('fs');

const f = String.raw`d:\BigLionX\NvwaX\packages\nvwax-web\components\aiteam-creator-modal.tsx`;
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// T1.1: sendMessageContent
const old1 = `      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      
      const response = await fetch(\`\${API_URL}/aiteam-creation/sessions/\${sessionId}/message\`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: userMessage.content }),
      });`;

const new1 = `      const response = await authedFetch(\`/aiteam-creation/sessions/\${sessionId}/message\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage.content }),
      });`;

if (c.includes(old1)) { c = c.replace(old1, new1); changes++; console.log('OK: sendMessageContent'); }
else console.log('MISS: sendMessageContent');

// T1.2: triggerNvwaXMatch
const old2 = `      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      
      const response = await fetch(\`\${API_URL}/aiteam-creation/sessions/\${sessionId}/nvwax-match\`, {
        method: 'POST',
        headers,
      });`;

const new2 = `      const response = await authedFetch(\`/aiteam-creation/sessions/\${sessionId}/nvwax-match\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });`;

if (c.includes(old2)) { c = c.replace(old2, new2); changes++; console.log('OK: triggerNvwaXMatch'); }
else console.log('MISS: triggerNvwaXMatch');

// T1.3: handleConfirmAndSave - confirm call
const old3 = `      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      
      // Step 1: 确认并保存团队
      const response = await fetch(\`\${API_URL}/aiteam-creation/sessions/\${sessionId}/confirm\`, {
        method: 'POST',
        headers,
      });`;

const new3 = `      const authedHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Step 1: 确认并保存团队（Sprint 2.3: 走 authedFetch）
      const response = await authedFetch(\`/aiteam-creation/sessions/\${sessionId}/confirm\`, {
        method: 'POST',
        headers: authedHeaders,
      });`;

if (c.includes(old3)) { c = c.replace(old3, new3); changes++; console.log('OK: handleConfirmAndSave confirm'); }
else console.log('MISS: handleConfirmAndSave confirm');

// T1.3b: publish-to-marketplace call
const old3b = `          const publishResponse = await fetch(\`\${API_URL}/aiteam-creation/sessions/\${sessionId}/publish-to-marketplace\`, {
            method: 'POST',
            headers,
          });`;

const new3b = `          const publishResponse = await authedFetch(\`/aiteam-creation/sessions/\${sessionId}/publish-to-marketplace\`, {
            method: 'POST',
            headers: authedHeaders,
          });`;

if (c.includes(old3b)) { c = c.replace(old3b, new3b); changes++; console.log('OK: handleConfirmAndSave publish'); }
else console.log('MISS: handleConfirmAndSave publish');

// T1.4: handleDownload
const old4 = `      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      
      const response = await fetch(\`\${API_URL}\${url}\`, {
        method: 'GET',
        headers,
      });`;

const new4 = `      const response = await authedFetch(url, {
        method: 'GET',
      });`;

if (c.includes(old4)) { c = c.replace(old4, new4); changes++; console.log('OK: handleDownload'); }
else console.log('MISS: handleDownload');

// T1.5: handleIntegrateToProClaw
const old5 = `      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      
      // 调用后端 API 将团队集成到 ProClaw
      // TODO: 后端接口尚未实现，返回占位响应
      const response = await fetch(\`\${API_URL}/aiteam-creation/sessions/\${teamSessionId}/integrate-proclaw\`, {
        method: 'POST',
        headers,
      });`;

const new5 = `      // Sprint 2.3: 走 authedFetch（OIDC cookie 由 /api/auth/proxy 注入 Authorization）
      const response = await authedFetch(\`/aiteam-creation/sessions/\${teamSessionId}/integrate-proclaw\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });`;

if (c.includes(old5)) { c = c.replace(old5, new5); changes++; console.log('OK: handleIntegrateToProClaw'); }
else console.log('MISS: handleIntegrateToProClaw');

fs.writeFileSync(f, c, 'utf8');
console.log(`\nTotal replacements: ${changes}/6`);
process.exit(changes < 6 ? 1 : 0);
