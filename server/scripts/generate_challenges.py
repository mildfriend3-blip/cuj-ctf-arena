"""
CUJ CyberOps CTF — Authentic Challenge Artifact Generator
Generates real, solvable, deterministic binary & text challenge artifacts across:
Crypto, Steganography, OSINT, Reverse Engineering, Pwn, Forensics, and Misc.
"""

import base64
import codecs
import hashlib
import io
import json
import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave
import zipfile
import zlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def write_file(rel_path: str, data: bytes | str) -> Path:
    dest = ARTIFACTS_DIR / rel_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        dest.write_text(data, encoding="utf-8")
    else:
        dest.write_bytes(data)
    return dest


# ---------------------------------------------------------------------------
# 1. CRYPTOGRAPHY
# ---------------------------------------------------------------------------
def gen_crypto():
    # c1: Repeating-key XOR with crib ("CUJCTF{")
    flag1 = b"CUJCTF{x0r_cr1b_dr4gg1ng_m4st3r}"
    key1 = b"CUJ!"
    ct1 = bytes(b ^ key1[i % len(key1)] for i, b in enumerate(flag1))
    b64_ct1 = base64.b64encode(ct1).decode()
    write_file(
        "crypto/shivalik_cipher.txt",
        f"""=== CUJ CyberSec Cell — Intercepted Transmission ===
Origin: Shivalik Relay Node #04
Encoding: Base64(XOR(plaintext, 4-byte_key))
Known Flag Prefix: CUJCTF{{

Ciphertext (Base64):
{b64_ct1}
""",
    )

    # c2: Shared Prime RSA (gcd(n1, n2) == p)
    flag2 = b"CUJCTF{sh4r3d_pr1m3_gcd_br34k}"
    # Deterministic strong-looking 256-bit primes for fast reliable educational CTF
    p = 0xD3A7B19F5E2C814B7A93D2016F4C8B15D7E290A3C51B8E47692D1F0C3A5B7E93
    q1 = 0xE194C27D3B805F6A12D4E89B307C5A21F6E8D04B791A3C5E824F6D0B9A1C3E57
    q2 = 0xB871D4E29A05C37F61E8B24D905A7C13E4F2D86B179C3A5E082F4D6B1C9E7A31

    # Ensure primes via simple Miller-Rabin adjustment so RSA inversion always works cleanly
    def is_prime(n: int) -> bool:
        if n < 2:
            return False
        for small in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
            if n % small == 0:
                return n == small
        d = n - 1
        s = 0
        while d % 2 == 0:
            d //= 2
            s += 1
        for a in (2, 3, 5, 7, 11, 13, 17):
            x = pow(a, d, n)
            if x == 1 or x == n - 1:
                continue
            for _ in range(s - 1):
                x = (x * x) % n
                if x == n - 1:
                    break
            else:
                return False
        return True

    def next_prime(n: int) -> int:
        if n % 2 == 0:
            n += 1
        while not is_prime(n):
            n += 2
        return n

    p = next_prime(p)
    q1 = next_prime(q1)
    q2 = next_prime(q2)
    n1 = p * q1
    n2 = p * q2
    e = 65537
    m2 = int.from_bytes(flag2, "big")
    c2 = pow(m2, e, n1)

    rsa_data = {
        "challenge": "Jammu RSA Vault",
        "note": "Two campus keypairs were provisioned using an improperly seeded hardware entropy pool.",
        "e": e,
        "n1": str(n1),
        "n2": str(n2),
        "ciphertext_n1": str(c2),
    }
    write_file("crypto/rsa_vault.json", json.dumps(rsa_data, indent=2))

    # c3: Tawi LCG Stream Predictor
    flag3 = "CUJCTF{lcg_st4t3_r3c0v3ry_t4w1}"
    plaintext3 = json.dumps(
        {
            "dept": "CSIT-CUJ",
            "clearance": "TOP_SECRET",
            "flag": flag3,
            "campus": "Rahya-Suchani",
        },
        separators=(",", ":"),
    ).encode()
    seed = 0x17C93B
    state = seed
    ks = bytearray()
    for _ in range(len(plaintext3)):
        state = (1664525 * state + 1013904223) & 0xFFFFFF
        ks.append((state >> 16) & 0xFF)
    enc3 = bytes(a ^ b for a, b in zip(plaintext3, ks))
    write_file("crypto/encrypted_stream.bin", enc3)
    write_file(
        "crypto/tawi_stream.py",
        """# Reference stream generator leaked from Tawi telemetry node
import json

def encrypt(payload_bytes: bytes, seed: int) -> bytes:
    state = seed & 0xFFFFFF
    out = bytearray()
    for b in payload_bytes:
        state = (1664525 * state + 1013904223) & 0xFFFFFF
        key_byte = (state >> 16) & 0xFF
        out.append(b ^ key_byte)
    return bytes(out)

# Known plaintext JSON prefix: b'{"dept":'
""",
    )


