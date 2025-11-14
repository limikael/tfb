#include <stdio.h>
#include "tfb_internal.h"
#include <assert.h>
#include <string.h>
#include <time.h>

void test_tfb_frame_basic() {
	tfb_frame_t *frame=tfb_frame_create(1024);

	tfb_frame_write_num(frame,TFB_TO,123);
	tfb_frame_write_num(frame,TFB_FROM,456);

	assert(tfb_frame_get_num(frame,TFB_TO)==123);
	assert(tfb_frame_get_num(frame,TFB_FROM)==456);

	tfb_frame_dispose(frame);
}

/*int main() {
	//srand((unsigned int)time(NULL));
	srand(0);
	printf("Running tests...\n");

	test_tfb_frame_basic();

	printf("Blocks remaining: %d\n",tfb_allocated_blocks);
	assert(!tfb_allocated_blocks);
}*/