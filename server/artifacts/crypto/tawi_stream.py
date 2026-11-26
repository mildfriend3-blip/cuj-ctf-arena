# Reference stream generator leaked from Tawi telemetry node
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
