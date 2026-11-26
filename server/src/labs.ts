import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import express, { type Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, LAB_JWT_SECRET } from './config.js';

// Isolated in-memory SQLite database specifically for Web Challenge #2 (SQLi Directory)
const sqliDb = new DatabaseSync(':memory:');
sqliDb.exec(`
  CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE secrets (
    id INTEGER PRIMARY KEY,
    key_name TEXT NOT NULL,
    flag_value TEXT NOT NULL
  );
  INSERT INTO students (id, name, department, email, visible) VALUES
    (1, 'Aarav Sharma', 'CSE', 'aarav.cse@cujammu.ac.in', 1),
    (2, 'Meera Raina', 'CS&IT', 'meera.csit@cujammu.ac.in', 1),
    (3, 'Kabir Dogra', 'MCA', 'kabir.mca@cujammu.ac.in', 1),
    (4, 'Ananya Mahajan', 'ECE', 'ananya.ece@cujammu.ac.in', 1),
    (5, 'Rohan Slathia', 'M.Tech Cyber', 'rohan.cyber@cujammu.ac.in', 1);
  INSERT INTO secrets (id, key_name, flag_value) VALUES
    (1, 'SAMBA_MASTER_FLAG', 'CUJCTF{un10n_sqli_s4mb4_d1r}');
`);

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    result[k] = v;
  }
  return result;
}

