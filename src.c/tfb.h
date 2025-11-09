#pragma once
#include <stdint.h>
#include <stdlib.h>
#include <stdbool.h>

#define TFB_CHECKSUM 1
#define TFB_FROM 2
#define TFB_TO 3
#define TFB_PAYLOAD 4
#define TFB_SEQ 5
#define TFB_ACK 6

typedef struct tfb tfb_t;

tfb_t *tfb_create();
void tfb_dispose(tfb_t *tfb);
void tfb_set_id(tfb_t *tfb, int id);
bool tfb_is_node(tfb_t *tfb);
bool tfb_is_controller(tfb_t *tfb);
void tfb_rx_push_byte(tfb_t *tfb, uint8_t byte);
void tfb_message_func(tfb_t *tfb, void (*func)(uint8_t *data, size_t size, int from));
void tfb_millis_func(tfb_t *tfb, uint32_t (*func)());
bool tfb_tx_is_available(tfb_t *tfb);
uint8_t tfb_tx_pop_byte(tfb_t *tfb);
bool tfb_send(tfb_t *tfb, uint8_t *data, size_t size);
void tfb_tick(tfb_t *tfb);
int tfb_get_queue_len(tfb_t *tfb);
void tfb_notify_bus_activity(tfb_t *tfb);
bool tfb_is_bus_available(tfb_t *tfb);
void tfb_srand(unsigned int seed);
int tfb_get_timeout(tfb_t *tfb);
