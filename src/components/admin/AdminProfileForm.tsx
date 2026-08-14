"use client";

import { useState } from "react";

import { StatefulButton, type ButtonState } from "@/components/admin/StatefulButton";
import { PHONE_PATTERN } from "@/lib/utils/phone";

interface AdminProfileFormProps {
  displayName: string;
  mobileNumber: string;
  username: string;
  role: string;
}

/**
 * Self-service profile (S67). Two independent forms in one .admin-form, each
 * with its own StatefulButton -- saving your name should not require retyping
 * your password, and a failed password check should not roll back a name you
 * already saved.
 *
 * Validation mirrors ResetPasswordForm.tsx exactly (both fields required, new
 * must equal confirm, minimum 8 characters, errors in uppercase) so the two
 * password screens in this product cannot disagree about what a valid password
 * is. It does not share that file's markup: ResetPasswordForm is a standalone
 * public screen built on the bootstrap BS palette, while this lives inside the
 * admin shell and uses .admin-form / .admin-input / .admin-label.
 */
export default function AdminProfileForm({
  displayName: initialDisplayName,
  mobileNumber: initialMobile,
  username,
  role,
}: AdminProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [mobileNumber, setMobileNumber] = useState(initialMobile);
  const [detailsState, setDetailsState] = useState<ButtonState>("idle");
  const [detailsError, setDetailsError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<ButtonState>("idle");
  const [passwordError, setPasswordError] = useState("");
  const [passwordDone, setPasswordDone] = useState(false);

  async function patch(payload: Record<string, string>) {
    const res = await fetch("/api/admin/accounts/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "Update failed");
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setDetailsError("");

    if (!displayName.trim()) {
      setDetailsError("DISPLAY NAME IS REQUIRED");
      return;
    }

    setDetailsState("loading");
    try {
      await patch({ displayName: displayName.trim(), mobileNumber: mobileNumber.trim() });
      setDetailsState("success");
      setTimeout(() => setDetailsState("idle"), 2500);
    } catch (err) {
      setDetailsError((err as Error).message.toUpperCase());
      setDetailsState("error");
      setTimeout(() => setDetailsState("idle"), 2500);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("ALL FIELDS ARE REQUIRED");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("PASSWORDS DO NOT MATCH");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("PASSWORD MUST BE AT LEAST 8 CHARACTERS");
      return;
    }

    setPasswordState("loading");
    try {
      await patch({ currentPassword, newPassword });
      setPasswordState("success");
      setPasswordDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError((err as Error).message.toUpperCase());
      setPasswordState("error");
      setTimeout(() => setPasswordState("idle"), 2500);
    }
  }

  return (
    <div className="admin-form" style={{ display: "flex", flexDirection: "column" }}>
      <form onSubmit={saveDetails} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        <span className="admin-section-label admin-form-section">Account details</span>

        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <span className="admin-label">Username</span>
            <p className="admin-cell-mono" style={{ fontSize: "0.85rem" }}>{username}</p>
          </div>
          <div>
            <span className="admin-label">Role</span>
            <p className="admin-cell-mono" style={{ fontSize: "0.85rem", textTransform: "uppercase" }}>
              {role}
            </p>
          </div>
        </div>
        <p className="admin-hint" style={{ marginTop: "-0.9rem" }}>
          Username and role are set when the account is created. Ask the godfather
          to change either.
        </p>

        <div>
          <label className="admin-label" htmlFor="profile-display-name">
            Display name
          </label>
          <input
            id="profile-display-name"
            className="admin-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="admin-label" htmlFor="profile-mobile">
            Mobile number
          </label>
          <input
            id="profile-mobile"
            className="admin-input"
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            maxLength={10}
            pattern={PHONE_PATTERN}
            title="10 digits only -- no country code, no spaces"
            placeholder="9876543210"
            autoComplete="tel"
          />
          <p className="admin-hint">
            10 digits only, no country code. Leave blank to remove it.
          </p>
        </div>

        {detailsError && <p className="admin-error">{detailsError}</p>}

        <div className="admin-form-actions">
          <StatefulButton state={detailsState}>SAVE DETAILS</StatefulButton>
        </div>
      </form>

      <form
        onSubmit={savePassword}
        style={{ display: "flex", flexDirection: "column", gap: "1.4rem", marginTop: "1rem" }}
      >
        <span className="admin-section-label admin-form-section">Change password</span>

        {passwordDone ? (
          <p className="admin-hint" style={{ color: "var(--success)", fontSize: "0.75rem" }}>
            PASSWORD UPDATED. EVERY SIGNED-IN DEVICE FOR THIS ACCOUNT, INCLUDING
            THIS ONE, IS SIGNED OUT ON THE NEXT REQUEST -- SIGN IN AGAIN WITH THE
            NEW PASSWORD.
          </p>
        ) : (
          <>
            <div>
              <label className="admin-label" htmlFor="profile-current-password">
                Current password
              </label>
              <input
                id="profile-current-password"
                className="admin-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="admin-label" htmlFor="profile-new-password">
                New password
              </label>
              <input
                id="profile-new-password"
                className="admin-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="admin-hint">At least 8 characters.</p>
            </div>

            <div>
              <label className="admin-label" htmlFor="profile-confirm-password">
                Confirm new password
              </label>
              <input
                id="profile-confirm-password"
                className="admin-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {passwordError && <p className="admin-error">{passwordError}</p>}

            <p className="admin-hint">
              Changing your password signs this account out everywhere, including
              on this device.
            </p>

            <div className="admin-form-actions">
              <StatefulButton state={passwordState}>CHANGE PASSWORD</StatefulButton>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
