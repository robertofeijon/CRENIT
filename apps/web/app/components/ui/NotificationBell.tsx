'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../../src/contexts/NotificationsContext';

function notificationHref(type: string, role: 'tenant' | 'landlord' | 'admin'): string | null {
  const t = type.toUpperCase();
  if (t.includes('RENEWAL')) return role === 'tenant' ? '/tenant/home' : '/landlord/leases';
  if (t.includes('KYC')) return role === 'tenant' ? '/tenant/kyc' : '/admin/kyc';
  if (t.includes('PAYMENT') || t.includes('RENT')) return role === 'tenant' ? '/tenant/payments' : '/landlord/payments';
  if (t.includes('PARTNER') || t.includes('LANDLORD')) return '/landlord/overview';
  if (role === 'admin') return '/admin';
  return null;
}

export default function NotificationBell({ role }: { role: 'tenant' | 'landlord' | 'admin' }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#C0392B] px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-[#1A1A1A]">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-[#C0392B] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {loading && !notifications.length ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Loading…</li>
            ) : null}
            {!loading && !notifications.length ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">All caught up</li>
            ) : null}
            {notifications.slice(0, 12).map((note) => {
              const href = notificationHref(note.type, role);
              const body = (
                <>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</p>
                </>
              );
              return (
                <li key={note.id} className="border-b border-slate-50 last:border-0">
                  <div className="flex gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link href={href} className="block hover:opacity-90" onClick={() => setOpen(false)}>
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void markRead(note.id)}
                      className="shrink-0 text-xs font-semibold text-slate-500 hover:text-[#1A1A1A]"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
