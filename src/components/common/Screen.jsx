/** Page content column inside the shell's main area. `wide` uses the full width. */
export default function Screen({ children, wide = false }) {
  return <div className={`screen${wide ? ' screen-wide' : ''}`}>{children}</div>;
}
