# Journal Lock

Protect only the Journal page with a 4-digit PIN and, on Android, the device's own fingerprint/face unlock. Nothing else in STEADY gets locked.

## What the user will see

**Settings → new "Privacy & Security" section**
- Row labelled **Journal Lock** with supporting text "Protect your private journal with a 4-digit PIN or biometrics." and an on/off switch.
- Turning it ON opens setup. Turning it OFF first requires unlocking (PIN or biometrics), so nobody can disable protection without passing it.

**Setup**
1. "Protect Your Journal" / "Keep your private thoughts protected with a Journal Lock."
2. "Create a 4-digit PIN" → "Confirm your 4-digit PIN" (mismatch restarts the PIN step).
3. If the phone supports it: "Use biometrics for faster access" with an enable option; otherwise this step is skipped silently.

**When the Journal is locked**
- Full-screen lock screen inside the Journal page: "Journal Locked" / "Use your biometric or Journal PIN to continue.", primary "Use Biometrics" (only when available), secondary "Use PIN", plus "Forgot PIN?".
- Biometrics is attempted automatically once on open; failure or cancel leaves the PIN available. Wrong PIN shows an error and keeps the Journal closed.
- "Forgot PIN?" → device biometric/credential prompt → "Create a new Journal PIN" → confirm. If the device offers no biometric or screen-lock credential, it explains that the PIN cannot be reset rather than offering a weaker route.

**Locking behaviour**
- Unlocked state is kept in memory for the current Journal visit only: leaving the Journal, restarting the app, or returning from the background after a short timeout (60s) requires authentication again.
- Entries can be added and edited freely while the Journal stays open — no repeated prompts.

Light and dark themes both use existing STEADY tokens and card styling. No lock button is added to the Journal screen.

## Security approach

- On Android: the platform BiometricPrompt (via a maintained Capacitor biometric plugin) and Android Keystore-backed encrypted storage (secure-storage plugin). STEADY never reads, stores, or sends biometric data — it only receives success/failure.
- The PIN is never stored. A random salt plus a slow key-derivation (PBKDF2-SHA256, high iteration count) produces a verifier that lives only in device secure storage. No PIN, hash, salt, or biometric material touches Supabase, and no database change is made.
- On the web there is no Keystore or platform biometric equivalent, so the same PIN verifier is stored in browser storage and the setup screen states plainly that browser storage is less secure than the Android build. Biometrics is simply unavailable there.

## Technical notes

- New deps: `@aparajita/capacitor-biometric-auth` (BiometricPrompt, device-credential fallback, enrollment-change detection) and `@aparajita/capacitor-secure-storage` (EncryptedSharedPreferences/Keystore). Both are Capacitor 8 compatible; `cap sync android` wires them in.
- New module `src/lib/journalLock/`: `secureStore.ts` (native vs web storage), `pin.ts` (derive/verify), `biometrics.ts` (availability, prompt, enrollment-change handling), `state.ts` (config + in-memory session + background timer).
- New components `src/components/journalLock/`: `JournalLockGate.tsx`, `PinPad.tsx`, `JournalLockSetup.tsx`.
- `src/routes/_authenticated/journal.tsx` wraps its existing content in `JournalLockGate` — journal data flow, repository, and UI untouched.
- Settings section added to `src/routes/_authenticated/profile.tsx` as a new `SoftCard`; strings go in `src/lib/i18n/en/ui.ts`.
- Config is stored per signed-in user id so reinstall or a different account starts unlocked-by-default with no leftover state.
- Edge cases covered: biometry unavailable/locked out, enrollment changed (biometrics refused until re-enabled, PIN still works), wrong PIN, restart, background/foreground, disable/re-enable, reinstall.

Device-level checks (real fingerprint/face on hardware) need an Android build on your phone; I can verify everything else in the preview.
