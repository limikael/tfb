#include "tfb_util.h"
#include <stdlib.h>
#include <string.h>

int tfb_allocated_blocks=0;

void pointer_array_remove(void **array, size_t *size, size_t index) {
    if (!array || !size) return;          // sanity check
    if (index >= *size) return;           // out-of-bounds check

    // shift elements after index left by one
    for (size_t i = index; i + 1 < *size; ++i) {
        array[i] = array[i + 1];
    }

    (*size)--; // decrease size
}

void *tfb_malloc(size_t size) {
	tfb_allocated_blocks++;
	return malloc(size);
}

char *tfb_strdup(char *s) {
    tfb_allocated_blocks++;
    return strdup(s);
}

void tfb_free(void *p) {
	tfb_allocated_blocks--;
	free(p);
}