# ---------------------------------------------------------------------------
# 2. STEGANOGRAPHY
# ---------------------------------------------------------------------------
def _make_banner_image(title: str, subtitle: str, accent=(16, 185, 129)) -> Image.Image:
    w, h = 640, 360
    img = Image.new("RGB", (w, h), (10, 14, 22))
    draw = ImageDraw.Draw(img)
    # Subtle tactical grid
    for x in range(0, w, 32):
        draw.line([(x, 0), (x, h)], fill=(20, 30, 44), width=1)
    for y in range(0, h, 32):
        draw.line([(0, y), (w, y)], fill=(20, 30, 44), width=1)
    # Geometric cyber border & shapes
    draw.rectangle([20, 20, w - 20, h - 20], outline=accent, width=2)
    draw.rectangle([32, 32, w - 32, h - 32], outline=(38, 56, 78), width=1)
    for i in range(6):
        cx = 90 + i * 90
        cy = 245 + int(25 * math.sin(i * 1.1))
        draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], outline=accent, width=2)
        draw.line([(cx, cy), (cx + 45, 245)], fill=(56, 189, 248), width=1)

    font_lg = ImageFont.load_default(size=28)
    font_sm = ImageFont.load_default(size=15)
    draw.text((52, 68), "CENTRAL UNIVERSITY OF JAMMU", fill=accent, font=font_sm)
    draw.text((52, 102), title, fill=(241, 245, 249), font=font_lg)
    draw.text((52, 148), subtitle, fill=(148, 163, 184), font=font_sm)
    return img


