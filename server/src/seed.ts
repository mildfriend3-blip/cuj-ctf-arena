import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './auth.js';
import { ARTIFACTS_DIR } from './config.js';
import { db, getSetting, initSchema, setSetting } from './db.js';

function artifactMeta(relPath: string, displayName: string) {
  const full = path.join(ARTIFACTS_DIR, relPath);
  let size = 0;
  let sha256 = '';
  if (fs.existsSync(full)) {
    const buf = fs.readFileSync(full);
    size = buf.length;
    sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  }
  return { path: relPath, name: displayName, size, sha256 };
}

interface SeedChallenge {
  slug: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  description: string;
  author: string;
  flag_value: string;
  initial_points: number;
  min_points: number;
  decay: number;
  first_blood_bonus: number;
  lab_type: 'none' | 'web' | 'pwn' | 'misc';
  lab_url: string;
  artifacts: Array<{ path: string; name: string; size: number; sha256: string }>;
  tags: string[];
  writeup: string;
  sort_order: number;
  hints: Array<{ content: string; cost: number }>;
}

let readyPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!readyPromise) {
    readyPromise = runSeed().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

async function runSeed(): Promise<void> {
  await initSchema();
  const alreadySeeded = await getSetting('seeded_v1', '0');
  if (alreadySeeded === '1') return;

  const now = Date.now();
  const startsAt = new Date(now - 6 * 3600 * 1000).toISOString();
  const endsAt = new Date(now + 42 * 3600 * 1000).toISOString();

  await setSetting('competition_name', 'CUJ CyberOps CTF 2026');
  await setSetting('university_name', 'Central University of Jammu');
  await setSetting('subtitle', 'Inter-Departmental Capture The Flag Arena • Rahya-Suchani Campus');
  await setSetting('status', 'live');
  await setSetting('starts_at', startsAt);
  await setSetting('ends_at', endsAt);
  await setSetting('max_team_size', '4');
  await setSetting('scoreboard_frozen', '0');
  await setSetting('freeze_at', '');
  await setSetting('writeups_unlocked', '0');
  await setSetting('registration_open', '1');
  await setSetting('dynamic_scoring', '1');

  const challenges: SeedChallenge[] = [
    {
      slug: 'shivalik-xor',
      title: 'Shivalik Shift & XOR',
      category: 'Crypto',
      difficulty: 'Easy',
      author: 'Prof. V. Khajuria (CS&IT)',
      description: `An encrypted telemetry message was captured from Shivalik Relay Node #04.\n\nOur intelligence indicates the message was encrypted with a repeating **4-byte XOR key** and then Base64-encoded. We also know all competition flags begin with \`CUJCTF{\`.\n\nUse a known-plaintext crib attack to recover the key and decrypt the flag.`,
      flag_value: 'CUJCTF{x0r_cr1b_dr4gg1ng_m4st3r}',
      initial_points: 250,
      min_points: 100,
      decay: 12,
      first_blood_bonus: 25,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('crypto/shivalik_cipher.txt', 'shivalik_cipher.txt')],
      tags: ['xor', 'crib-dragging', 'base64'],
      writeup: 'Base64-decode the ciphertext, XOR the first 4 bytes against `CUJCTF{` to recover the repeating 4-byte key `CUJ!`, then XOR the full byte string.',
      sort_order: 10,
      hints: [
        { content: 'Base64 decode the line at the bottom of the file first.', cost: 15 },
        { content: 'XOR the first 4 decoded bytes with `b"CUJC"` to extract the 4-byte key!', cost: 30 },
      ],
    },
    {
      slug: 'jammu-rsa-vault',
      title: 'Jammu RSA Vault',
      category: 'Crypto',
      difficulty: 'Medium',
      author: 'CUJ CyberSec Cell',
      description: `Two campus signing keypairs (\`n1\`, \`n2\`) were generated on the same legacy microcontroller right after boot. Unfortunately, the entropy pool repeated one of its large prime factors across both moduli.\n\nCan you break \`n1\` without factoring it via brute force and decrypt \`ciphertext_n1\`?`,
      flag_value: 'CUJCTF{sh4r3d_pr1m3_gcd_br34k}',
      initial_points: 400,
      min_points: 125,
      decay: 12,
      first_blood_bonus: 35,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('crypto/rsa_vault.json', 'rsa_vault.json')],
      tags: ['rsa', 'gcd', 'number-theory'],
      writeup: 'Compute `p = math.gcd(n1, n2)`. Then `q1 = n1 // p`, `phi = (p - 1) * (q1 - 1)`, `d = pow(e, -1, phi)`, and `m = pow(c, d, n1)`.',
      sort_order: 20,
      hints: [
        { content: 'What happens if two RSA moduli share a prime factor? Look at Euclidean algorithms.', cost: 25 },
        { content: 'Compute `p = math.gcd(n1, n2)` in Python.', cost: 50 },
      ],
    },
    {
      slug: 'tawi-prng-stream',
      title: 'Tawi PRNG Stream',
      category: 'Crypto',
      difficulty: 'Hard',
      author: 'R. Jamwal',
      description: `The Tawi sensor network encrypts its JSON telemetry using a custom 24-bit Linear Congruential Generator (LCG) stream cipher.\n\nWe obtained a copy of the generator source (\`tawi_stream.py\`) and an encrypted packet (\`encrypted_stream.bin\`). Every JSON telemetry packet starts with \`{"dept":\`.\n\nRecover the internal LCG state and decrypt the full JSON payload.`,
      flag_value: 'CUJCTF{lcg_st4t3_r3c0v3ry_t4w1}',
      initial_points: 500,
      min_points: 150,
      decay: 10,
      first_blood_bonus: 50,
      lab_type: 'none',
      lab_url: '',
      artifacts: [
        artifactMeta('crypto/tawi_stream.py', 'tawi_stream.py'),
        artifactMeta('crypto/encrypted_stream.bin', 'encrypted_stream.bin'),
      ],
      tags: ['lcg', 'prng', 'stream-cipher'],
      writeup: 'XOR the first 8 ciphertext bytes with `b\'{"dept":\'` to reveal the first 8 keystream bytes. The upper 8 bits of the 24-bit state equal `ks[0]`, leaving only `2^16 = 65536` candidates for the lower 16 bits. Validate against `ks[1..7]` and decrypt the stream.',
      sort_order: 30,
      hints: [
        { content: 'XOR `encrypted_stream.bin[:8]` with `b\'{"dept":\'` to recover the first 8 keystream bytes.', cost: 35 },
        { content: 'Because `state` is 24 bits and `(state >> 16) & 0xFF` is leaked directly, there are only 65,536 possible initial states after step 1.', cost: 75 },
      ],
    },
    {
      slug: 'rahya-campus-banner',
      title: 'Rahya Campus Banner',
      category: 'Stego',
      difficulty: 'Easy',
      author: 'A. Sharma',
      description: `A promotional cyber banner for the Rahya-Suchani campus node looks completely normal in an image viewer — yet its file size is slightly larger than expected.\n\nInspect the PNG structure and metadata carefully.`,
      flag_value: 'CUJCTF{b3y0nd_th3_i3nd_chunk}',
      initial_points: 250,
      min_points: 100,
      decay: 14,
      first_blood_bonus: 25,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('stego/rahya_campus.png', 'rahya_campus.png')],
      tags: ['png', 'iend', 'strings', 'base64'],
      writeup: 'Inspecting PNG chunks or running `strings` reveals Base64 data appended right after the `IEND` chunk. Decoding it yields the flag.',
      sort_order: 40,
      hints: [{ content: 'Check the PNG `tEXt` metadata chunk or inspect bytes after `IEND`.', cost: 20 }],
    },
    {
      slug: 'pixel-matrix-lsb',
      title: 'Pixelated Matrix LSB',
      category: 'Stego',
      difficulty: 'Medium',
      author: 'M. Raina',
      description: `A suspicious cyber-art PNG was found on a lab workstation. No trailing bytes or suspicious EXIF metadata appear.\n\nInvestigate the **Least Significant Bits (LSB)** of the pixel color channels in row-major order.`,
      flag_value: 'CUJCTF{lsb_rgb_p1x3l_wh1sp3r}',
      initial_points: 375,
      min_points: 120,
      decay: 12,
      first_blood_bonus: 35,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('stego/pixel_matrix.png', 'pixel_matrix.png')],
      tags: ['lsb', 'pillow', 'image-stego'],
      writeup: 'Extract bit 0 (`b & 1`) from the Blue channel of every pixel in row-major order, group into 8-bit MSB-first bytes, and decode ASCII until `###END###`.',
      sort_order: 50,
      hints: [
        { content: 'Focus exclusively on the Blue channel `(r, g, b)` -> `b & 1`.', cost: 30 },
        { content: 'Bits are packed MSB-first (big-endian bit order per byte) in row-major pixel order.', cost: 50 },
      ],
    },
    {
      slug: 'echoes-of-chenab',
      title: 'Echoes of Chenab',
      category: 'Stego',
      difficulty: 'Hard',
      author: 'CUJ CyberSec Cell',
      description: `An acoustic beacon recording (\`chenab_signal.wav\`) plays a calm harmonic chord — but something digital rides silently inside the 16-bit PCM sample stream.\n\nRecover the hidden payload embedded inside the audio samples.`,
      flag_value: 'CUJCTF{w4v_pcm_lsb_fr3qu3ncy}',
      initial_points: 475,
      min_points: 150,
      decay: 10,
      first_blood_bonus: 50,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('stego/chenab_signal.wav', 'chenab_signal.wav')],
      tags: ['wav', 'audio-stego', 'pcm-lsb'],
      writeup: 'Read raw 16-bit signed PCM frames via Python `wave` + `struct.unpack("<h", ...)`, extract `(sample & 1)` across frames, and assemble 8-bit MSB-first bytes.',
      sort_order: 60,
      hints: [{ content: 'This is spatial-domain audio steganography — check the LSB of each 16-bit PCM sample.', cost: 40 }],
    },
    {
      slug: 'lost-drone-samba',
      title: 'Lost Drone Over Samba',
      category: 'OSINT',
      difficulty: 'Easy',
      author: 'S. Dogra',
      description: `An autonomous campus survey drone uploaded a single reconnaissance JPEG before losing telemetry near the Samba perimeter.\n\nExamine the photo's embedded camera & pilot metadata to determine where it flew and uncover the pilot's leaked authentication token.`,
      flag_value: 'CUJCTF{3x1f_gps_r4hy4_such4n1}',
      initial_points: 275,
      min_points: 100,
      decay: 14,
      first_blood_bonus: 25,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('osint/drone_capture.jpg', 'drone_capture.jpg')],
      tags: ['exif', 'metadata', 'base64', 'geoint'],
      writeup: 'Inspect EXIF tags (`exiftool` or Pillow `.getexif()`). The `Artist` tag (`0x013B`) contains a Base64 `SecretToken` decoding to the flag.',
      sort_order: 70,
      hints: [{ content: 'Run `exiftool` or inspect JPEG EXIF tags with Python Pillow (`img.getexif()`).', cost: 20 }],
    },
    {
      slug: 'ghost-committer-dossier',
      title: 'Ghost Committer Dossier',
      category: 'OSINT',
      difficulty: 'Medium',
      author: 'CUJ DevSecOps',
      description: `We recovered a zipped Git repository bundle for an internal CUJ Student Portal deployment. The maintainers say they scrubbed all credentials before going live — did they really?\n\nAudit the complete repository history.`,
      flag_value: 'CUJCTF{g1t_h1st0ry_n3v3r_f0rg3ts}',
      initial_points: 350,
      min_points: 120,
      decay: 12,
      first_blood_bonus: 35,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('osint/cuj_portal_repo_bundle.zip', 'cuj_portal_repo_bundle.zip')],
      tags: ['git', 'secrets', 'recon', 'devops'],
      writeup: 'Unzip the archive and run `git log -p --all`. Commit #2 committed `.env.staging` containing `ADMIN_OVERRIDE_FLAG` before commit #3 deleted it.',
      sort_order: 80,
      hints: [{ content: 'Deleted files remain in Git commit snapshots forever unless history is rewritten.', cost: 25 }],
    },
    {
      slug: 'faculty-noticeboard',
      title: 'Faculty Noticeboard Leak',
      category: 'Web',
      difficulty: 'Easy',
      author: 'CUJ WebSec Team',
      description: `The CS&IT Faculty Noticeboard restricts confidential circulars to administrators. Launch the live web target, enumerate hidden paths and HTTP headers/cookies, and access the Admin Console.`,
      flag_value: 'CUJCTF{c00k13_t4mp3r_n0t1c3b04rd}',
      initial_points: 250,
      min_points: 100,
      decay: 15,
      first_blood_bonus: 25,
      lab_type: 'web',
      lab_url: '/ctf-labs/noticeboard',
      artifacts: [],
      tags: ['cookies', 'robots.txt', 'recon'],
      writeup: 'Check `/ctf-labs/noticeboard/robots.txt` and `/backup-config.json`, then modify cookie `cuj_role=admin` and request `/ctf-labs/noticeboard/admin`.',
      sort_order: 90,
      hints: [{ content: 'Open DevTools -> Network / Application Cookies and check `/ctf-labs/noticeboard/robots.txt`.', cost: 20 }],
    },
    {
      slug: 'samba-directory-sqli',
      title: 'Samba Student Directory',
      category: 'Web',
      difficulty: 'Medium',
      author: 'CUJ WebSec Team',
      description: `The campus student lookup directory dynamically filters SQL queries against a SQLite database. Sensitive flags are stored in a separate table named \`secrets\`.\n\nExploit the search endpoint to extract the classified flag from \`secrets\`.`,
      flag_value: 'CUJCTF{un10n_sqli_s4mb4_d1r}',
      initial_points: 400,
      min_points: 125,
      decay: 12,
      first_blood_bonus: 40,
      lab_type: 'web',
      lab_url: '/ctf-labs/directory',
      artifacts: [],
      tags: ['sqli', 'sqlite', 'union-select'],
      writeup: "Submit `' UNION SELECT id, key_name, flag_value, 'ok' FROM secrets--` into the search input.",
      sort_order: 100,
      hints: [
        { content: 'The original `SELECT` returns 4 columns (`id, name, department, email`).', cost: 30 },
        { content: "Try `' UNION SELECT 1, key_name, flag_value, 'x' FROM secrets--`.", cost: 60 },
      ],
    },
    {
      slug: 'deans-jwt-vault',
      title: "Dean's JWT Signature Vault",
      category: 'Web',
      difficulty: 'Hard',
      author: 'CUJ WebSec Team',
      description: `The Dean's Vault issues HS256 JSON Web Tokens to students with \`"role": "student"\`. Only a validly signed token carrying \`"role": "dean"\` can unlock \`/ctf-labs/vault/flag\`.\n\nInspect the token policy hint, crack or derive the weak HMAC secret, and forge a Dean token.`,
      flag_value: 'CUJCTF{jwt_w34k_s3cr3t_f0rg3ry}',
      initial_points: 500,
      min_points: 150,
      decay: 10,
      first_blood_bonus: 50,
      lab_type: 'web',
      lab_url: '/ctf-labs/vault',
      artifacts: [],
      tags: ['jwt', 'hmac', 'cryptanalysis'],
      writeup: 'Visit `/ctf-labs/vault/hint`, derive the HS256 secret `cuj2026`, sign a new JWT payload `{ "role": "dean" }`, and call `/ctf-labs/vault/flag`.',
      sort_order: 110,
      hints: [{ content: 'Check `/ctf-labs/vault/hint` for the password policy used to sign HS256 tokens.', cost: 35 }],
    },
    {
      slug: 'gatekeeper-license',
      title: 'Gatekeeper License Check',
      category: 'Rev',
      difficulty: 'Easy',
      author: 'K. Thakur',
      description: `Download \`gatekeeper.py\` and reverse the character transformation inside \`check_license()\` to recover the exact master license key.`,
      flag_value: 'CUJCTF{r3v_b1tw1s3_g4t3k33p3r}',
      initial_points: 275,
      min_points: 100,
      decay: 14,
      first_blood_bonus: 25,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('rev/gatekeeper.py', 'gatekeeper.py')],
      tags: ['python', 'bitwise', 'license-key'],
      writeup: 'Invert `((ord(ch) ^ 0x55) + idx * 3) & 0xFF == target` via `chr(((val - idx * 3) & 0xFF) ^ 0x55)`.',
      sort_order: 120,
      hints: [{ content: 'Reverse the operations in opposite order: subtract `idx * 3` mod 256, then XOR with `0x55`.', cost: 20 }],
    },
    {
      slug: 'bytecode-vm-lock',
      title: 'Bytecode VM Lock',
      category: 'Rev',
      difficulty: 'Hard',
      author: 'K. Thakur',
      description: `This authentication gate implements a custom register-based Virtual Machine with rotate-left (\`ROL3\`), position-dependent XOR, and modular addition instructions.\n\nDisassemble \`PROGRAM\` inside \`vm_lock.py\` and invert the VM pipeline to unlock the flag.`,
      flag_value: 'CUJCTF{cust0m_vm_byt3c0d3_pwn3d}',
      initial_points: 500,
      min_points: 150,
      decay: 10,
      first_blood_bonus: 50,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('rev/vm_lock.py', 'vm_lock.py')],
      tags: ['vm', 'bytecode', 'reverse-engineering'],
      writeup: 'Invert each byte of `EXPECTED`: subtract 19 mod 256, XOR with `(0xA7 + idx) & 0xFF`, then rotate right by 3 bits.',
      sort_order: 130,
      hints: [{ content: 'The inverse of 8-bit `ROL(x, 3)` is `ROR(x, 3)` = `((x >> 3) | (x << 5)) & 0xFF`.', cost: 40 }],
    },
    {
      slug: 'overflow-gradebook',
      title: 'Overflow Gradebook',
      category: 'Pwn',
      difficulty: 'Medium',
      author: 'CUJ Systems Lab',
      description: `Inspect \`gradebook.c\`. The \`StudentFrame\` struct places \`uint32_t is_admin\` directly after a 32-byte \`student_name\` buffer, and reads input with an unbounded \`gets()\`.\n\nUse the **Interactive Pwn Terminal** right inside this challenge to overflow \`student_name\` and overwrite \`is_admin\` with \`0x43554a21\` (little-endian).`,
      flag_value: 'CUJCTF{st4ck_fr4m3_0v3rfl0w_cuj}',
      initial_points: 400,
      min_points: 125,
      decay: 12,
      first_blood_bonus: 40,
      lab_type: 'pwn',
      lab_url: '/api/labs/pwn/gradebook',
      artifacts: [artifactMeta('pwn/gradebook.c', 'gradebook.c')],
      tags: ['bof', 'stack-overflow', 'little-endian'],
      writeup: 'Send 32 padding bytes followed by `0x43554a21` in little-endian (`\\x21\\x4a\\x55\\x43`, or `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!JUC`).',
      sort_order: 140,
      hints: [{ content: 'Remember x86/x64 is little-endian: `0x43554a21` in memory bytes is `\\x21\\x4a\\x55\\x43`.', cost: 30 }],
    },
    {
      slug: 'format-inspector-leak',
      title: 'Format Inspector Leak',
      category: 'Pwn',
      difficulty: 'Hard',
      author: 'CUJ Systems Lab',
      description: `The diagnostic service \`inspector.c\` passes user input directly as the format string to \`printf(user_input)\`. The 32-byte flag is sitting right on the stack in 64-bit little-endian hex chunks across slots 6 through 9.\n\nUse the **Interactive Pwn Terminal** to leak the stack memory and decode the flag.`,
      flag_value: 'CUJCTF{f0rm4t_str1ng_st4ck_l34k}',
      initial_points: 500,
      min_points: 150,
      decay: 10,
      first_blood_bonus: 50,
      lab_type: 'pwn',
      lab_url: '/api/labs/pwn/inspector',
      artifacts: [artifactMeta('pwn/inspector.c', 'inspector.c')],
      tags: ['format-string', 'memory-leak', 'stack'],
      writeup: 'Send `%6$p.%7$p.%8$p.%9$p` in the Pwn terminal, convert each 64-bit hex word from little-endian bytes to ASCII, and concatenate.',
      sort_order: 150,
      hints: [{ content: 'Try positional format specifiers like `%6$p %7$p %8$p %9$p`.', cost: 35 }],
    },
    {
      slug: 'rogue-packet-capture',
      title: 'Rogue Packet Capture',
      category: 'Forensics',
      difficulty: 'Medium',
      author: 'CUJ NOC Team',
      description: `Our campus intrusion detection sensor captured a short PCAP (\`campus_traffic.pcap\`) during a suspected data exfiltration incident.\n\nInspect the TCP streams in Wireshark, \`tshark\`, or Python to reassemble the exfiltrated data.`,
      flag_value: 'CUJCTF{pc4p_tcp_str34m_f0r3ns1cs}',
      initial_points: 375,
      min_points: 120,
      decay: 12,
      first_blood_bonus: 35,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('forensics/campus_traffic.pcap', 'campus_traffic.pcap')],
      tags: ['pcap', 'wireshark', 'http', 'network-forensics'],
      writeup: 'Filter HTTP/TCP packets targeting `exfil.cuj-lab:8080`, concatenate `X-Exfil-Chunk-1..3` in order, and Base64 decode.',
      sort_order: 160,
      hints: [{ content: 'Look for non-standard `X-Exfil-Chunk-*` HTTP headers across three packets.', cost: 25 }],
    },
    {
      slug: 'corrupted-png-evidence',
      title: 'Corrupted PNG Evidence',
      category: 'Forensics',
      difficulty: 'Medium',
      author: 'CUJ Forensics Unit',
      description: `An evidence badge image (\`corrupted_badge.bin\`) refuses to open in any image viewer because its file header was wiped.\n\nIdentify the true file format from its internal chunk structure, repair its magic bytes, and extract the badge flag.`,
      flag_value: 'CUJCTF{m4g1c_byt3s_h3x_r3p41r}',
      initial_points: 350,
      min_points: 110,
      decay: 14,
      first_blood_bonus: 30,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('forensics/corrupted_badge.bin', 'corrupted_badge.bin')],
      tags: ['magic-bytes', 'hex-editing', 'png'],
      writeup: 'The `IHDR` chunk at offset 12 reveals this is a PNG. Replace the first 8 bytes (`00 00 00 00 44 45 41 44`) with the PNG signature `89 50 4E 47 0D 0A 1A 0A` and open the repaired PNG.',
      sort_order: 170,
      hints: [{ content: 'Inspect the first 32 bytes in hex — notice `IHDR` starting at offset 12.', cost: 25 }],
    },
    {
      slug: 'rapid-hash-gauntlet',
      title: 'Rapid Hash Gauntlet',
      category: 'Misc',
      difficulty: 'Medium',
      author: 'CUJ Algo Club',
      description: `Solve a live Proof-of-Work challenge against the server within **20 seconds**! Request a random prefix from \`/api/labs/misc/hash-gauntlet/start\`, find a nonce such that \`SHA256(prefix + nonce)\` begins with \`0000\`, and POST it to \`/verify\`.\n\nUse the **Interactive Gauntlet Runner** inside this challenge or script it in Python!`,
      flag_value: 'CUJCTF{pr00f_0f_w0rk_sp33d_run}',
      initial_points: 350,
      min_points: 110,
      decay: 14,
      first_blood_bonus: 30,
      lab_type: 'misc',
      lab_url: '/api/labs/misc/hash-gauntlet/start',
      artifacts: [],
      tags: ['ppc', 'sha256', 'automation'],
      writeup: 'Fetch `/api/labs/misc/hash-gauntlet/start`, iterate integer nonces until `hashlib.sha256((prefix + str(i)).encode()).hexdigest().startswith("0000")`, and POST `{challengeId, nonce}`.',
      sort_order: 180,
      hints: [{ content: '4 leading hex zeros only takes ~65,536 SHA-256 hashes (< 50ms in Python or browser JS).', cost: 20 }],
    },
    {
      slug: 'matryoshka-encoding',
      title: 'Matryoshka Encoding',
      category: 'Misc',
      difficulty: 'Easy',
      author: 'CUJ Algo Club',
      description: `Like nested Russian dolls, this payload passed through five reversible encoding/compression stages: **Hex → Base64 → zlib → Base85 → ROT13**.\n\nPeel each layer cleanly in reverse order to reveal the flag.`,
      flag_value: 'CUJCTF{m4try0shk4_d3c0d3_l4y3rs}',
      initial_points: 250,
      min_points: 100,
      decay: 15,
      first_blood_bonus: 25,
      lab_type: 'none',
      lab_url: '',
      artifacts: [artifactMeta('misc/matryoshka_payload.txt', 'matryoshka_payload.txt')],
      tags: ['encoding', 'zlib', 'base85', 'rot13'],
      writeup: 'Decode in reverse: `bytes.fromhex` -> `base64.b64decode` -> `zlib.decompress` -> `base64.b85decode` -> `codecs.decode(..., "rot_13")`.',
      sort_order: 190,
      hints: [{ content: 'Start with `bytes.fromhex(payload)` in Python.', cost: 15 }],
    },
  ];

  const challengeIdBySlug = new Map<string, number>();
  for (const c of challenges) {
    const res = await db.run(
      `INSERT INTO challenges (
        slug, title, category, difficulty, description, author, flag_value,
        initial_points, min_points, decay, is_dynamic, first_blood_bonus,
        lab_type, lab_url, artifacts_json, tags_json, writeup, published, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?)`,
      c.slug,
      c.title,
      c.category,
      c.difficulty,
      c.description,
      c.author,
      c.flag_value,
      c.initial_points,
      c.min_points,
      c.decay,
      c.first_blood_bonus,
      c.lab_type,
      c.lab_url,
      JSON.stringify(c.artifacts),
      JSON.stringify(c.tags),
      c.writeup,
      c.sort_order
    );
    const chId = res.lastInsertRowid;
    challengeIdBySlug.set(c.slug, chId);
    for (let idx = 0; idx < c.hints.length; idx++) {
      await db.run(
        'INSERT INTO hints (challenge_id, order_idx, content, cost) VALUES (?, ?, ?, ?)',
        chId,
        idx + 1,
        c.hints[idx].content,
        c.hints[idx].cost
      );
    }
  }

  const seedTeams = [
    { name: 'Shivalik Rootkits', tag: 'SHVK', department: 'CSE / CS&IT', motto: 'Zero day before dawn.', invite_code: 'CUJ-SHVK-2026' },
    { name: 'Tawi ByteBandits', tag: 'TAWI', department: 'M.Tech Cyber', motto: 'Decrypting everything on wire.', invite_code: 'CUJ-TAWI-2026' },
    { name: 'Jammu ZeroDay', tag: 'JZDY', department: 'CSE', motto: 'Exploit responsibly.', invite_code: 'CUJ-JZDY-2026' },
    { name: 'Chenab Ciphers', tag: 'CHNB', department: 'Mathematics & CS', motto: 'Prime factors only.', invite_code: 'CUJ-CHNB-2026' },
    { name: 'Samba Shellcoders', tag: 'SMBA', department: 'ECE / Embedded', motto: 'Pop shells, win trophies.', invite_code: 'CUJ-SMBA-2026' },
    { name: 'Rahya Reversers', tag: 'RHYA', department: 'MCA', motto: 'Disassemble the world.', invite_code: 'CUJ-RHYA-2026' },
  ];

  const teamIds = new Map<string, number>();
  for (const t of seedTeams) {
    const res = await db.run(
      'INSERT INTO teams (name, tag, department, motto, invite_code) VALUES (?, ?, ?, ?, ?)',
      t.name,
      t.tag,
      t.department,
      t.motto,
      t.invite_code
    );
    teamIds.set(t.name, res.lastInsertRowid);
  }

  const adminHash = hashPassword('Admin@CUJ2026');
  const studentHash = hashPassword('Student@CUJ2026');

  const seedUsers = [
    { username: 'cuj_organizer', email: 'admin@cujammu.ac.in', hash: adminHash, role: 'admin', dept: 'CS&IT Faculty', roll: 'FAC-01', team: null },
    { username: 'aarav_cse', email: 'aarav.cse@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'B.Tech CSE', roll: 'CUJ23CSE014', team: 'Shivalik Rootkits' },
    { username: 'meera_csit', email: 'meera.csit@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'B.Tech CS&IT', roll: 'CUJ23CSIT08', team: 'Shivalik Rootkits' },
    { username: 'kabir_mca', email: 'kabir.mca@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'MCA', roll: 'CUJ25MCA019', team: null },
    { username: 'rohan_cyber', email: 'rohan.cyber@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'M.Tech Cyber', roll: 'CUJ25CYB003', team: 'Tawi ByteBandits' },
    { username: 'diya_cyber', email: 'diya.cyber@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'M.Tech Cyber', roll: 'CUJ25CYB011', team: 'Tawi ByteBandits' },
    { username: 'vikram_jz', email: 'vikram.cse@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'B.Tech CSE', roll: 'CUJ22CSE042', team: 'Jammu ZeroDay' },
    { username: 'ananya_math', email: 'ananya.math@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'Integrated M.Sc', roll: 'CUJ23MTH007', team: 'Chenab Ciphers' },
    { username: 'arjun_ece', email: 'arjun.ece@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'B.Tech ECE', roll: 'CUJ23ECE021', team: 'Samba Shellcoders' },
    { username: 'isha_mca', email: 'isha.mca@cujammu.ac.in', hash: studentHash, role: 'player', dept: 'MCA', roll: 'CUJ24MCA012', team: 'Rahya Reversers' },
  ];

  const userIds = new Map<string, number>();
  for (const u of seedUsers) {
    const tid = u.team ? teamIds.get(u.team) || null : null;
    const res = await db.run(
      `INSERT INTO users (username, email, password_hash, role, department, roll_number, team_id, avatar_seed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      u.username,
      u.email,
      u.hash,
      u.role,
      u.dept,
      u.roll,
      tid,
      u.username
    );
    userIds.set(u.username, res.lastInsertRowid);
  }

  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('aarav_cse')!, teamIds.get('Shivalik Rootkits')!);
  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('rohan_cyber')!, teamIds.get('Tawi ByteBandits')!);
  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('vikram_jz')!, teamIds.get('Jammu ZeroDay')!);
  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('ananya_math')!, teamIds.get('Chenab Ciphers')!);
  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('arjun_ece')!, teamIds.get('Samba Shellcoders')!);
  await db.run('UPDATE teams SET captain_id = ? WHERE id = ?', userIds.get('isha_mca')!, teamIds.get('Rahya Reversers')!);

  const challengeBonusMap = new Map(challenges.map((c) => [c.slug, c.first_blood_bonus]));
  const initialSolves: Array<{ slug: string; team: string; user: string; minutesAgo: number }> = [
    { slug: 'shivalik-xor', team: 'Shivalik Rootkits', user: 'aarav_cse', minutesAgo: 310 },
    { slug: 'rahya-campus-banner', team: 'Jammu ZeroDay', user: 'vikram_jz', minutesAgo: 295 },
    { slug: 'shivalik-xor', team: 'Tawi ByteBandits', user: 'rohan_cyber', minutesAgo: 280 },
    { slug: 'matryoshka-encoding', team: 'Shivalik Rootkits', user: 'meera_csit', minutesAgo: 265 },
    { slug: 'faculty-noticeboard', team: 'Tawi ByteBandits', user: 'diya_cyber', minutesAgo: 250 },
    { slug: 'lost-drone-samba', team: 'Chenab Ciphers', user: 'ananya_math', minutesAgo: 235 },
    { slug: 'gatekeeper-license', team: 'Rahya Reversers', user: 'isha_mca', minutesAgo: 220 },
    { slug: 'shivalik-xor', team: 'Chenab Ciphers', user: 'ananya_math', minutesAgo: 210 },
    { slug: 'faculty-noticeboard', team: 'Shivalik Rootkits', user: 'meera_csit', minutesAgo: 195 },
    { slug: 'jammu-rsa-vault', team: 'Chenab Ciphers', user: 'ananya_math', minutesAgo: 175 },
    { slug: 'pixel-matrix-lsb', team: 'Tawi ByteBandits', user: 'rohan_cyber', minutesAgo: 160 },
    { slug: 'ghost-committer-dossier', team: 'Jammu ZeroDay', user: 'vikram_jz', minutesAgo: 145 },
    { slug: 'corrupted-png-evidence', team: 'Samba Shellcoders', user: 'arjun_ece', minutesAgo: 130 },
    { slug: 'rogue-packet-capture', team: 'Tawi ByteBandits', user: 'diya_cyber', minutesAgo: 112 },
    { slug: 'samba-directory-sqli', team: 'Shivalik Rootkits', user: 'aarav_cse', minutesAgo: 95 },
    { slug: 'overflow-gradebook', team: 'Samba Shellcoders', user: 'arjun_ece', minutesAgo: 78 },
    { slug: 'jammu-rsa-vault', team: 'Tawi ByteBandits', user: 'rohan_cyber', minutesAgo: 62 },
    { slug: 'matryoshka-encoding', team: 'Rahya Reversers', user: 'isha_mca', minutesAgo: 44 },
    { slug: 'lost-drone-samba', team: 'Shivalik Rootkits', user: 'meera_csit', minutesAgo: 29 },
  ];

  const firstBloodSeen = new Set<number>();
  for (const s of initialSolves) {
    const chId = challengeIdBySlug.get(s.slug)!;
    const tId = teamIds.get(s.team)!;
    const uId = userIds.get(s.user)!;
    const ts = new Date(now - s.minutesAgo * 60 * 1000).toISOString();
    const isFb = !firstBloodSeen.has(chId);
    if (isFb) firstBloodSeen.add(chId);
    const bonus = isFb ? challengeBonusMap.get(s.slug) || 25 : 0;
    await db.run(
      'INSERT INTO solves (challenge_id, team_id, user_id, is_first_blood, bonus_points, solved_at) VALUES (?, ?, ?, ?, ?, ?)',
      chId,
      tId,
      uId,
      isFb ? 1 : 0,
      bonus,
      ts
    );
    await db.run(
      'INSERT INTO submissions (challenge_id, team_id, user_id, submitted_flag, is_correct, ip_address, submitted_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      chId,
      tId,
      uId,
      '[SEEDED_VERIFIED_FLAG]',
      '10.24.0.1',
      ts
    );
  }

  await db.run(
    'INSERT INTO announcements (title, body, severity, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
    'Welcome to CUJ CyberOps CTF 2026!',
    'All 19 challenges across Crypto, Stego, OSINT, Web, Reverse Engineering, Pwn, Forensics, and Misc are now LIVE. Form teams of up to 4 CUJ students and compete for First Blood bonuses!',
    'info',
    'CUJ CyberSec Cell',
    new Date(now - 360 * 60 * 1000).toISOString()
  );
  await db.run(
    'INSERT INTO announcements (title, body, severity, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
    'Live Interactive Web & Pwn Labs Active',
    'Web exploitation targets (/ctf-labs/*) and Pwn memory terminals are running live on the platform — no external VPN required!',
    'warning',
    'Infra Team',
    new Date(now - 180 * 60 * 1000).toISOString()
  );

  await setSetting('seeded_v1', '1');
}
