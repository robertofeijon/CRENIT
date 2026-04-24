import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  getLandlordSettings,
  getLandlordVerification,
  revokeLandlordSession,
  submitLandlordVerification,
  updateLandlordSettings
} from "../../lib/landlordApi";

export function LandlordSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verificationForm, setVerificationForm] = useState({ idDocumentName: "", ownershipDocumentName: "" });
  const [message, setMessage] = useState("");

  async function loadSettings() {
    const result = await getLandlordSettings(token);
    setSettings(result.settings || null);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [settingsResult, verificationResult] = await Promise.all([
          getLandlordSettings(token),
          getLandlordVerification(token)
        ]);
        if (active) {
          setSettings(settingsResult.settings || null);
          setVerification(verificationResult.verification || null);
        }
      } catch {
        if (active) {
          setSettings(null);
          setVerification(null);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [token]);

  const securityScore = useMemo(() => {
    if (!settings) {
      return 0;
    }
    let score = 40;
    if (settings.twoFactorEnabled) {
      score += 30;
    }
    if (settings.notifPaymentAlerts && settings.notifEscrowAlerts && settings.notifDisputeAlerts) {
      score += 20;
    }
    if (settings.sessions.length <= 2) {
      score += 10;
    }
    return Math.min(100, score);
  }, [settings]);

  function onChange(key, value) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  function onToggle(key) {
    setSettings((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  async function onSaveProfile(event) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    if (!settings.businessName.trim()) {
      setMessage("Business name is required.");
      return;
    }
    if (!settings.email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (settings.phone.trim().length < 6) {
      setMessage("Enter a valid phone number.");
      return;
    }

    try {
      const result = await updateLandlordSettings(token, settings);
      setSettings(result.settings || settings);
      setMessage(`Settings saved at ${new Date().toLocaleTimeString()}.`);
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onSubmitVerification(event) {
    event.preventDefault();
    if (!verificationForm.idDocumentName.trim() || !verificationForm.ownershipDocumentName.trim()) {
      setMessage("Upload both an identity document and proof of ownership.");
      return;
    }

    try {
      const result = await submitLandlordVerification(token, verificationForm);
      setVerification(result.verification || null);
      setVerificationForm({ idDocumentName: "", ownershipDocumentName: "" });
      setMessage("Verification package submitted.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onRevokeSession(sessionId) {
    try {
      await revokeLandlordSession(token, sessionId);
      await loadSettings();
      setMessage("Session revoked.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  const verificationStatus = verification?.status || "not_submitted";

  if (!settings) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Security Score" value={`${securityScore}%`} helper="Based on 2FA and session hygiene" tone={securityScore >= 80 ? "success" : "alert"} />
        <StatCard label="Active Sessions" value={String(settings.sessions.length)} helper="Signed-in devices" tone="trust" />
        <StatCard label="Channels Enabled" value={String([settings.notifPaymentAlerts, settings.notifEscrowAlerts, settings.notifDisputeAlerts].filter(Boolean).length)} helper="Notification channels active" tone="success" />
        <StatCard label="Statement Day" value={`Day ${settings.monthlyStatementDay}`} helper="Monthly reporting schedule" tone="trust" />
      </div>

      <SectionCard title="Profile and Security Settings">
        <form className="form-grid" onSubmit={onSaveProfile}>
          <label>
            Business Name
            <input value={settings.businessName} onChange={(event) => onChange("businessName", event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={settings.email} onChange={(event) => onChange("email", event.target.value)} />
          </label>
          <label>
            Phone
            <input value={settings.phone} onChange={(event) => onChange("phone", event.target.value)} />
          </label>
          <label>
            Payout Account
            <input value={settings.payoutAccount} onChange={(event) => onChange("payoutAccount", event.target.value)} />
          </label>
          <label>
            Timezone
            <select value={settings.timezone} onChange={(event) => onChange("timezone", event.target.value)}>
              <option value="UTC">UTC</option>
              <option value="CAT">CAT</option>
              <option value="EAT">EAT</option>
              <option value="WAT">WAT</option>
            </select>
          </label>
          <label>
            Monthly Statement Day
            <input
              type="number"
              min={1}
              max={28}
              value={settings.monthlyStatementDay}
              onChange={(event) => onChange("monthlyStatementDay", Number(event.target.value) || 1)}
            />
          </label>
          <label className="toggle-item">
            Enable 2FA
            <input type="checkbox" checked={settings.twoFactorEnabled} onChange={() => onToggle("twoFactorEnabled")} />
          </label>
          <button type="submit">Save Settings</button>
        </form>
      </SectionCard>

      <SectionCard title="Verification Status">
        <div className="detail-grid">
          <div className="detail-card">
            <p className="muted">Current Status</p>
            <StatusBadge status={verificationStatus} />
          </div>
          <div className="detail-card">
            <p className="muted">Submitted</p>
            <strong>{verification?.submittedAt ? new Date(verification.submittedAt).toLocaleString() : "Not submitted"}</strong>
          </div>
          <div className="detail-card">
            <p className="muted">Reviewed</p>
            <strong>{verification?.reviewedAt ? new Date(verification.reviewedAt).toLocaleString() : "Awaiting review"}</strong>
          </div>
        </div>
        <form className="form-grid" onSubmit={onSubmitVerification} style={{ marginTop: "14px" }}>
          <label>
            Identity Document
            <input value={verificationForm.idDocumentName} onChange={(event) => setVerificationForm((previous) => ({ ...previous, idDocumentName: event.target.value }))} placeholder="passport.pdf" />
          </label>
          <label>
            Ownership Document
            <input value={verificationForm.ownershipDocumentName} onChange={(event) => setVerificationForm((previous) => ({ ...previous, ownershipDocumentName: event.target.value }))} placeholder="deed.pdf" />
          </label>
          <button type="submit">Submit Verification</button>
        </form>
      </SectionCard>

      <SectionCard title="Notification Preferences">
        <div className="toggle-grid">
          <label className="toggle-item">
            Payment updates
            <input type="checkbox" checked={settings.notifPaymentAlerts} onChange={() => onToggle("notifPaymentAlerts")} />
          </label>
          <label className="toggle-item">
            Escrow updates
            <input type="checkbox" checked={settings.notifEscrowAlerts} onChange={() => onToggle("notifEscrowAlerts")} />
          </label>
          <label className="toggle-item">
            Dispute updates
            <input type="checkbox" checked={settings.notifDisputeAlerts} onChange={() => onToggle("notifDisputeAlerts")} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Active Sessions">
        {settings.sessions.length ? (
          <ul className="list">
            {settings.sessions.map((session) => (
              <li key={session.id}>
                <span>
                  <strong>{session.label}</strong>
                  <p>{session.lastSeen}</p>
                </span>
                <span className="button-row compact-actions">
                  <StatusBadge status={session.status} />
                  <button type="button" className="ghost" onClick={() => onRevokeSession(session.id)}>Revoke</button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No active sessions remain.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
