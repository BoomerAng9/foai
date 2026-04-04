# Kie.AI — Seedance 2.0 Video Generation

## Overview
Kie.AI provides Bytedance's Seedance 2.0 video generation model via API.

## Base URL
```
https://api.kie.ai
```

## Authentication
```
Authorization: Bearer YOUR_API_KEY
```
Get key at: https://kie.ai/api-key

## Models
- `bytedance/seedance-2` — Standard quality, higher fidelity
- `bytedance/seedance-2-fast` — Faster generation, slightly lower quality

## Endpoints

### Generate Video
```
POST /api/v1/jobs/createTask
```

### Check Task Status
```
GET /api/v1/jobs/getTaskDetail?taskId={taskId}
```

### Check Credits
```
GET /api/v1/chat/credit
```

### Get Download URL (valid 20 min)
```
POST /api/v1/common/download-url
Body: { "url": "https://tempfile..." }
```

## Capabilities
- Text-to-Video: prompt only, no images needed
- Image-to-Video: 0-2 input frames (first + last)
- Multimodal Reference: up to 9 reference images, 3 videos, 3 audio clips
- Dynamic Camera: advanced movement with lens locking
- Audio Generation: optional, increases cost
- Resolution: 480p or 720p
- Duration: 4-15 seconds
- Aspect Ratios: 1:1, 4:3, 3:4, 16:9, 9:16, 21:9, adaptive

## Our Integration
- Client library: `cti-hub/src/lib/video/kie-ai.ts`
- API endpoint: `POST /api/video/seedance`
- Status check: `GET /api/video/seedance?taskId=...`
- Used by: Broad|Cast Studio (ILLA)

## SOP: Adding Kie.AI Key to VPS
```bash
ssh myclaw-vps "echo 'KIE_API_KEY=your_key_here' >> /opt/foai-repo/cti-hub/.env.local"
ssh myclaw-vps "cd /opt/foai-repo/cti-hub && docker compose restart"
```
