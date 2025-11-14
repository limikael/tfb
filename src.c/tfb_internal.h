#pragma once

#include "tfb.h"
#include "tfb_frame.h"
#include "tfb_util.h"
#include "tfb_device.h"
#include "tfb_link.h"

#define TFB_RX_BUF_SIZE 1024
#define TFB_TX_QUEUE_LEN 16
#define TFB_RESEND_BASE 5
#define TFB_RETRIES 5
#define TFB_ANNOUNCEMENT_INTERVAL 1000
#define TFB_CONNECTION_TIMEOUT 5000

extern uint32_t (*tfb_millis)();

typedef enum {
	TFB_LINK_RX_INIT,
	TFB_LINK_RX_RECEIVE,
	TFB_LINK_RX_ESCAPE
} tfb_link_rx_state_t;

typedef enum {
	TFB_LINK_TX_IDLE,
	TFB_LINK_TX_SENDING,
	TFB_LINK_TX_ESCAPE
} tfb_link_tx_state_t;

struct tfb_link {
	uint8_t *rx_buf;
	uint32_t rx_pos,tx_queue_len,tx_index;
	tfb_link_rx_state_t rx_state;
	tfb_link_tx_state_t tx_state;
	void (*frame_func)(tfb_link_t *link, uint8_t *data, size_t size);
	uint32_t bus_available_millis;
	void *tag;

	struct {
		uint8_t *data;
		size_t size;
	} *tx_queue;
};

struct tfb_device {
	char *name,*type;
	int id;
	uint32_t activity_deadline;
	int inseq,outseq;
};

struct tfb {
	/*tfb_frame_t *rx_frame,*tx_frame;
	tfb_frame_t *tx_queue[TFB_TX_QUEUE_LEN];
	size_t tx_queue_len;
	bool rx_deliverable;
	uint32_t bus_available_millis;*/

	tfb_link_t *link;
	int id, outseq, inseq;
	char *device_name,*device_type;
	uint32_t announcement_deadline,activity_deadline;
	void (*message_func)(uint8_t *data, size_t size);
	void (*message_from_func)(uint8_t *data, size_t size, int from);
	void (*device_func)(char *name);
	void (*status_func)();
	tfb_device_t **devices;
	size_t num_devices;
	int session_id;
	int errno;
};

struct tfb_frame {
	uint8_t *buffer;
	size_t size, capacity;
};
