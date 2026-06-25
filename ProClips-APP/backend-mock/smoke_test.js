const fs = require('fs');
const http = require('http');
const { URL } = require('url');

function request(urlString, method = 'GET', headers = {}, body = null) {
  const urlObj = new URL(urlString);
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname + urlObj.search,
    method,
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function jsonPost(path, payload) {
  const body = JSON.stringify(payload);
  return request(`http://localhost:4000${path}`, 'POST', {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }, body);
}

async function multipartPost(path, fieldName, filename, fileBuffer) {
  const boundary = '----NodeFormBoundary' + Math.random().toString(36).slice(2);
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileBuffer, footer]);

  return request(`http://localhost:4000${path}`, 'POST', {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  }, body);
}

async function putBinary(uploadUrl, fileBuffer) {
  return request(uploadUrl, 'PUT', {
    'Content-Type': 'application/octet-stream',
    'Content-Length': fileBuffer.length,
  }, fileBuffer);
}

(async () => {
  try {
    const videoPath = 'tmp_video.mp4';
    const audioPath = 'tmp_audio.wav';

    if (!fs.existsSync(videoPath)) {
      fs.writeFileSync(videoPath, 'dummy video content');
      console.log(`Created ${videoPath}`);
    }
    if (!fs.existsSync(audioPath)) {
      fs.writeFileSync(audioPath, 'dummy audio content');
      console.log(`Created ${audioPath}`);
    }

    console.log('Requesting generate-upload-url...');
    const generateResp = await jsonPost('/api/proclips/generate-upload-url', {
      template_id: 'tpl_1',
      scene_index: 0,
      fileName: 'tmp_video.mp4',
    });
    const generateData = JSON.parse(generateResp.body);
    console.log('Generated upload URL:', generateData.uploadUrl);

    console.log('Uploading scene file via PUT...');
    const videoBuffer = fs.readFileSync(videoPath);
    await putBinary(generateData.uploadUrl, videoBuffer);
    console.log('Upload complete');

    console.log('Confirming scene upload...');
    const confirmResp = await jsonPost('/api/proclips/confirm-scene-upload', {
      template_id: 'tpl_1',
      scene_index: 0,
      key: generateData.key,
    });
    console.log('Confirm response:', confirmResp.body);

    console.log('Uploading voice sample...');
    const audioBuffer = fs.readFileSync(audioPath);
    const voiceResp = await multipartPost('/api/proclips/record-voice', 'file', 'tmp_audio.wav', audioBuffer);
    const voiceData = JSON.parse(voiceResp.body);
    console.log('Voice upload response:', voiceData);

    console.log('Submitting mix task...');
    const submitResp = await jsonPost('/api/proclips/mix/submit', {
      template_id: 'tpl_1',
      product_name: '测试商品',
      product_features: '好用',
      product_price: '¥99',
      script: '测试文案',
      voice_sample_uri: voiceData.remoteUrl,
      scene_uploads: [{ sceneIndex: 0, remoteUrl: generateData.uploadUrl }],
    });
    const submitData = JSON.parse(submitResp.body);
    console.log('Submit response:', submitData);

    const taskId = submitData.taskId;
    console.log('Polling task status for', taskId);

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResp = await request(`http://localhost:4000/api/proclips/mix/status/${taskId}`, 'GET', {});
      const statusData = JSON.parse(statusResp.body);
      console.log(`Poll ${i}:`, statusData);
      if (statusData.status === 'completed') {
        console.log('Task completed:', statusData);
        process.exit(0);
      }
    }

    console.error('Task did not complete within 10 attempts');
    process.exit(1);
  } catch (error) {
    console.error('Smoke test failed:', error.message);
    process.exit(1);
  }
})();
