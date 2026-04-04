const TWELVE_LABS_KEY = process.env.TWELVE_LABS_API_KEY || '';
const BASE = 'https://api.twelvelabs.io/v1.3';

export async function createIndex(name: string) {
  const res = await fetch(`${BASE}/indexes`, {
    method: 'POST',
    headers: { 'x-api-key': TWELVE_LABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engine_id: 'pegasus1.2',
      index_options: ['visual', 'conversation', 'text_in_video'],
      index_name: name
    }),
  });
  return res.json();
}

export async function indexVideo(indexId: string, videoUrl: string) {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'x-api-key': TWELVE_LABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ index_id: indexId, url: videoUrl }),
  });
  return res.json();
}

export async function searchVideo(indexId: string, query: string) {
  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'x-api-key': TWELVE_LABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      index_id: indexId,
      query_text: query,
      search_options: ['visual', 'conversation'],
      threshold: 'low',
    }),
  });
  return res.json();
}

export async function generateSummary(videoId: string, prompt: string) {
  const res = await fetch(`${BASE}/summarize`, {
    method: 'POST',
    headers: { 'x-api-key': TWELVE_LABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, type: 'summary', prompt }),
  });
  return res.json();
}
