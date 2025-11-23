export async function uploadVideo(file: File, apiKey?: string) {
  const form = new FormData();
  form.append('file', file);
  if (apiKey) form.append('api_key', apiKey);

  const res = await fetch('/api/upload_video', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return res.json();
}
