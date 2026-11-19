/** Horizontal step indicator, e.g. the 5 enrollment steps. current = labels.length marks every step done. */
export default function FlowSteps({ labels, current }) {
  return (
    <ol className="flow-steps" aria-label={current >= labels.length ? 'Đã hoàn tất mọi bước' : `Bước ${current + 1}: ${labels[current]}`}>
      {labels.map((label, index) => (
        <li key={label} className={index === current ? 'is-current' : index < current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}>
          {index < current ? '✓' : index + 1} {label}
        </li>
      ))}
    </ol>
  );
}
