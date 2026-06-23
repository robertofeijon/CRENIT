'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, ScrollText, Server, Shield, Mail } from 'lucide-react';
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
import AdminHealthPanel from '../../components/admin/AdminHealthPanel';
import AdminToolbarButton from '../../components/admin/AdminToolbarButton';
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
  const [failedEmails, setFailedEmails] = useState<any[]>([]);
  const [loadingFailedEmails, setLoadingFailedEmails] = useState(false);
  const [emailTestTo, setEmailTestTo] = useState('');
  const [emailTestResult, setEmailTestResult] = useState<any>(null);
  const [loadingEmailTest, setLoadingEmailTest] = useState(false);

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

  const loadFailedEmails = useCallback(() => {
    setLoadingFailedEmails(true);
    api
      .get('/admin/email-delivery/failed')
      .then((res) => setFailedEmails(res.data?.data?.deliveries || []))
      .catch(() => setFailedEmails([]))
      .finally(() => setLoadingFailedEmails(false));
  }, []);

  const runEmailTest = useCallback(() => {
    const to = emailTestTo.trim();
    if (!to) {
      setEmailTestResult({ sent: false, error: 'Enter a recipient email address.' });
      return;
    }
    setLoadingEmailTest(true);
    setEmailTestResult(null);
    api
      .post('/admin/system-health/email-test', { to })
      .then((res) => setEmailTestResult(res.data?.data || { sent: res.data?.success }))
      .catch((err: any) =>
        setEmailTestResult({
          sent: false,
          error: err?.response?.data?.error || err?.response?.data?.message || 'Email test failed.',
        }),
      )
      .finally(() => {
        setLoadingEmailTest(false);
        loadFailedEmails();
        loadHealth();
      });
  }, [emailTestTo, loadFailedEmails, loadHealth]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadHealth();
      loadFailedEmails();
    }
  }, [user, role, loadHealth, loadFailedEmails]);


  const chartData = snapshot?.error_rate_7d || [];
  const platformOk = snapshot?.platform_status === 'Operational';
  const observability = snapshot?.observability;
  const emailHealth = observability?.email || snapshot?.email;
  const sentryProjectUrl = process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL?.trim();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Operations"
        title="System health"
        subtitle="Live probes against Supabase tables and admin audit activity — refreshed on demand."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminToolbarButton onClick={loadHealth} disabled={loadingSnapshot} variant="primary">
              <RefreshCw className={`h-4 w-4 ${loadingSnapshot ? 'animate-spin' : ''}`} aria-hidden />
              Run health check
            </AdminToolbarButton>
            <AdminToolbarButton onClick={runSmoke} disabled={loadingSmoke}>
              {loadingSmoke ? 'Running smoke…' : 'Run smoke tests'}
            </AdminToolbarButton>
          </div>
        }
      />

      <p className="text-xs text-[var(--rc-text-muted)]">
        Last checked: {lastChecked ? lastChecked.toLocaleString() : '—'}
        {platformOk ? (
          <span className="admin-status-pill admin-status-pill--ok ml-3">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Platform operational
          </span>
        ) : (
          <span className="admin-status-pill admin-status-pill--warn ml-3">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {snapshot?.platform_status || 'Degraded'}
          </span>
        )}
      </p>

      {error ? <ErrorStateCard message={error} onRetry={loadHealth} /> : null}

      {snapshot?.flywheel ? (
        <AdminHealthPanel title="Flywheel metrics (30 days)" subtitle="Confirmation lag, auto-confirm rate, pending queue, shared reports." icon={Activity}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </AdminHealthPanel>
      ) : null}

      {emailHealth ? (
        <AdminHealthPanel
          title="Transactional email"
          subtitle="Delivery health, retry queue, and explicit smoke test — failed sends are never silent."
          icon={Mail}
          badge={
            <span className={`admin-status-pill ${emailHealth.configured ? 'admin-status-pill--ok' : 'admin-status-pill--error'}`}>
              {emailHealth.configured ? `${emailHealth.provider} ready` : 'Misconfigured'}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard label="Pending retries" value={emailHealth.pending_retries ?? 0} icon={RefreshCw} accent={(emailHealth.pending_retries ?? 0) > 0 ? 'warning' : 'default'} />
            <AdminStatCard label="Failed (24h)" value={emailHealth.failed_24h ?? 0} icon={AlertTriangle} accent={(emailHealth.failed_24h ?? 0) > 0 ? 'warning' : 'default'} />
            <AdminStatCard label="Dead letter (24h)" value={emailHealth.dead_24h ?? 0} icon={AlertTriangle} accent={(emailHealth.dead_24h ?? 0) > 0 ? 'warning' : 'default'} />
            <AdminStatCard
              label="Last sent"
              value={emailHealth.last_sent_at ? new Date(emailHealth.last_sent_at).toLocaleString() : '—'}
              icon={Mail}
            />
          </div>
          {!emailHealth.configured && emailHealth.issues?.length ? (
            <ul className="mt-4 space-y-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {emailHealth.issues.map((issue: any) => (
                <li key={issue.code}>
                  <span className="font-semibold">{issue.code}</span> — {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Send real test email</span>
              <input
                type="email"
                value={emailTestTo}
                onChange={(e) => setEmailTestTo(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={runEmailTest}
              disabled={loadingEmailTest}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loadingEmailTest ? 'Sending…' : 'Send test email'}
            </button>
          </div>
          {emailTestResult ? (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                emailTestResult.sent ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'
              }`}
            >
              {emailTestResult.sent
                ? emailTestResult.message || 'Test email delivered successfully.'
                : `Failed: ${emailTestResult.error || emailTestResult.message || 'unknown error'}`}
            </p>
          ) : null}
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Failed delivery log</h3>
              <button type="button" onClick={loadFailedEmails} disabled={loadingFailedEmails} className="text-xs font-semibold text-[#C0392B] hover:underline">
                {loadingFailedEmails ? 'Refreshing…' : 'Refresh log'}
              </button>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {failedEmails.map((row: any) => (
                <div key={row.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-semibold">{row.subject}</p>
                  <p>
                    To {row.recipient} · {row.status} · retries {row.retry_count}/{row.max_retries}
                  </p>
                  {row.last_error ? <p className="mt-1 text-rose-800">{row.last_error}</p> : null}
                  <p className="mt-1 text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</p>
                </div>
              ))}
              {!failedEmails.length && !loadingFailedEmails ? (
                <p className="text-sm text-slate-500">No failed or dead-letter deliveries in the recent log.</p>
              ) : null}
            </div>
          </div>
        </AdminHealthPanel>
      ) : null}

      {observability || smokeResult?.observability ? (
        <AdminHealthPanel title="Observability" subtitle="Sentry, external cron, and email transport flags from the API." icon={Server}>
          <ul className="flex flex-wrap gap-3 text-sm">
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
            {(observability?.email?.configured ?? observability?.email_configured) != null ? (
              <li
                className={`rounded-full px-3 py-1 font-medium ${
                  (observability?.email?.configured ?? observability?.email_configured)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                Email {(observability?.email?.configured ?? observability?.email_configured) ? 'configured' : 'not configured'}
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
        </AdminHealthPanel>
      ) : null}

      {smokeResult ? (
        <AdminHealthPanel
          title={`Smoke tests: ${smokeResult.pass_count}/${smokeResult.total}`}
          subtitle={smokeResult.passed ? 'All automated checks passed.' : 'Review failures before promoting.'}
          variant={smokeResult.passed ? 'success' : 'warning'}
          icon={Shield}
        >
          <ul className="space-y-1 text-sm">
            {(smokeResult.checks || []).map((c: any) => (
              <li key={c.name} className={c.pass ? 'text-emerald-800' : 'text-amber-900'}>
                {c.pass ? '✓' : '✗'} {c.name}: {c.detail}
              </li>
            ))}
          </ul>
        </AdminHealthPanel>
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
            <AdminHealthPanel title="Active alerts" variant="warning" icon={AlertTriangle}>
              <ul className="space-y-2 text-sm text-amber-900">
                {snapshot.alerts.map((a: any) => (
                  <li key={a.code}>
                    <span className="font-semibold uppercase text-xs">{a.severity}</span> — {a.message}
                  </li>
                ))}
              </ul>
            </AdminHealthPanel>
          ) : null}

          {(snapshot.schedulers || []).length > 0 ? (
            <AdminHealthPanel title="Scheduler heartbeats" subtitle="Last run since API process started (Namibia cron jobs)." icon={RefreshCw}>
              <ul className="grid gap-2 sm:grid-cols-2">
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
            </AdminHealthPanel>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(snapshot.services || []).map((svc: any) => (
              <article
                key={svc.key}
                className={`dashboard-stat-card ${svc.status === 'Operational' ? '' : 'dashboard-stat-card--warning'}`}
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
            <article className="chart-card">
              <h2 className="text-lg font-semibold text-[var(--rc-text)]">Admin activity (7 days)</h2>
              <p className="mt-1 text-xs text-[var(--rc-text-muted)]">Actions logged vs error-like entries</p>
              <div className="mt-4 h-[220px]">
                <LazyAuditActivityChart data={chartData} />
              </div>
            </article>

            <article className="chart-card">
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

          <AdminHealthPanel
            title="Error-like audit entries"
            icon={Shield}
            badge={
              (snapshot.summary?.gdpr_events ?? 0) > 0 ? (
                <Link
                  href="/admin/compliance"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C0392B] hover:underline"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  {snapshot.summary.gdpr_events} GDPR events logged
                </Link>
              ) : null
            }
          >
            <div className="space-y-2">
              {(snapshot.recent_errors || []).map((row: any, idx: number) => (
                <div key={`${row.timestamp}-${idx}`} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  {new Date(row.timestamp).toLocaleString()} · {row.error_type} · {row.affected_endpoint}
                </div>
              ))}
              {!snapshot.recent_errors?.length ? (
                <p className="text-sm text-slate-500">No error-like actions in the latest audit batch.</p>
              ) : null}
            </div>
          </AdminHealthPanel>

          <AdminHealthPanel title="Operational runbook" variant="spotlight">
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
              <li>Degraded service → confirm Supabase migration status and RLS policies on the probed table.</li>
              <li>Zero row counts on core tables → run <code className="rounded bg-white px-1">supabase/seed.sql</code> in staging.</li>
              <li>Spike in audit errors → review escrow disputes and payment webhooks.</li>
            </ul>
          </AdminHealthPanel>
        </>
      ) : !loadingSnapshot ? (
        <EmptyStateCard title="No health data" description="Run a health check to probe platform services." />
      ) : null}
    </div>
  );
}