function decodeEscapeBytes(raw: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\' && raw[i + 1] === 'x' && /^[0-9a-fA-F]{2}$/.test(raw.slice(i + 2, i + 4))) {
      bytes.push(parseInt(raw.slice(i + 2, i + 4), 16));
      i += 3;
    } else if (raw[i] === '\\' && raw[i + 1] === 'n') {
      bytes.push(0x0a);
      i += 1;
    } else {
      bytes.push(raw.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function labPageShell(title: string, badge: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | CUJ CTF Live Lab</title>
  <style>
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background:#070b11; color:#e2e8f0; }
    .bar { background:#0f1623; border-bottom:1px solid #1e293b; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; }
    .badge { font-family:monospace; font-size:12px; color:#10b981; background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.3); padding:3px 10px; border-radius:999px; }
    .wrap { max-width:860px; margin:32px auto; padding:0 20px; }
    .card { background:#0e1522; border:1px solid #1e293b; border-radius:12px; padding:24px; margin-bottom:20px; }
    h1, h2 { margin-top:0; color:#f8fafc; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#06090f; border:1px solid #1e293b; border-radius:6px; padding:2px 6px; color:#38bdf8; }
    pre { padding:14px; overflow:auto; }
    input, button { font-family:inherit; padding:10px 14px; border-radius:8px; border:1px solid #334155; background:#090d16; color:#f8fafc; }
    button { background:#10b981; color:#04120c; font-weight:700; border:none; cursor:pointer; }
    button:hover { background:#34d399; }
    table { width:100%; border-collapse:collapse; margin-top:14px; font-size:14px; }
    th, td { text-align:left; padding:10px 12px; border-bottom:1px solid #1e293b; }
    th { color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:.05em; }
    a { color:#38bdf8; }
  </style>
</head>
<body>
  <div class="bar">
    <div><strong>CUJ CyberOps Lab</strong> &middot; ${title}</div>
    <span class="badge">${badge}</span>
  </div>
  <div class="wrap">${bodyHtml}</div>
</body>
</html>`;
}

export function createLabsRouter(): Router {
  const router = express.Router();

  // WEB CHALLENGE 1: Faculty Noticeboard Leak
  router.get('/ctf-labs/noticeboard', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (!cookies.cuj_role) {
      res.setHeader('Set-Cookie', 'cuj_role=student; Path=/ctf-labs/noticeboard');
    }
    res.setHeader('X-CUJ-Lab-Hint', 'Inspect robots.txt and your cuj_role cookie before visiting /admin');
    res.send(
      labPageShell(
        'Faculty Noticeboard',
        'WEB-01 • EASY',
        `<!-- Internal Dev Note: Admin portal moved to /ctf-labs/noticeboard/admin. See /ctf-labs/noticeboard/robots.txt -->
        <div class="card">
          <h2>Central University of Jammu — Department Noticeboard</h2>
          <p>Welcome! Your current session role cookie is <code>cuj_role=${cookies.cuj_role || 'student'}</code>.</p>
          <ul>
            <li><strong>[2026-11-26]</strong> CyberOps CTF Finals begin today at 10:00 IST in CS&amp;IT Block.</li>
            <li><strong>[2026-11-25]</strong> Network maintenance scheduled for Rahya-Suchani Hostel Wing B.</li>
            <li><strong>[2026-11-24]</strong> Faculty confidential circulars are hosted on the <a href="/ctf-labs/noticeboard/admin">Admin Console</a>.</li>
          </ul>
        </div>`
      )
    );
  });

  router.get('/ctf-labs/noticeboard/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      `User-agent: *\nDisallow: /ctf-labs/noticeboard/backup-config.json\nDisallow: /ctf-labs/noticeboard/admin\n`
    );
  });

  router.get('/ctf-labs/noticeboard/backup-config.json', (_req, res) => {
    res.json({
      service: 'cuj-noticeboard',
      auth_mechanism: 'cookie',
      cookie_name: 'cuj_role',
      expected_admin_value: 'admin',
      admin_url: '/ctf-labs/noticeboard/admin',
    });
  });

  router.get('/ctf-labs/noticeboard/admin', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.cuj_role === 'admin') {
      res.send(
        labPageShell(
          'Noticeboard Admin Console',
          'ACCESS GRANTED',
          `<div class="card">
            <h2>Classified Faculty Circular</h2>
            <p>Welcome, Administrator! Here is your authorization token:</p>
            <pre>CUJCTF{c00k13_t4mp3r_n0t1c3b04rd}</pre>
          </div>`
        )
      );
      return;
    }
    res.status(403).send(
      labPageShell(
        '403 Forbidden',
        'ACCESS DENIED',
        `<div class="card">
          <h2>403 — Administrator Cookie Required</h2>
          <p>Current <code>cuj_role</code> cookie: <code>${cookies.cuj_role || 'none'}</code>. Only <code>admin</code> is permitted.</p>
          <p><a href="/ctf-labs/noticeboard">Return to Noticeboard</a></p>
        </div>`
      )
    );
  });

  // WEB CHALLENGE 2: Samba Student Directory SQLi
  router.get('/ctf-labs/directory', (_req, res) => {
    res.send(
      labPageShell(
        'Samba Student Directory',
        'WEB-02 • MEDIUM',
        `<div class="card">
          <h2>CUJ Campus Student Lookup</h2>
          <p style="color:#94a3b8;">Search enrolled students by name. Sensitive records are stored in the separate <code>secrets</code> table.</p>
          <form id="f" style="display:flex;gap:10px;margin-top:14px;">
            <input id="q" name="q" placeholder="Search student name (e.g. Aarav)" style="flex:1;" />
            <button type="submit">Search Directory</button>
          </form>
          <pre id="sqlBox" style="margin-top:14px;color:#94a3b8;display:none;"></pre>
          <div id="out"></div>
        </div>
        <script>
          async function runSearch(q) {
            const r = await fetch('/ctf-labs/directory/search?q=' + encodeURIComponent(q));
            const data = await r.json();
            const box = document.getElementById('sqlBox');
            box.style.display = 'block';
            box.textContent = 'Query executed: ' + (data.sql || '');
            if (data.error) {
              document.getElementById('out').innerHTML = '<pre style="color:#f87171;">SQLite Error: ' + data.error + '</pre>';
              return;
            }
            const rows = data.rows || [];
            if (!rows.length) {
              document.getElementById('out').innerHTML = '<p style="color:#94a3b8;">No matching students found.</p>';
              return;
            }
            let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Email</th></tr></thead><tbody>';
            for (const row of rows) {
              html += '<tr><td>' + row.id + '</td><td>' + row.name + '</td><td>' + row.department + '</td><td>' + row.email + '</td></tr>';
            }
            html += '</tbody></table>';
            document.getElementById('out').innerHTML = html;
          }
          document.getElementById('f').addEventListener('submit', (e) => {
            e.preventDefault();
            runSearch(document.getElementById('q').value);
          });
          runSearch('');
        </script>`
      )
    );
  });

  router.get('/ctf-labs/directory/search', (req, res) => {
    const q = String(req.query.q ?? '');
    const sql = `SELECT id, name, department, email FROM students WHERE visible = 1 AND name LIKE '%${q}%'`;
    try {
      const rows = sqliDb.prepare(sql).all();
      res.json({ sql, rows });
    } catch (err) {
      res.status(400).json({ sql, error: err instanceof Error ? err.message : String(err), rows: [] });
    }
  });

  // WEB CHALLENGE 3: Dean's JWT Signature Vault
  router.get('/ctf-labs/vault', (_req, res) => {
    const guestToken = jwt.sign(
      { sub: 'cuj_student', role: 'student', campus: 'Rahya-Suchani' },
      LAB_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '2h' }
    );
    res.send(
      labPageShell(
        "Dean's Signature Vault",
        'WEB-03 • HARD',
        `<div class="card">
          <h2>CUJ Dean's Classified Flag Vault</h2>
          <p>Authentication uses <strong>HS256 JWT</strong>. Only a token with <code>"role": "dean"</code> can unlock <code>/ctf-labs/vault/flag</code>.</p>
          <p>Your provisioned student JWT:</p>
          <pre id="tok">${guestToken}</pre>
          <p style="font-size:13px;color:#94a3b8;">Policy note: <a href="/ctf-labs/vault/hint">/ctf-labs/vault/hint</a></p>
          <div style="display:flex;gap:10px;margin-top:14px;">
            <input id="jwtInput" value="${guestToken}" style="flex:1;" />
            <button id="unlockBtn">Unlock Vault</button>
          </div>
          <pre id="vaultRes" style="margin-top:14px;">Awaiting authorization check...</pre>
        </div>
        <script>
          document.getElementById('unlockBtn').addEventListener('click', async () => {
            const t = document.getElementById('jwtInput').value.trim();
            const r = await fetch('/ctf-labs/vault/flag', {
              headers: { Authorization: 'Bearer ' + t }
            });
            const data = await r.json();
            document.getElementById('vaultRes').textContent = JSON.stringify(data, null, 2);
          });
        </script>`
      )
    );
  });

  router.get('/ctf-labs/vault/hint', (_req, res) => {
    res.json({
      algorithm: 'HS256',
      signing_secret_hint: 'Lowercase 3-letter university acronym (cuj) followed by competition year (2026)',
      required_claim: { role: 'dean' },
    });
  });

  router.all('/ctf-labs/vault/flag', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : String(req.query.token || '');
    if (!token) {
      res.status(401).json({ error: 'Missing Bearer JWT token.' });
      return;
    }
    try {
      const payload = jwt.verify(token, LAB_JWT_SECRET, { algorithms: ['HS256'] }) as { role?: string; sub?: string };
      if (payload.role !== 'dean') {
        res.status(403).json({
          error: `Insufficient role '${payload.role || 'none'}'. Expected role: 'dean'.`,
          decoded: payload,
        });
        return;
      }
      res.json({
        access: 'GRANTED',
        decoded: payload,
        flag: 'CUJCTF{jwt_w34k_s3cr3t_f0rg3ry}',
      });
    } catch (err) {
      res.status(401).json({ error: 'Invalid JWT signature or malformed token.', detail: err instanceof Error ? err.message : '' });
    }
  });

  // PWN LAB 1: Overflow Gradebook
  router.post('/api/labs/pwn/gradebook', (req, res) => {
    const rawInput = String(req.body?.input ?? '');
    const inputBuf = decodeEscapeBytes(rawInput);

    const frame = Buffer.alloc(36, 0);
    const copyLen = Math.min(inputBuf.length, 36);
    inputBuf.copy(frame, 0, 0, copyLen);

    const namePreview = frame.subarray(0, 32).toString('utf8').replace(/\0/g, '');
    const isAdmin = frame.readUInt32LE(32);

    if (isAdmin === 0x43554a21) {
      res.json({
        pwned: true,
        isAdminHex: `0x${isAdmin.toString(16).padStart(8, '0')}`,
        output: [
          'CUJ Gradebook Service v1.0',
          `[mem] student_name[32] filled (${Math.min(inputBuf.length, 32)} bytes), overflow=${Math.max(0, inputBuf.length - 32)} bytes`,
          `[mem] is_admin = 0x${isAdmin.toString(16).padStart(8, '0')} (MATCH!)`,
          '[+] Admin override unlocked!',
          '$ cat /flag.txt',
          'CUJCTF{st4ck_fr4m3_0v3rfl0w_cuj}',
        ].join('\n'),
      });
      return;
    }

    res.json({
      pwned: false,
      isAdminHex: `0x${isAdmin.toString(16).padStart(8, '0')}`,
      output: [
        'CUJ Gradebook Service v1.0',
        `Hello ${namePreview || '(empty)'}`,
        `[mem] is_admin = 0x${isAdmin.toString(16).padStart(8, '0')} (expected 0x43554a21)`,
      ].join('\n'),
    });
  });

  // PWN LAB 2: Format Inspector Leak
  const PWN2_FLAG = 'CUJCTF{f0rm4t_str1ng_st4ck_l34k}';
  const stackSlots: Record<number, string> = {
    1: '0x00007fffffffe420',
    2: '0x0000000000000080',
    3: '0x00007ffff7dd18e0',
    4: '0x0000555555555240',
    5: '0xdeadbeefcafebabe',
  };
  const flagBuf = Buffer.from(PWN2_FLAG, 'utf8');
  for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
    const chunk = flagBuf.subarray(slotIdx * 8, (slotIdx + 1) * 8);
    const val = chunk.readBigUInt64LE(0);
    stackSlots[6 + slotIdx] = `0x${val.toString(16).padStart(16, '0')}`;
  }
  stackSlots[10] = '0x00007fffffffe510';
  stackSlots[11] = '0x00005555555551a9';

  router.post('/api/labs/pwn/inspector', (req, res) => {
    const raw = String(req.body?.input ?? '').slice(0, 200);
    let seqSlot = 1;
    let tokenCount = 0;
    const output = raw.replace(/%(?:(\d+)\$)?(llx|lx|p|x)/g, (_m, posStr, spec) => {
      if (tokenCount >= 32) return '[TRUNCATED]';
      tokenCount++;
      const slot = posStr ? Number(posStr) : seqSlot++;
      const hexVal = stackSlots[slot] || '0x0000000000000000';
      if (spec === 'p') return hexVal;
      return hexVal.replace(/^0x0*/, '') || '0';
    });

    res.json({
      output: `CUJ Memory Format Inspector\nDiagnostic output:\n${output}`,
    });
  });

  // MISC LAB 1: Stateless Signed Proof-of-Work Gauntlet (Works across serverless containers!)
  router.get('/api/labs/misc/hash-gauntlet/start', (_req, res) => {
    const prefix = `cuj_${crypto.randomBytes(6).toString('hex')}_`;
    const target = '0000';
    const challengeId = jwt.sign({ kind: 'pow', prefix, target }, JWT_SECRET, { expiresIn: '20s' });

    res.json({
      challengeId,
      prefix,
      targetHexPrefix: target,
      instruction: `Find any string nonce such that SHA256("${prefix}" + nonce) starts with "${target}" within 20 seconds.`,
      submitEndpoint: '/api/labs/misc/hash-gauntlet/verify',
      expiresInSeconds: 20,
    });
  });

  router.post('/api/labs/misc/hash-gauntlet/verify', (req, res) => {
    const challengeId = String(req.body?.challengeId ?? '');
    const nonce = String(req.body?.nonce ?? '');
    if (!challengeId) {
      res.status(400).json({ error: 'Missing challengeId. Call /start first.' });
      return;
    }

    let decoded: { kind?: string; prefix?: string; target?: string };
    try {
      decoded = jwt.verify(challengeId, JWT_SECRET) as { kind?: string; prefix?: string; target?: string };
    } catch {
      res.status(408).json({ error: 'Challenge token expired or invalid (>20s). Request a fresh prefix.' });
      return;
    }
    if (decoded.kind !== 'pow' || !decoded.prefix || !decoded.target) {
      res.status(400).json({ error: 'Invalid challenge token.' });
      return;
    }

    const digest = crypto.createHash('sha256').update(decoded.prefix + nonce).digest('hex');
    if (!digest.startsWith(decoded.target)) {
      res.status(400).json({ error: `SHA256 mismatch: got ${digest.slice(0, 12)}..., expected prefix ${decoded.target}` });
      return;
    }
    res.json({
      success: true,
      digest,
      flag: 'CUJCTF{pr00f_0f_w0rk_sp33d_run}',
    });
  });

  return router;
}
