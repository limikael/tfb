#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include "tfb.h"

typedef struct tfb_frame tfb_frame_t;

tfb_frame_t *tfb_frame_create(size_t size);
void tfb_frame_dispose(tfb_frame_t *frame);
uint8_t tfb_frame_get_buffer_at(tfb_frame_t *frame, size_t index);
size_t tfb_frame_get_size(tfb_frame_t *frame);
size_t tfb_frame_get_data_size(tfb_frame_t *frame, uint8_t key);
uint8_t *tfb_frame_get_data(tfb_frame_t *frame, uint8_t key);
int tfb_frame_get_num(tfb_frame_t *frame, uint8_t key);
uint8_t tfb_frame_get_checksum(tfb_frame_t *frame);
bool tfb_frame_has_data(tfb_frame_t *frame, uint8_t key);
void tfb_frame_reset(tfb_frame_t *frame);
void tfb_frame_write_byte(tfb_frame_t *frame, uint8_t byte);
void tfb_frame_write_data(tfb_frame_t *frame, uint8_t key, uint8_t *bytes, size_t size);
void tfb_frame_write_num(tfb_frame_t *frame, uint8_t key, int num);
void tfb_frame_write_checksum(tfb_frame_t *frame);
bool tfb_frame_rx_is_complete(tfb_frame_t *frame);
void tfb_frame_rx_push_byte(tfb_frame_t *frame, uint8_t byte);
bool tfb_frame_tx_is_available(tfb_frame_t *frame);
void tfb_frame_tx_rewind(tfb_frame_t *frame);
uint8_t tfb_frame_tx_pop_byte(tfb_frame_t *frame);
/*bool tfb_frame_is_auto_dispose(tfb_frame_t *frame);
void tfb_frame_set_auto_dispose(tfb_frame_t *frame, bool val);*/
void tfb_frame_set_notification_func(tfb_frame_t *frame, tfb_t *tfb, void (*func)(tfb_t *tfb, tfb_frame_t *tfb_frame));
void tfb_frame_notify(tfb_frame_t *frame);
int tfb_frame_get_key_at(tfb_frame_t *frame, int index);
int tfb_frame_get_num_keys(tfb_frame_t *frame);