def gen_stego():
    # s1: Trailing payload after PNG IEND + tEXt metadata hint
    from PIL.PngImagePlugin import PngInfo

    img1 = _make_banner_image("RAHYA-SUCHANI CYBER NODE", "Authorized Campus Telemetry Feed", (16, 185, 129))
    meta = PngInfo()
    meta.add_text("Author", "CUJ CyberSec Club")
    meta.add_text("Hint", "Data does not always stop at IEND.")
    buf1 = io.BytesIO()
    img1.save(buf1, format="PNG", pnginfo=meta)
    trailing_payload = (
        b"\n---CUJ_END_MARKER---\n"
        + base64.b64encode(b"Recon complete! Flag: CUJCTF{b3y0nd_th3_i3nd_chunk}")
        + b"\n"
    )
    write_file("stego/rahya_campus.png", buf1.getvalue() + trailing_payload)

    # s2: LSB Blue-channel steganography
    img2 = _make_banner_image("PIXEL MATRIX ARCHIVE", "LSB Channel Integrity Verification", (6, 182, 212))
    pixels = list(img2.getdata())
    secret_msg = b"CUJ_STEG_OK::CUJCTF{lsb_rgb_p1x3l_wh1sp3r}###END###"
    bits = []
    for byte in secret_msg:
        for shift in range(7, -1, -1):
            bits.append((byte >> shift) & 1)

    new_pixels = []
    for idx, (r, g, b) in enumerate(pixels):
        if idx < len(bits):
            b = (b & 0xFE) | bits[idx]
        new_pixels.append((r, g, b))
    img2.putdata(new_pixels)
    buf2 = io.BytesIO()
    img2.save(buf2, format="PNG")
    write_file("stego/pixel_matrix.png", buf2.getvalue())

    # s3: 16-bit PCM WAV LSB steganography
    sample_rate = 16000
    duration_sec = 2.0
    n_samples = int(sample_rate * duration_sec)
    secret_wav = b"CHENAB_AUDIO::CUJCTF{w4v_pcm_lsb_fr3qu3ncy}###END###"
    wav_bits = []
    for byte in secret_wav:
        for shift in range(7, -1, -1):
            wav_bits.append((byte >> shift) & 1)

    pcm_frames = bytearray()
    for i in range(n_samples):
        t = i / sample_rate
        # Smooth chord (440 Hz + 554.37 Hz + 659.25 Hz)
        val = (
            0.35 * math.sin(2 * math.pi * 440.0 * t)
            + 0.25 * math.sin(2 * math.pi * 554.37 * t)
            + 0.25 * math.sin(2 * math.pi * 659.25 * t)
        )
        sample = int(val * 16000)
        if i < len(wav_bits):
            sample = (sample & ~1) | wav_bits[i]
        pcm_frames.extend(struct.pack("<h", sample))

    buf3 = io.BytesIO()
    with wave.open(buf3, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(pcm_frames))
    write_file("stego/chenab_signal.wav", buf3.getvalue())


