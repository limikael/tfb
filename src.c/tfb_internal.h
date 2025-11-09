#pragma once

#define TFB_RX_BUF_SIZE 1024
#define TFB_TX_QUEUE_LEN 16
#define TFB_RESEND_BASE 5
#define TFB_RETRIES 5

typedef enum {
	RX_RECEIVE,
	RX_ESCAPE,
	RX_COMPLETE,
} tfb_frame_rx_state_t;

typedef enum {
	TX_INIT,
	TX_SENDING,
	TX_ESCAPING,
	TX_COMPLETE
} tfb_frame_tx_state_t;

struct tfb {
	tfb_frame_t *rx_frame;
	tfb_frame_t *tx_frame;
	tfb_frame_t *tx_queue[TFB_TX_QUEUE_LEN];
	size_t tx_queue_len;
	int id;
	int seq;
	uint32_t bus_available_millis;
	void (*message_func)(uint8_t *data, size_t size, int from);
	uint32_t (*millis_func)();
};

struct tfb_frame {
	uint8_t *buffer;
	size_t size, capacity, tx_index;
	tfb_frame_rx_state_t rx_state;
	tfb_frame_tx_state_t tx_state;
	tfb_t *tfb;
	void (*notification_func)(tfb_t *tfb, tfb_frame_t *tfb_frame);
	int send_at,sent_times;
};
