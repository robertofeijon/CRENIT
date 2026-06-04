type Props = {
  step: 1 | 2 | 3;
  labels?: [string, string, string];
};

const defaultLabels: [string, string, string] = [
  'Personal information',
  'Location & residence',
  'Document uploads',
];

export default function KycWizardProgress({ step, labels = defaultLabels }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          Step {step} of 3
        </span>
        <span className="text-[#C0392B]">{labels[step - 1]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#C0392B] transition-all duration-300 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
        {labels.map((label, idx) => (
          <span key={label} className={idx + 1 === step ? 'font-semibold text-[#1A1A1A]' : ''}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
