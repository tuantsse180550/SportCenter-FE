import { videoEmbed } from '../../utils/video';
import { Icon } from './Icon';

/** 16:9 player for a lesson guide link. Renders nothing for an unsupported link unless `fallback` is given. */
export default function VideoEmbed({ url, title = 'Video hướng dẫn', fallback = null }) {
  const video = videoEmbed(url);
  if (!video) return fallback;
  return (
    <figure className="video-embed">
      <div className="video-frame">
        <iframe
          src={video.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption>
        <Icon name="sport" size={14} /> {video.provider}
        <a className="link" href={url} target="_blank" rel="noopener noreferrer">Mở trong tab mới</a>
      </figcaption>
    </figure>
  );
}
