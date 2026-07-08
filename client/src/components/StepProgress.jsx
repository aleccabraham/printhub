const STEP_LABELS = ['Upload', 'Options', 'Payment', 'Confirmation'];

export default function StepProgress({ step }) {
  return (
    <div>
      <div className="step-labels">
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={i + 1 === step ? 'current' : ''}>
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <div className="step-progress">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className={`step-dot ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
