import { useState } from 'react';
import SportArt from './SportArt';
import { safeImageUrl } from '../../utils/image';

/**
 * Cover for a class or course: the course's own image when it loads, otherwise the sport illustration.
 * The image sits on top of the illustration, so a broken link simply shows the art underneath.
 */
export default function ClassCover({ imageUrl, subject, alt = '', className = '', fit = 'cover' }) {
  const src = safeImageUrl(imageUrl);
  const [failed, setFailed] = useState('');
  return (
    <span className={`class-art ${className}`}>
      <SportArt subject={subject} fit={fit} />
      {src && failed !== src && <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)} />}
    </span>
  );
}
