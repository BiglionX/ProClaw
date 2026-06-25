# ProClips Skill API Mock

Lightweight Express mock server implementing core ProClips Skill APIs for local testing.

Run:

```powershell
cd ProClips-APP\backend-mock
npm install
npm start
```

Available endpoints:

- `GET /api/proclips/templates` — list templates
- `POST /api/proclips/upload-scene` — multipart upload (field: `file`)
- `POST /api/proclips/record-voice` — multipart upload (field: `file`)
- `POST /api/proclips/mix/submit` — submit mix task
- `GET /api/proclips/mix/status/{taskId}` — poll status
