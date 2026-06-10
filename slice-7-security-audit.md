# Slice 7 — Security Audit
## Task Brief for Claude Code

> Read CLAUDE.md first. Slices 1–6 must be complete before running this.
> This slice does NOT build features. It audits, fixes, and hardens the app.
> Run this before sharing the app with anyone beyond Chaitanya.

---

## Mission
A comprehensive security audit of Swagath Central covering credentials,
authentication, database security, frontend exposure, API security,
and AI-specific risks. Fix every issue found. Document anything that
can't be fixed with a clear explanation of the residual risk.

---

## Audit Checklist

### A — Credentials & Secrets

**A1. No secrets in frontend JavaScript**
- Scan all `src/` files for any string matching patterns: `sk_`, `secret`, `private`, `password`, `groq`, `service_role`
- The only key allowed in frontend code is `VITE_SUPABASE_ANON_KEY` (this is intentionally public per Supabase design)
- The Groq API key must ONLY exist in `api/generate-summary.ts` via `process.env.GROQ_API_KEY`
- Report any violation

**A2. No secrets in git history**
- Run `git log --all --full-history -- "**/.env*"` to check if any .env files were ever committed
- Run `git grep -i "groq\|service_role\|sb_secret" $(git rev-list --all)` to scan commit history
- Report any findings

**A3. .gitignore is complete**
Verify `.gitignore` covers:
- `.env.local`, `.env`, `.env.production`
- `scripts/` directory should NOT be ignored (test scripts are fine to commit)
- `supabase-*.sql` files — these contain schema but no secrets, OK to commit

**A4. Source maps in production**
Vite exposes source maps by default. Check `vite.config.ts`:
- If `build.sourcemap` is not explicitly set to `false`, add it
- Source maps expose your full TypeScript source to anyone with DevTools
- Fix: add `build: { sourcemap: false }` to `vite.config.ts`

---

### B — Authentication & Session

**B1. Session timeout**
- Swagath Central has no session timeout. If Chaitanya leaves the app open
  on a shared device, anyone can access financial data.
- Fix: add an idle timeout — if no interaction for 30 minutes, sign out automatically
- Implement with a `useIdleTimeout` hook that listens for mousemove/keydown/touchstart
  and calls `supabase.auth.signOut()` after 30 minutes of inactivity
- Show a "You've been signed out due to inactivity" message on the login screen

**B2. Auth error messages**
- Verify LoginPage doesn't expose whether an email exists or not
- "Invalid login credentials" is correct — do NOT say "email not found" or "wrong password"
- Check the current error message from Supabase and confirm it's generic

**B3. No signup route**
- Verify there is no `/signup` route accessible in App.tsx
- Account creation should only happen via Supabase dashboard
- If a signup page exists, remove it

---

### C — Database Security (Supabase RLS)

**C1. RLS enabled on all tables**
Run this in Supabase SQL Editor and verify every table shows RLS enabled:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'theatre_%'
ORDER BY tablename;
```
Every row must show `rowsecurity = true`. Report any table where it's false.

**C2. RLS policies are correct**
Run this to list all policies:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'theatre_%'
ORDER BY tablename;
```
Verify each policy correctly chains back to `auth.uid() = owner_id` via joins.
Report any policy that uses `true` or has no `qual` (would be wide open).

**C3. No service role key in app**
The Supabase service role key bypasses RLS entirely.
Verify it appears nowhere in the codebase or environment variables accessible to the frontend.

**C4. Anon key permissions**
The anon key is public by design but should only be able to:
- Sign in / sign out
- Read/write rows where RLS passes
It should NOT be able to:
- Access auth.users table
- Call any admin functions
Verify in Supabase → Authentication → Policies that no public policies exist on theatre_ tables.

---

### D — Frontend Security

**D1. Input validation on numeric fields**
All OB/REC/CB inputs in ShowPage strip non-digits via `.replace(/[^\d]/g, '')`.
Verify this is applied consistently — check all `inputMode="numeric"` fields.
Also verify no field accepts values that would cause integer overflow in Postgres
(max int4 = 2,147,483,647 — a count of 999999 is fine, no risk here).

**D2. No debug pages in production**
Verify there is no `/dev`, `/debug`, `/seed`, or `/admin` route in App.tsx.
The seed scripts live in `scripts/` and are run via CLI only — they are not web routes.

**D3. No verbose error messages to user**
Check all `.catch` and `error` handlers in the codebase.
Supabase error objects contain internal details. Verify the app shows generic messages
to the user ("Something went wrong") not raw Supabase error strings.
Fix any component that passes `error.message` directly to visible UI.

**D4. XSS prevention**
React escapes output by default. Verify:
- No use of `dangerouslySetInnerHTML` anywhere in the codebase
- No use of `innerHTML` in any script
- Run: `grep -r "dangerouslySetInnerHTML\|innerHTML" src/`
- Report any findings

---

### E — API Security (Vercel Serverless — Slice 6)

