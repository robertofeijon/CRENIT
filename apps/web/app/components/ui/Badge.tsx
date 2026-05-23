type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'navy';

const styles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
  navy: 'bg-[#1A1A2E] text-white',
};

export default function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}