# ---------------------------------------------------------------------------
# 3. OSINT
# ---------------------------------------------------------------------------
def gen_osint():
    # o1: JPEG with genuine EXIF tags containing GPS coordinates & UserComment
    img = _make_banner_image("AERIAL RECON SNAPSHOT", "Sector 07 — Samba Perimeter", (245, 158, 11))
    exif = Image.Exif()
    # 0x010E ImageDescription, 0x010F Make, 0x0110 Model, 0x0131 Software, 0x013B Artist, 0x9003 DateTimeOriginal
    exif[0x010E] = "CUJ UAV Recon Flight #12 - Coordinates: 32.6377 N, 74.9963 E (Rahya-Suchani)"
    exif[0x010F] = "CUJ-AeroLabs"
    exif[0x0110] = "Shivalik-X4"
    exif[0x0131] = "TelemetryOS v2.4"
    exif[0x013B] = "Pilot: A.Sharma | SecretToken: Q1VKQ1RGezN4MWZfZ3BzX3I0aHk0X3N1Y2g0bjF9"
    exif[0x0132] = "2026:11:18 14:22:09"
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92, exif=exif.tobytes())
    write_file("osint/drone_capture.jpg", buf.getvalue())

    # o2: Git Repository Archive with deleted commit secret
    with tempfile.TemporaryDirectory() as tmp:
        repo_dir = Path(tmp) / "cuj-portal-audit"
        repo_dir.mkdir()
        env = os.environ.copy()
        env["GIT_AUTHOR_NAME"] = "CUJ DevOps"
        env["GIT_AUTHOR_EMAIL"] = "devops@cujammu.ac.in"
        env["GIT_COMMITTER_NAME"] = "CUJ DevOps"
        env["GIT_COMMITTER_EMAIL"] = "devops@cujammu.ac.in"

        def run_git(*args):
            subprocess.run(["git", *args], cwd=repo_dir, env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        run_git("init", "-b", "main")
        (repo_dir / "README.md").write_text("# CUJ Student Portal Config\nInternal deployment templates.\n", encoding="utf-8")
        run_git("add", "README.md")
        run_git("commit", "-m", "Initial portal scaffold")

        (repo_dir / ".env.staging").write_text(
            "APP_ENV=staging\nDB_HOST=10.24.8.12\nADMIN_OVERRIDE_FLAG=CUJCTF{g1t_h1st0ry_n3v3r_f0rg3ts}\n",
            encoding="utf-8",
        )
        run_git("add", ".env.staging")
        run_git("commit", "-m", "Add staging environment config")

        (repo_dir / ".env.staging").unlink()
        (repo_dir / ".env.example").write_text("APP_ENV=production\nDB_HOST=localhost\nADMIN_OVERRIDE_FLAG=REDACTED\n", encoding="utf-8")
        run_git("add", "-A")
        run_git("commit", "-m", "Remove accidental staging secrets before competition")

        zip_path = ARTIFACTS_DIR / "osint" / "cuj_portal_repo_bundle.zip"
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_path in repo_dir.rglob("*"):
                if file_path.is_file():
                    zf.write(file_path, file_path.relative_to(tmp))


# ---------------------------------------------------------------------------
# 4. REVERSE ENGINEERING
# ---------------------------------------------------------------------------
def gen_rev():
    # r1: Bitwise Gatekeeper license validator
    flag_r1 = "CUJCTF{r3v_b1tw1s3_g4t3k33p3r}"
    encoded_r1 = [((ord(ch) ^ 0x55) + (i * 3)) & 0xFF for i, ch in enumerate(flag_r1)]
    write_file(
        "rev/gatekeeper.py",
        f"""#!/usr/bin/env python3
\"\"\"CUJ Gatekeeper License Validator v1.2\"\"\"

TARGET = {encoded_r1}

def check_license(candidate: str) -> bool:
    if len(candidate) != len(TARGET):
        return False
    transformed = [((ord(ch) ^ 0x55) + (idx * 3)) & 0xFF for idx, ch in enumerate(candidate)]
    return transformed == TARGET

if __name__ == "__main__":
    user_input = input("Enter license key: ").strip()
    if check_license(user_input):
        print("ACCESS GRANTED — Welcome to CUJ Secure Core!")
    else:
        print("ACCESS DENIED")
""",
    )

    # r2: Custom Bytecode VM Lock
    flag_r2 = "CUJCTF{cust0m_vm_byt3c0d3_pwn3d}"
    # Each character i is transformed via: ((rol8(ord(c), 3) ^ (0xA7 + i)) + 19) & 0xFF
    def rol8(v: int, bits: int) -> int:
        return ((v << bits) | (v >> (8 - bits))) & 0xFF

    expected_r2 = [((rol8(ord(c), 3) ^ ((0xA7 + i) & 0xFF)) + 19) & 0xFF for i, c in enumerate(flag_r2)]
    write_file(
        "rev/vm_lock.py",
        f"""#!/usr/bin/env python3
\"\"\"CUJ Custom Stack/Register VM Lock\"\"\"

OP_LOAD_INPUT = 0x01
OP_ROL3       = 0x02
OP_XOR_KEY    = 0x03
OP_ADD_CONST  = 0x04
OP_CMP_TARGET = 0x05
OP_HALT       = 0xFF

EXPECTED = {expected_r2}

PROGRAM = [
    (OP_LOAD_INPUT, 0),
    (OP_ROL3, 3),
    (OP_XOR_KEY, 0xA7),   # key = (operand + index) & 0xFF
    (OP_ADD_CONST, 19),
    (OP_CMP_TARGET, 0),
    (OP_HALT, 0),
]

def run_vm(secret: str) -> bool:
    if len(secret) != len(EXPECTED):
        return False
    for idx, ch in enumerate(secret):
        reg = ord(ch)
        for op, arg in PROGRAM:
            if op == OP_LOAD_INPUT:
                pass
            elif op == OP_ROL3:
                reg = ((reg << arg) | (reg >> (8 - arg))) & 0xFF
            elif op == OP_XOR_KEY:
                reg = reg ^ ((arg + idx) & 0xFF)
            elif op == OP_ADD_CONST:
                reg = (reg + arg) & 0xFF
            elif op == OP_CMP_TARGET:
                if reg != EXPECTED[idx]:
                    return False
            elif op == OP_HALT:
                break
    return True

if __name__ == "__main__":
    key = input("VM Key: ").strip()
    print("UNLOCKED!" if run_vm(key) else "LOCKED!")
""",
    )


# ---------------------------------------------------------------------------
# 5. PWN SOURCE FILES (Paired with interactive backend terminal labs)
# ---------------------------------------------------------------------------
def gen_pwn():
    write_file(
        "pwn/gradebook.c",
        """#include <stdio.h>
#include <stdint.h>
#include <string.h>

struct StudentFrame {
    char student_name[32];
    uint32_t is_admin;   // Must equal 0x43554a21 ("!JUC" little-endian / "CUJ!")
};

int main(void) {
    struct StudentFrame frame;
    frame.is_admin = 0x00000000;
    memset(frame.student_name, 0, sizeof(frame.student_name));

    printf("CUJ Gradebook Service v1.0\\n");
    printf("Enter student name: ");
    // VULNERABLE: unbounded read into 32-byte buffer!
    gets(frame.student_name);

    if (frame.is_admin == 0x43554a21) {
        printf("[+] Admin override unlocked!\\n");
        system("cat /flag.txt");
    } else {
        printf("Hello %s (is_admin = 0x%08x)\\n", frame.student_name, frame.is_admin);
    }
    return 0;
}
""",
    )

    write_file(
        "pwn/inspector.c",
        """#include <stdio.h>
#include <string.h>

int main(void) {
    char flag_chunk_0[9]; // stored on stack frame slot %6$p..%9$p
    char user_input[128];

    // Stack slots 6..9 hold the 32-byte flag in little-endian 64-bit hex words
    load_flag_onto_stack();

    printf("CUJ Memory Format Inspector\\n");
    printf("Enter diagnostic label: ");
    fgets(user_input, sizeof(user_input), stdin);

    // VULNERABLE: user-controlled format string!
    printf(user_input);
    printf("\\n");
    return 0;
}
""",
    )


# ---------------------------------------------------------------------------
# 6. DIGITAL FORENSICS
# ---------------------------------------------------------------------------
def _ip_bytes(ip_str: str) -> bytes:
    return bytes(int(p) for p in ip_str.split("."))


def _build_eth_ipv4_tcp_packet(src_ip: str, dst_ip: str, sport: int, dport: int, seq: int, payload: bytes) -> bytes:
    eth_hdr = b"\xaa\xbb\xcc\xdd\xee\x01\x11\x22\x33\x44\x55\x02\x08\x00"
    tcp_hdr = struct.pack(
        "!HHIIHHHH",
        sport,
        dport,
        seq,
        1,
        (5 << 12) | 0x018,  # PSH+ACK
        64240,
        0,
        0,
    )
    total_len = 20 + len(tcp_hdr) + len(payload)
    ip_hdr = struct.pack(
        "!BBHHHBBH4s4s",
        0x45,
        0,
        total_len,
        0x1234,
        0x4000,
        64,
        6,  # TCP
        0,
        _ip_bytes(src_ip),
        _ip_bytes(dst_ip),
    )
    return eth_hdr + ip_hdr + tcp_hdr + payload


def gen_forensics():
    # f1: Genuine Wireshark PCAP with HTTP exfil chunks
    flag_f1 = b"CUJCTF{pc4p_tcp_str34m_f0r3ns1cs}"
    b64_flag = base64.b64encode(flag_f1).decode()
    part1, part2, part3 = b64_flag[:14], b64_flag[14:28], b64_flag[28:]

    packets = [
        ("10.10.5.21", "10.10.0.10", 51204, 80, 100, b"GET /index.html HTTP/1.1\r\nHost: portal.cujammu.ac.in\r\n\r\n"),
        ("10.10.0.10", "10.10.5.21", 80, 51204, 200, b"HTTP/1.1 200 OK\r\nContent-Length: 19\r\n\r\nCUJ Portal Healthy\n"),
        ("10.10.5.99", "192.168.77.5", 49110, 8080, 300, f"POST /telemetry HTTP/1.1\r\nHost: exfil.cuj-lab\r\nX-Exfil-Chunk-1: {part1}\r\n\r\n".encode()),
        ("10.10.5.21", "10.10.0.10", 51205, 80, 400, b"GET /schedule.json HTTP/1.1\r\nHost: portal.cujammu.ac.in\r\n\r\n"),
        ("10.10.5.99", "192.168.77.5", 49111, 8080, 500, f"POST /telemetry HTTP/1.1\r\nHost: exfil.cuj-lab\r\nX-Exfil-Chunk-2: {part2}\r\n\r\n".encode()),
        ("10.10.0.10", "10.10.5.21", 80, 51205, 600, b"HTTP/1.1 200 OK\r\n\r\n{\"status\":\"active\"}\n"),
        ("10.10.5.99", "192.168.77.5", 49112, 8080, 700, f"POST /telemetry HTTP/1.1\r\nHost: exfil.cuj-lab\r\nX-Exfil-Chunk-3: {part3}\r\n\r\n".encode()),
    ]

    pcap = bytearray()
    # Little-endian PCAP global header
    pcap.extend(struct.pack("<IHHIIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1))
    ts = 1795680000
    for idx, (sip, dip, sp, dp, seq, payload) in enumerate(packets):
        raw = _build_eth_ipv4_tcp_packet(sip, dip, sp, dp, seq, payload)
        pcap.extend(struct.pack("<IIII", ts + idx, idx * 12000, len(raw), len(raw)))
        pcap.extend(raw)
    write_file("forensics/campus_traffic.pcap", bytes(pcap))

    # f2: Corrupted PNG Magic Header (first 8 bytes replaced)
    img = Image.new("RGB", (600, 200), (11, 16, 27))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 590, 190], outline=(16, 185, 129), width=3)
    font_title = ImageFont.load_default(size=18)
    font_flag = ImageFont.load_default(size=22)
    draw.text((28, 36), "RECOVERED EVIDENCE BADGE — CUJ FORENSICS", fill=(56, 189, 248), font=font_title)
    draw.text((28, 95), "CUJCTF{m4g1c_byt3s_h3x_r3p41r}", fill=(16, 185, 129), font=font_flag)
    from PIL.PngImagePlugin import PngInfo
    meta = PngInfo()
    meta.add_text("EvidenceFlag", "CUJCTF{m4g1c_byt3s_h3x_r3p41r}")
    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=meta)
    corrupted = b"\x00\x00\x00\x00DEAD" + buf.getvalue()[8:]
    write_file("forensics/corrupted_badge.bin", corrupted)


# ---------------------------------------------------------------------------
# 7. MISC
# ---------------------------------------------------------------------------
def gen_misc():
    # m2: Matryoshka Multi-Layer Encoding: ROT13 -> Base85 -> zlib -> Base64 -> Hex
    flag_m2 = "CUJCTF{m4try0shk4_d3c0d3_l4y3rs}"
    step1 = codecs.encode(flag_m2, "rot_13").encode()
    step2 = base64.b85encode(step1)
    step3 = zlib.compress(step2)
    step4 = base64.b64encode(step3)
    step5 = step4.hex()
    write_file(
        "misc/matryoshka_payload.txt",
        f"""=== Matryoshka Layered Encoding ===
Layers (outermost -> innermost): Hex -> Base64 -> zlib -> Base85 -> ROT13

Payload:
{step5}
""",
    )


if __name__ == "__main__":
    gen_crypto()
    gen_stego()
    gen_osint()
    gen_rev()
    gen_pwn()
    gen_forensics()
    gen_misc()
    print("All CTF artifacts generated successfully in:", ARTIFACTS_DIR)