**E1. Groq endpoint rate limiting**
The `/api/generate-summary` endpoint has no rate limiting.
A malicious actor could call it in a loop and exhaust the Groq free tier.
Fix: add a simple IP-based rate limit — max 10 requests per IP per hour.
Use Vercel's built-in rate limiting via `vercel.json` or a simple in-memory counter:

```typescript
// In api/generate-summary.ts
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}
```

**E2. Prompt injection protection**
The AI summary prompt is built from Supabase data (movie names, expense descriptions).
A malicious string in `movie_name` or `others_description` could inject instructions.
Fix: sanitize all user-provided strings before inserting into the prompt:
- Strip any text after `\n---` or `\nIgnore previous instructions`
- Truncate movie_name to 100 chars, others_description to 200 chars
- Add to `buildPrompt` in the serverless function

**E3. Request validation on serverless function**
Verify `api/generate-summary.ts` validates the request body before using it:
- Check `theatreName`, `date`, `dayData` are all present
- Check `dayData` has expected shape (not an arbitrary object)
- Return 400 if validation fails, not 500

**E4. CORS on serverless function**
By default Vercel serverless functions accept requests from any origin.
Since this app is only used from `swagath-central.vercel.app`, restrict CORS:
```typescript
res.setHeader('Access-Control-Allow-Origin', 'https://swagath-central.vercel.app')
res.setHeader('Access-Control-Allow-Methods', 'POST')
```

---

### F — Infrastructure & Operational

**F1. Supabase backup awareness**
Supabase free tier has NO point-in-time recovery.
This is a known limitation — document it in CLAUDE.md under a new "Known Risks" section.
Recommended mitigation: weekly manual export via Supabase → Settings → Database → Backups.
Add a note to CLAUDE.md reminding Chaitanya to export monthly.

**F2. GitHub repo is private**
Verify the `swagath-central` repo on GitHub is set to Private.
If public, make it private immediately — the codebase contains architecture details
and the schema reveals the business's operational data structure.

**F3. Dependency vulnerabilities**
Run: `npm audit`
Fix any HIGH or CRITICAL vulnerabilities with `npm audit fix`.
Document any that can't be auto-fixed.

**F4. Outdated packages**
Run: `npm outdated`
Update any packages with known security patches.
Do NOT blindly update all packages — only security-relevant ones.

**F5. DEMO data cleanup reminder**
Verify the seed data (`[DEMO]` prefixed shows) has been deleted before
Chaitanya uses the app for real. Run:
```sql
SELECT COUNT(*) FROM theatre_shows WHERE movie_name LIKE '[DEMO]%';
```
If count > 0, run `npx tsx scripts/delete-demo-data.ts` before handoff.

---

### G — App-Specific Risks

**G1. Parking gap data integrity**
The parking gap calculation (expected vs reported) is the app's fraud detection feature.
Verify the gap is computed server-side (from DB values) in DayClosePage, not from
client-side state that could be manipulated. Since this is a single-user app with RLS,
the risk is low — but document the calculation is DB-sourced.

**G2. Password strength**
The current password (`Sandhya@123`) is weak and has been exposed in conversation history.
This must be changed before handoff.
Instructions for Chaitanya:
1. Go to swagath-central.vercel.app
2. Sign in
3. Contact Supabase dashboard → Authentication → Users → Reset password
Alternatively generate a stronger password and update via Supabase dashboard directly.

**G3. Single device assumption**
This app assumes one user on one device. There is no multi-device conflict resolution —
if Chaitanya opens the app on two devices simultaneously and saves different data,
the last write wins. Document this as a known limitation in CLAUDE.md.

---

## Output format

After completing all checks, produce a security report in this format:

```
SWAGATH CENTRAL — SECURITY AUDIT REPORT
Date: {today}

✅ PASS   A1 — No secrets in frontend JavaScript
✅ PASS   A2 — No secrets in git history
✅ PASS   A3 — .gitignore complete
🔧 FIXED  A4 — Source maps disabled in vite.config.ts
...
⚠ RISK   F1 — No Supabase backup (free tier limitation, documented)
...

Issues fixed: X
Known risks documented: Y
Manual actions required: Z (list them)
```

---

## Manual actions that cannot be automated

These require human action — list them clearly at the end:

1. **Change Chaitanya's password** — must be done via Supabase dashboard
2. **Verify GitHub repo is private** — check github.com/PranavCR01/swagath-central
3. **Monthly Supabase export** — set a calendar reminder
4. **Delete DEMO data** before real use — run delete-demo-data.ts
5. **Groq API key in Vercel** — verify it's set in Vercel dashboard env vars (Slice 6)

---

## When done

Update CLAUDE.md: mark Slice 7 as ✅ Complete.
Add session log: date + "Slice 7 — security audit, X issues fixed, Y risks documented"
Commit: `security: slice 7 audit fixes — source maps, rate limiting, session timeout, input sanitization`

**App is now production-ready for a real user.**
