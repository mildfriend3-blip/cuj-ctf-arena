#include <stdio.h>
#include <string.h>

int main(void) {
    char flag_chunk_0[9]; // stored on stack frame slot %6$p..%9$p
    char user_input[128];

    // Stack slots 6..9 hold the 32-byte flag in little-endian 64-bit hex words
    load_flag_onto_stack();

    printf("CUJ Memory Format Inspector\n");
    printf("Enter diagnostic label: ");
    fgets(user_input, sizeof(user_input), stdin);

    // VULNERABLE: user-controlled format string!
    printf(user_input);
    printf("\n");
    return 0;
}
