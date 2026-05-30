"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../src/lib/api";
import { useAuth } from "../../../src/contexts/AuthContext";

type InviteData = {
  invited_email: string;
  status: string;
  expires_at: string;
  landlord_name?: string | null;
  unit_label?: string | null;
  has_existing_account?: boolean;
};

export default function InviteJoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { login } = useAuth();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const isExpired = useMemo(() => {
    if (!invite?.expires_at) return false;
    return new Date(invite.expires_at).getTime() < Date.now();
  }, [invite?.expires_at]);

  const loadInvite = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/auth/invite/${token}`);
      const data = res.data?.data;
      setInvite(data);
      setFullName(data?.full_name ?? "");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Unable to load invite.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const acceptInvite = async () => {
    if (!token || !fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!invite?.has_existing_account && !password.trim()) {
      setError("Password is required for new account registration.");
      return;
    }

    setAccepting(true);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/auth/invite/${token}/accept`, {
        full_name: fullName.trim(),
        password: invite?.has_existing_account ? undefined : password,
      });

      if (invite?.has_existing_account) {
        setMessage("Invite accepted. Log in with your existing credentials to continue.");
        router.push("/auth");
      } else {
        await login(invite?.invited_email || "", password);
        setMessage("Invite accepted successfully.");
        router.push("/tenant/home");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Unable to accept invite.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tenant invitation</h1>
        <p className="mt-2 text-sm text-slate-600">Use your invite token to join your rental workspace.</p>

        <p className="mt-4 text-sm text-slate-500">{loading ? "Checking invite..." : "Invite details loaded."}</p>

        {invite ? (
          <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Email:</span> {invite.invited_email}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Landlord:</span> {invite.landlord_name || "Not available"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Unit:</span> {invite.unit_label || "Not assigned"}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Status:</span> {invite.status}
            </p>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Expires:</span> {new Date(invite.expires_at).toLocaleString()}
            </p>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            />
            {!invite.has_existing_account ? (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              />
            ) : (
              <p className="text-xs text-slate-500">An existing account was found for this email. You can accept and log in.</p>
            )}

            <button
              type="button"
              onClick={acceptInvite}
              disabled={accepting || isExpired || invite.status !== "PENDING"}
              className="rounded-2xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {accepting ? "Accepting..." : "Accept invitation"}
            </button>
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
