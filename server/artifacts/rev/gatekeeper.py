#!/usr/bin/env python3
"""CUJ Gatekeeper License Validator v1.2"""

TARGET = [22, 3, 37, 31, 13, 34, 64, 60, 126, 62, 40, 88, 136, 72, 76, 145, 86, 153, 64, 107, 157, 96, 168, 131, 174, 177, 115, 183, 123, 127]

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
