const TONES = ['orange', 'purple', 'green', 'blue'];

const initials = (name = '') => String(name).trim().split(/\s+/).slice(-2).map(part => part[0] || '').join('').toUpperCase() || '?';

/** Initials avatar. `tone` can be set, otherwise picked from `index`. */
export default function Avatar({ name, small = false, tone, index = 0 }) {
  return <span className={`avatar ${small ? 'small' : ''} ${tone || TONES[index % TONES.length]}`} aria-hidden="true">{initials(name)}</span>;
}
