#include <stdio.h>
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

    printf("CUJ Gradebook Service v1.0\n");
    printf("Enter student name: ");
    // VULNERABLE: unbounded read into 32-byte buffer!
    gets(frame.student_name);

    if (frame.is_admin == 0x43554a21) {
        printf("[+] Admin override unlocked!\n");
        system("cat /flag.txt");
    } else {
        printf("Hello %s (is_admin = 0x%08x)\n", frame.student_name, frame.is_admin);
    }
    return 0;
}
