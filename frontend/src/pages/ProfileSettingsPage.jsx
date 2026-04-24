import { useEffect, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { useAuth } from "../context/AuthContext";
import { changeTenantPassword, getTenantProfile, toggleTenant2FA, updateTenantProfile } from "../lib/tenantApi";

export function ProfileSettingsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  async function load() {
    const result = await getTenantProfile(token);
    setData(result);
  }

  useEffect(() => {
    load().catch(() => setData(null));
  }, [token]);

  async function onSaveProfile(event) {
    event.preventDefault();
    try {
      await updateTenantProfile(token, data.profile);
      setMessage("Profile updated.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onChangePassword(event) {
    event.preventDefault();
    try {
      await changeTenantPassword(token, passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setMessage("Password changed successfully.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onToggle2FA() {
    try {
      await toggleTenant2FA(token, !data.profile.twoFactorEnabled);
      await load();
      setMessage("Security setting updated.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Profile & Settings</p>
          <h1>Manage your identity, security, and account controls.</h1>
          <p className="page-hero-copy">Keep contact details current, tighten account security, and review the sessions connected to your account.</p>
        </div>
      </div>

      <div className="card-grid four">
        <StatCard label="2FA" value={data.profile.twoFactorEnabled ? "Enabled" : "Off"} tone={data.profile.twoFactorEnabled ? "success" : "alert"} />
        <StatCard label="Linked Accounts" value={String(data.profile.linkedAccounts.length)} helper="Connected payment methods" />
        <StatCard label="Active Sessions" value={String(data.sessions.length)} helper="Current device logins" tone="trust" />
        <StatCard label="Profile Completeness" value={data.profile.phone ? "Good" : "Needs Phone"} />
      </div>

      <SectionCard title="Profile and Contact">
        <form className="form-grid" onSubmit={onSaveProfile}>
          <label>
            Full Name
            <input value={data.profile.fullName} onChange={(event) => setData((p) => ({ ...p, profile: { ...p.profile, fullName: event.target.value } }))} />
          </label>
          <label>
            Email
            <input type="email" value={data.profile.email} onChange={(event) => setData((p) => ({ ...p, profile: { ...p.profile, email: event.target.value } }))} />
          </label>
          <label>
            Phone
            <input value={data.profile.phone} onChange={(event) => setData((p) => ({ ...p, profile: { ...p.profile, phone: event.target.value } }))} />
          </label>
          <button type="submit">Save Profile</button>
        </form>
      </SectionCard>

      <SectionCard title="Security Settings">
        <div className="button-row">
          <button onClick={onToggle2FA}>{data.profile.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}</button>
        </div>

        <form className="form-inline" onSubmit={onChangePassword}>
          <input type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords((p) => ({ ...p, currentPassword: event.target.value }))} required />
          <input type="password" placeholder="New password" value={passwords.newPassword} onChange={(event) => setPasswords((p) => ({ ...p, newPassword: event.target.value }))} required minLength={6} />
          <button type="submit">Change Password</button>
        </form>
      </SectionCard>

      <SectionCard title="Linked Accounts and Sessions">
        <h4>Payment Accounts</h4>
        <ul className="list">{data.profile.linkedAccounts.map((account) => <li key={account.id}>{account.label}</li>)}</ul>
        <h4>Active Sessions</h4>
        <ul className="list">{data.sessions.map((session) => <li key={session.id}>{session.device} - {session.location} ({session.lastActive})</li>)}</ul>
      </SectionCard>

      <SectionCard title="Data Requests">
        <div className="button-row">
          <button className="ghost">Request Data Export</button>
          <button className="danger">Request Account Deletion</button>
        </div>
      </SectionCard>

      {message ? <p className="ok-text">{message}</p> : null}
    </div>
  );
}
