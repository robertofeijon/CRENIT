'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, ScrollText, Server, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';

const LazyAuditActivityChart = dynamic(() => import('../../components/charts/AuditActivityChart'), {
  ssr: false,
  loading: () => <SkeletonBlocks rows={3} />,
});
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminStatCard from '../../components/ui/AdminStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminSystemHealthPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [smokeResult, setSmokeResult] = useState<any>(null);
  const [loadingSmoke, setLoadingSmoke] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const runSmoke = useCallback(() => {
    setLoadingSmoke(true);
    api
      .post('/admin/system-health/smoke')
      .then((res) => setSmokeResult(res.data?.data || null))
      .catch((err: any) => setError(err?.response?.data?.message || 'Smoke test failed.'))
      .finally(() => setLoadingSmoke(false));
  }, []);

  const loadHealth = useCallback(() => {
    setLoadingSnapshot(true);
    setError(null);
    api
      .get('/admin/system-health/overview')
      .then((res) => {
        setSnapshot(res.data?.data || null);
        setLastChecked(new Date());
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'Unable to load system health.'))
      .finally(() => setLoadingSnapshot(false));
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadHealth();
    }
  }, [user, role, loadHealth]);


  const chartData = snapshot?.error_rate_7d || [];
  const platformOk = snapshot?.platform_status === 'Operational';
  const observability = snapshot?.observability;
  const sentryProjectUrl = process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL?.trim();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Operations"
        title="System health"
        subtitle="Live probes against Supabase tables and admin audit activity — refreshed on demand."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadHealth}
              disabled={loadingSnapshot}
              className="inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSnapshot ? 'animate-spin' : ''}`} aria-hidden />
              Run health check
            </button>
            <button
              type="button"
              onClick={runSmoke}
              disabled={loadingSmoke}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] disabled:opacity-60"
            >
              {loadingSmoke ? 'Running smoke…' : 'Run smoke tests'}
            </button>
          </div>
        }
      />

      <p className="text-xs text-slate-500">
        Last checked: {lastChecked ? lastChecked.toLocaleString() : '—'}
        {platformOk ? (
          <span className="ml-3 inline-flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Platform operational
          </span>
        ) : (
          <span className="ml-3 inline-flex items-center gap-1 font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {snapshot?.platform_status || 'Degraded'}
          </span>
        )}
      </p>

      {error ? <ErrorStateCard message={error} onRetry={loadHealth} /> : null}

      {snapshot?.flywheel ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A]">Flywheel metrics (30 days)</h2>
          <p className="mt-1 text-xs text-slate-500">Confirmation lag, auto-confirm rate, pending queue, shared reports.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              label="Confirm lag (p50)"
              value={snapshot.flywheel.confirmation_lag_hours_p50 != null ? `${snapshot.flywheel.confirmation_lag_hours_p50}h` : '—'}
              sub={`Target ≤ ${snapshot.flywheel.targets?.confirmation_lag_hours_p50 ?? 36}h · n=${snapshot.flywheel.confirmation_lag_sample_size}`}
              icon={Activity}
              accent={
                snapshot.flywheel.confirmation_lag_hours_p50 != null &&
                snapshot.flywheel.confirmation_lag_hours_p50 > (snapshot.flywheel.targets?.confirmation_lag_hours_p50 ?? 36)
                  ? 'warning'
                  : 'success'
              }
            />
            <AdminStatCard
              label="Auto-confirm rate"
              value={snapshot.flywheel.auto_confirm_rate_pct != null ? `${snapshot.flywheel.auto_confirm_rate_pct}%` : '—'}
              sub={`Target ≥ ${snapshot.flywheel.targets?.auto_confirm_rate_pct ?? 40}%`}
              icon={CheckCircle2}
            />
            <AdminStatCard
              label="Pending confirms"
              value={snapshot.flywheel.pending_confirmations ?? 0}
              sub={`${snapshot.flywheel.auto_confirm_window_hours}h window`}
              icon={AlertTriangle}
              accent={(snapshot.flywheel.pending_confirmations ?? 0) > 0 ? 'warning' : 'default'}
            />
            <AdminStatCard
              label="Reports shared"
              value={snapshot.flywheel.shareable_reports_30d ?? 0}
              sub="PDF verifications issued"
              icon={Server}
            />
          </div>
        </section>
      ) : null}

      {observability || smokeResult?.observability ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A]">Observability</h2>
          <p className="mt-1 text-xs text-slate-500">Sentry, external cron, and email transport flags from the API.</p>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            <li
              className={`rounded-full px-3 py-1 font-medium ${
                (observability ?? smokeResult?.observability)?.sentry_api
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              API Sentry {(observability ?? smokeResult?.observability)?.sentry_api ? 'on' : 'off'}
            </li>
            <li
              className={`rounded-full px-3 py-1 font-medium ${
                (observability ?? smokeResult?.observability)?.cron_secret_configured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              CRON_SECRET {(observability ?? smokeResult?.observability)?.cron_secret_configured ? 'set' : 'missing'}
            </li>
            {observability?.email_configured != null ? (
              <li
                className={`rounded-full px-3 py-1 font-medium ${
                  observability.email_configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}
              >
                Email {observability.email_configured ? 'configured' : 'not configured'}
              </li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {sentryProjectUrl ? (
              <a
                href={sentryProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#C0392B] hover:underline"
              >
                Open Sentry
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <span className="text-slate-500">Set NEXT_PUBLIC_SENTRY_PROJECT_URL on Vercel for a Sentry link.</span>
            )}
          </div>
        </section>
      ) : null}

      {smokeResult ? (
        <section
          className={`rounded-[1.5rem] border p-5 ${smokeResult.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
        >
          <p className="font-semibold text-[#1A1A1A]">
            Smoke tests: {smokeResult.pass_count}/{smokeResult.total}{' '}
            {smokeResult.passed ? 'passed' : '— review failures'}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {(smokeResult.checks || []).map((c: any) => (
              <li key={c.name} className={c.pass ? 'text-emerald-800' : 'text-amber-900'}>
                {c.pass ? '✓' : '✗'} {c.name}: {c.detail}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-slate-600">
        Related:{' '}
        <Link href="/admin/audit" className="font-semibold text-[#C0392B] hover:underline">
          Audit log →
        </Link>
        {' · '}
        <Link href="/admin/compliance" className="font-semibold text-[#C0392B] hover:underline">
          GDPR compliance
        </Link>
      </p>

      {loadingSnapshot && !snapshot ? (
        <SkeletonBlocks rows={5} />
      ) : snapshot ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              label="Services OK"
              value={`${snapshot.summary?.services_operational ?? 0}/${snapshot.summary?.services_total ?? 6}`}
              icon={Server}
              accent={platformOk ? 'success' : 'warning'}
            />
            <AdminStatCard
              label="Admin actions (recent)"
              value={snapshot.summary?.admin_actions_logged ?? 0}
              sub="Latest audit log batch"
              icon={Activity}
            />
            <AdminStatCard
              label="GDPR events"
              value={snapshot.summary?.gdpr_events ?? 0}
              sub="Exports & deletions logged"
              icon={Activity}
              accent="dark"
            />
            <AdminStatCard
              label="Open alerts"
              value={snapshot.summary?.open_alerts ?? 0}
              sub="Schedulers, SMTP, probes"
              icon={AlertTriangle}
              accent={(snapshot.summary?.open_alerts ?? 0) > 0 ? 'warning' : 'default'}
            />
          </section>

          {(snapshot.alerts || []).length > 0 ? (
            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-[#1A1A1A]">Active alerts</h2>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {snapshot.alerts.map((a: any) => (
                  <li key={a.code}>
                    <span className="font-semibold uppercase text-xs">{a.severity}</span> — {a.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(snapshot.schedulers || []).length > 0 ? (
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-[#1A1A1A]">Scheduler heartbeats</h2>
              <p className="mt-1 text-xs text-slate-500">Last run since API process started (Namibia cron jobs).</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {snapshot.schedulers.map((job: any) => (
                  <li key={job.job} className="rounded-lg bg-[#F3F4F6] px-3 py-2 text-xs">
                    <span className="font-semibold text-[#1A1A1A]">{job.job}</span>
                    <span className={job.ok ? ' text-emerald-700' : ' text-rose-700'}>
                      {' '}
                      · {job.ok ? 'OK' : 'Failed'} · {new Date(job.last_run_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(snapshot.services || []).map((svc: any) => (
              <article
                key={svc.key}
                className={`rounded-[1.5rem] border p-5 shadow-sm ${
                  svc.status === 'Operational' ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#1A1A1A]">{svc.name}</p>
                  {svc.status === 'Operational' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-700">{svc.status}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Table <code className="rounded bg-slate-100 px-1">{svc.table}</code> · {svc.record_count?.toLocaleString() ?? 0}{' '}
                  rows
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Checked {svc.last_checked ? new Date(svc.last_checked).toLocaleTimeString() : '—'}
                </p>
                {svc.probe_error ? <p className="mt-2 text-xs text-amber-800">{svc.probe_error}</p> : null}
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-[#1A1A1A]">Admin activity (7 days)</h2>
              <p className="mt-1 text-xs text-slate-500">Actions logged vs error-like entries</p>
              <div className="mt-4 h-[220px]">
                <LazyAuditActivityChart data={chartData} />
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-[#1A1A1A]">Recent admin actions</h2>
                <Link
                  href="/admin/audit"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C0392B] hover:underline"
                >
                  <ScrollText className="h-3.5 w-3.5" aria-hidden />
                  Full audit log
                </Link>
              </div>
              <ul className="mt-4 max-h-[220px] space-y-2 overflow-auto">
                {(snapshot.recent_admin_actions || []).map((row: any, idx: number) => (
                  <li key={`${row.timestamp}-${idx}`} className="rounded-lg bg-[#F3F4F6] px-3 py-2 text-xs text-slate-700">
                    <span className="font-semibold text-[#1A1A1A]">{row.action}</span>
                    <span className="text-slate-400"> · {new Date(row.timestamp).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              {!snapshot.recent_admin_actions?.length ? (
                <p className="mt-4 text-sm text-slate-500">No admin actions in the latest batch.</p>
              ) : null}
            </article>
          </section>

          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[#1A1A1A]">Error-like audit entries</h2>
              {(snapshot.summary?.gdpr_events ?? 0) > 0 ? (
                <Link
                  href="/admin/compliance"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C0392B] hover:underline"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  {snapshot.summary.gdpr_events} GDPR events logged
                </Link>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              {(snapshot.recent_errors || []).map((row: any, idx: number) => (
                <div key={`${row.timestamp}-${idx}`} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  {new Date(row.timestamp).toLocaleString()} · {row.error_type} · {row.affected_endpoint}
                </div>
              ))}
              {!snapshot.recent_errors?.length ? (
                <p className="text-sm text-slate-500">No error-like actions in the latest audit batch.</p>
              ) : null}
            </div>
          </article>

          <section className="rounded-[1.5rem] border border-dashed border-slate-300 bg-[#F3F4F6]/80 p-5">
            <p className="text-sm font-semibold text-[#1A1A1A]">Operational runbook</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
              <li>Degraded service → confirm Supabase migration status and RLS policies on the probed table.</li>
              <li>Zero row counts on core tables → run <code className="rounded bg-white px-1">supabase/seed.sql</code> in staging.</li>
              <li>Spike in audit errors → review escrow disputes and payment webhooks.</li>
            </ul>
          </section>
        </>
      ) : !loadingSnapshot ? (
        <EmptyStateCard title="No health data" description="Run a health check to probe platform services." />
      ) : null}
    </div>
  );
}
