#!/usr/bin/env python3
"""CUJ Custom Stack/Register VM Lock"""

OP_LOAD_INPUT = 0x01
OP_ROL3       = 0x02
OP_XOR_KEY    = 0x03
OP_ADD_CONST  = 0x04
OP_CMP_TARGET = 0x05
OP_HALT       = 0xFF

EXPECTED = [208, 21, 14, 195, 28, 177, 137, 200, 23, 62, 37, 70, 235, 97, 25, 240, 96, 190, 133, 44, 53, 186, 79, 176, 57, 77, 85, 140, 195, 112, 249, 64]

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
