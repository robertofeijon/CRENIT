import { BANK_INTEGRATION_ONE_PAGERS } from '../../../src/content/bank-integration-one-pagers';

export default function BankIntegrationCards() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {BANK_INTEGRATION_ONE_PAGERS.map((bank) => (
        <article
          key={bank.slug}
          className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-[#1A1A1A]">{bank.name}</h3>
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Coming soon
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{bank.headline}</p>
          <ul className="mt-4 space-y-2 text-xs text-slate-600">
            {bank.bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#C0392B]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">{bank.exportFormat}</p>
        </article>
      ))}
    </div>
  );
}
