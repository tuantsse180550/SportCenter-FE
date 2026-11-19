import { Icon } from './Icon';

/**
 * Design button (.btn). Variants: primary (default), secondary, soft, danger.
 * Accepts the older API too: title / onPress / secondary / small.
 */
export default function Button({ title, children, onPress, onClick, secondary = false, variant = '', small = false, icon, type = 'button', className = '', ...props }) {
  const classes = ['btn', secondary ? 'secondary' : variant, small && 'small', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} onClick={onPress || onClick} {...props}>
      {icon && <Icon name={icon} size={small ? 15 : 17} />}
      {title ?? children}
    </button>
  );
}
