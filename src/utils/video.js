// Lesson guide videos are links to YouTube / Vimeo / Google Drive. This turns a pasted share link
// into an embeddable player URL, and rejects anything else (the BE applies the same host list).

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** → { provider: 'YouTube' | 'Vimeo' | 'Google Drive', embedUrl } or null when the link is not supported. */
export function videoEmbed(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
    const id = host === 'youtu.be' ? parts[0]
      : url.pathname === '/watch' ? url.searchParams.get('v')
        : ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null;
    if (!id || !YOUTUBE_ID.test(id)) return null;
    const start = Number.parseInt(String(url.searchParams.get('t') || '').replace(/s$/, ''), 10);
    return { provider: 'YouTube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ''}` };
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    const id = host === 'player.vimeo.com' ? (parts[0] === 'video' ? parts[1] : null) : parts[0];
    if (!/^\d+$/.test(id || '')) return null;
    const hash = host === 'player.vimeo.com' ? url.searchParams.get('h') : parts[1];
    return { provider: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${id}${hash && /^[a-f\d]+$/i.test(hash) ? `?h=${hash}` : ''}` };
  }
  if (host === 'drive.google.com') {
    const id = parts[0] === 'file' && parts[1] === 'd' ? parts[2] : url.searchParams.get('id');
    if (!/^[A-Za-z0-9_-]{10,}$/.test(id || '')) return null;
    return { provider: 'Google Drive', embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }
  return null;
}

export const VIDEO_HINT = 'Dán link YouTube (nên để chế độ Không công khai), Vimeo hoặc Google Drive (chia sẻ "Bất kỳ ai có liên kết").';
