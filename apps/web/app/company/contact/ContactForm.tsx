'use client';

import { useState } from 'react';
import api from '../../../src/lib/api';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post('/public/contact', { name, email, subject, message });
      setFeedback({ type: 'success', text: res.data?.data?.message || 'Message sent.' });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setFeedback({
        type: 'error',
        text: apiErr?.response?.data?.message || apiErr?.response?.data?.error || apiErr?.message || 'Unable to send message.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C0392B]/60"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C0392B]/60"
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Subject
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C0392B]/60"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Message
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#C0392B]/60"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send message'}
      </button>
      {feedback ? (
        <p
          className={`text-sm font-medium ${feedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
