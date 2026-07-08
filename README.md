# PrintHub

College print-management system. Students upload a document, choose print
options, pay via UPI/GPay, and submit proof of payment. An admin manually
confirms the payment and approves the job (from the dashboard or a one-click
email link) before it joins a live FIFO print queue. Staff work the queue.

## Stack

- **Server**: Node/Express, SQLite (`better-sqlite3`), session-based auth
- **Client**: React (Vite), plain CSS design system (no UI framework)
- **Storage**: uploaded documents/screenshots on disk under `server/uploads/`

## Quick start

```bash
npm run install:all   # installs server + client dependencies
npm run dev            # builds the client, then starts the server (both on one port)
```

The server prints the URL it's listening on, e.g. `http://localhost:4000`.
To reach it from another device on the same wifi (a student's phone, say),
find this machine's LAN IP (`ipconfig` on Windows) and visit
`http://<that-ip>:4000` from the other device — the same Express server
serves the API and the built React app together on one port, so there's
nothing else to configure.

Two demo accounts each for Admin and Staff are seeded on first run and
printed to the server console (also listed below). Passwords are stored
**in plain text** for this local-testing build — every place that touches
them has a `TODO: replace with bcrypt hashing before any real deployment`
comment.

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin1@printhub.local    | admin123  |
| Admin | admin2@printhub.local    | admin123  |
| Staff | staff1@printhub.local    | staff123  |
| Staff | staff2@printhub.local    | staff123  |

### Other scripts

- `npm run build` — just builds the client to `client/dist`
- `npm start` — same as `npm run dev` (build + serve), intended as the
  "real" run command
- `npm run dev:watch` — two-process hot-reload workflow for actively
  developing the frontend (Vite dev server + nodemon). **Only bound to
  localhost** — the Vite/esbuild dev server has a known CORS vulnerability
  (GHSA-67mh-4wv8-2f99) that makes it unsafe to expose on a LAN, so this
  mode is for the operator's own machine only, not for testing from other
  devices. Use `npm run dev`/`npm start` for that.

## Configuration

Copy `.env.example` to `server/.env` (already done once for you) and fill in
real values as they become available. Every value has a safe fallback so the
whole flow is testable without them:

- `ADMIN_EMAIL` — where approval-request emails go. Currently set to
  `alexabrahametc@gmail.com` for testing; change this one line when ready,
  no code changes needed.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — real email sending
  via `nodemailer`. Until all four are set, every email is logged to the
  **server console** instead, so admin notifications and approval/rejection
  emails are all still visible and the flow is fully testable end to end.
- `PAYMENT_QR_IMAGE` — path (relative to `server/`) to the static UPI/GPay
  QR code image shown in Step 3. Defaults to `uploads/payment-qr.png`,
  which doesn't exist yet — drop the real QR image there (or update the env
  var to point elsewhere) and it'll show up automatically.
- `SESSION_SECRET` — change this if deploying anywhere beyond local testing.

## How approval works

Submitting Step 3 (payment proof) creates the job as `pending_approval` and
sends one email to `ADMIN_EMAIL` containing the student's details, print
options, payment screenshot, UPI reference, and two single-use links —
Approve and Reject. Each is a random UUID token tied to that job, valid for
24 hours or until used, whichever comes first. The exact same job also shows
up in the Admin dashboard's Pending Approval list with the same two actions.
Whichever path is used first wins — the other shows "already actioned."

On approval, the job is inserted into the FIFO queue, its position and an
expected pickup time (`position × 10 minutes` from now) are calculated, and
the student is emailed their queue position + pickup time + a status link.
Whenever a job ahead in the queue finishes/fails, everyone behind it gets
recomputed automatically (both in the database and on the student's
status-check page).

## Known limitations (by design, for this local-testing build)

- Passwords are plain text (flagged throughout, see table above).
- Page counting for legacy `.doc` files has no reliable free parser and
  falls back to a fixed estimate of 1 page. `.docx` page counts come from
  Word's own saved `<Pages>` metadata when present, falling back to a
  word-count estimate otherwise. PDF page counts are exact.
- The admin-notification email links to the document/screenshot rather than
  attaching them, to avoid SMTP attachment-size limits on 50MB uploads.
