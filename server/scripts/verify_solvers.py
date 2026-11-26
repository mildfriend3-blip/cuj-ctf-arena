"""
Verifies that every generated offline CTF challenge artifact can be genuinely solved
by standard cryptanalysis / stego / forensics / reversing / OSINT techniques,
recovering the exact flags.
"""

import base64
import codecs
import io
import json
import math
import os
import re
import struct
import subprocess
import tempfile
import wave
import zipfile
import zlib
from pathlib import Path
from PIL import Image

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


def verify_all():
    results = {}

    # c1: XOR crib drag
    txt1 = (ARTIFACTS_DIR / "crypto/shivalik_cipher.txt").read_text(encoding="utf-8")
    b64 = txt1.strip().splitlines()[-1].strip()
    raw1 = base64.b64decode(b64)
    crib = b"CUJCTF{"
    key_guess = bytes(raw1[i] ^ crib[i] for i in range(4))
    dec1 = bytes(raw1[i] ^ key_guess[i % 4] for i in range(len(raw1))).decode()
    assert dec1 == "CUJCTF{x0r_cr1b_dr4gg1ng_m4st3r}", dec1
    results["c1"] = dec1

    # c2: Shared Prime RSA
    rsa = json.loads((ARTIFACTS_DIR / "crypto/rsa_vault.json").read_text(encoding="utf-8"))
    n1, n2, e, c = int(rsa["n1"]), int(rsa["n2"]), int(rsa["e"]), int(rsa["ciphertext_n1"])
    p = math.gcd(n1, n2)
    q1 = n1 // p
    phi = (p - 1) * (q1 - 1)
    d = pow(e, -1, phi)
    m = pow(c, d, n1)
    dec2 = m.to_bytes((m.bit_length() + 7) // 8, "big").decode()
    assert dec2 == "CUJCTF{sh4r3d_pr1m3_gcd_br34k}", dec2
    results["c2"] = dec2

    # c3: 24-bit LCG State Recovery (<= 65536 checks -> instant)
    enc3 = (ARTIFACTS_DIR / "crypto/encrypted_stream.bin").read_bytes()
    known = b'{"dept":'
    ks = [enc3[i] ^ known[i] for i in range(len(known))]
    recovered_flag3 = None
    for low in range(65536):
        state = (ks[0] << 16) | low
        ok = True
        s = state
        for idx in range(1, len(ks)):
            s = (1664525 * s + 1013904223) & 0xFFFFFF
            if ((s >> 16) & 0xFF) != ks[idx]:
                ok = False
                break
        if ok:
            s = state
            out = bytearray([enc3[0] ^ ks[0]])
            for b in enc3[1:]:
                s = (1664525 * s + 1013904223) & 0xFFFFFF
                out.append(b ^ ((s >> 16) & 0xFF))
            parsed = json.loads(out.decode())
            recovered_flag3 = parsed["flag"]
            break
    assert recovered_flag3 == "CUJCTF{lcg_st4t3_r3c0v3ry_t4w1}", recovered_flag3
    results["c3"] = recovered_flag3

    # s1: PNG Trailing Payload after IEND
    png_bytes = (ARTIFACTS_DIR / "stego/rahya_campus.png").read_bytes()
    iend_marker = b"IEND\xaeB`\x82"
    tail = png_bytes.split(iend_marker, 1)[1].decode(errors="ignore")
    b64_line = [ln.strip() for ln in tail.strip().splitlines() if ln.strip() and not ln.startswith("---")][-1]
    dec_s1 = base64.b64decode(b64_line).decode()
    m_s1 = re.search(r"CUJCTF\{[^}]+\}", dec_s1)
    assert m_s1 and m_s1.group(0) == "CUJCTF{b3y0nd_th3_i3nd_chunk}"
    results["s1"] = m_s1.group(0)

    # s2: LSB Blue-channel stego
    img2 = Image.open(ARTIFACTS_DIR / "stego/pixel_matrix.png")
    bits2 = [b & 1 for (_, _, b) in img2.getdata()]
    chars2 = bytearray()
    for i in range(0, len(bits2) - 7, 8):
        byte = 0
        for bit in bits2[i : i + 8]:
            byte = (byte << 1) | bit
        chars2.append(byte)
        if chars2.endswith(b"###END###"):
            break
    dec_s2 = chars2.decode(errors="ignore")
    m_s2 = re.search(r"CUJCTF\{[^}]+\}", dec_s2)
    assert m_s2 and m_s2.group(0) == "CUJCTF{lsb_rgb_p1x3l_wh1sp3r}", dec_s2
    results["s2"] = m_s2.group(0)

    # s3: 16-bit PCM WAV LSB
    with wave.open(str(ARTIFACTS_DIR / "stego/chenab_signal.wav"), "rb") as wf:
        frames = wf.readframes(wf.getnframes())
    samples = struct.unpack(f"<{len(frames)//2}h", frames)
    wav_bits = [s & 1 for s in samples]
    chars3 = bytearray()
    for i in range(0, len(wav_bits) - 7, 8):
        byte = 0
        for bit in wav_bits[i : i + 8]:
            byte = (byte << 1) | bit
        chars3.append(byte)
        if chars3.endswith(b"###END###"):
            break
    dec_s3 = chars3.decode(errors="ignore")
    m_s3 = re.search(r"CUJCTF\{[^}]+\}", dec_s3)
    assert m_s3 and m_s3.group(0) == "CUJCTF{w4v_pcm_lsb_fr3qu3ncy}", dec_s3
    results["s3"] = m_s3.group(0)

    # o1: EXIF GPS / Artist token
    jpg = Image.open(ARTIFACTS_DIR / "osint/drone_capture.jpg")
    exif = jpg.getexif()
    artist = exif.get(0x013B, "")
    token_b64 = artist.split("SecretToken:")[-1].strip()
    dec_o1 = base64.b64decode(token_b64).decode()
    assert dec_o1 == "CUJCTF{3x1f_gps_r4hy4_such4n1}", dec_o1
    results["o1"] = dec_o1

    # o2: Git History in ZIP
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(ARTIFACTS_DIR / "osint/cuj_portal_repo_bundle.zip", "r") as zf:
            zf.extractall(tmp)
        repo_path = Path(tmp) / "cuj-portal-audit"
        log_out = subprocess.check_output(["git", "log", "-p", "--all"], cwd=repo_path, text=True)
        m_o2 = re.search(r"CUJCTF\{[^}]+\}", log_out)
        assert m_o2 and m_o2.group(0) == "CUJCTF{g1t_h1st0ry_n3v3r_f0rg3ts}"
        results["o2"] = m_o2.group(0)

    # r1: Gatekeeper bitwise inversion
    r1_src = (ARTIFACTS_DIR / "rev/gatekeeper.py").read_text(encoding="utf-8")
    ns1 = {}
    exec(r1_src.split("if __name__")[0], ns1)
    target1 = ns1["TARGET"]
    sol_r1 = "".join(chr(((val - i * 3) & 0xFF) ^ 0x55) for i, val in enumerate(target1))
    assert ns1["check_license"](sol_r1) and sol_r1 == "CUJCTF{r3v_b1tw1s3_g4t3k33p3r}"
    results["r1"] = sol_r1

    # r2: Custom Bytecode VM inversion
    r2_src = (ARTIFACTS_DIR / "rev/vm_lock.py").read_text(encoding="utf-8")
    ns2 = {}
    exec(r2_src.split("if __name__")[0], ns2)
    expected2 = ns2["EXPECTED"]

    def ror8(v: int, bits: int) -> int:
        return ((v >> bits) | (v << (8 - bits))) & 0xFF

    sol_r2 = "".join(
        chr(ror8(((val - 19) & 0xFF) ^ ((0xA7 + i) & 0xFF), 3))
        for i, val in enumerate(expected2)
    )
    assert ns2["run_vm"](sol_r2) and sol_r2 == "CUJCTF{cust0m_vm_byt3c0d3_pwn3d}"
    results["r2"] = sol_r2

    # f1: PCAP HTTP Exfil Chunks
    pcap_bytes = (ARTIFACTS_DIR / "forensics/campus_traffic.pcap").read_bytes()
    off = 24
    chunks = {}
    while off < len(pcap_bytes):
        ts_sec, ts_usec, incl_len, orig_len = struct.unpack("<IIII", pcap_bytes[off : off + 16])
        off += 16
        pkt = pcap_bytes[off : off + incl_len]
        off += incl_len
        payload_text = pkt[54:].decode(errors="ignore")
        m_chunk = re.search(r"X-Exfil-Chunk-(\d+):\s*(\S+)", payload_text)
        if m_chunk:
            chunks[int(m_chunk.group(1))] = m_chunk.group(2)
    joined_b64 = "".join(chunks[k] for k in sorted(chunks))
    dec_f1 = base64.b64decode(joined_b64).decode()
    assert dec_f1 == "CUJCTF{pc4p_tcp_str34m_f0r3ns1cs}", dec_f1
    results["f1"] = dec_f1

    # f2: Corrupted PNG Magic Header repair
    corrupt = (ARTIFACTS_DIR / "forensics/corrupted_badge.bin").read_bytes()
    repaired = b"\x89PNG\r\n\x1a\n" + corrupt[8:]
    repaired_img = Image.open(io.BytesIO(repaired))
    assert repaired_img.info.get("EvidenceFlag") == "CUJCTF{m4g1c_byt3s_h3x_r3p41r}"
    results["f2"] = repaired_img.info["EvidenceFlag"]

    # m2: Matryoshka encoding
    mat_txt = (ARTIFACTS_DIR / "misc/matryoshka_payload.txt").read_text(encoding="utf-8")
    hex_str = mat_txt.strip().splitlines()[-1].strip()
    step = bytes.fromhex(hex_str)
    step = base64.b64decode(step)
    step = zlib.decompress(step)
    step = base64.b85decode(step)
    dec_m2 = codecs.decode(step.decode(), "rot_13")
    assert dec_m2 == "CUJCTF{m4try0shk4_d3c0d3_l4y3rs}", dec_m2
    results["m2"] = dec_m2

    print(f"VERIFIED ALL {len(results)} OFFLINE ARTIFACTS SUCCESSFULLY:")
    for k, v in results.items():
        print(f"  [{k}] -> {v}")


if __name__ == "__main__":
    verify_all()
