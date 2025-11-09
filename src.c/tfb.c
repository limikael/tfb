#include "tfb.h"
#include "tfb_frame.h"
#include "tfb_internal.h"
#include <stdlib.h>
#include <stdio.h>
#include <stddef.h>

void pointer_array_remove(void **array, size_t *size, size_t index) {
    if (!array || !size) return;          // sanity check
    if (index >= *size) return;           // out-of-bounds check

    // shift elements after index left by one
    for (size_t i = index; i + 1 < *size; ++i) {
        array[i] = array[i + 1];
    }

    (*size)--; // decrease size
}

tfb_t *tfb_create() {
	tfb_t *tfb=malloc(sizeof(tfb_t));
	tfb->rx_frame=tfb_frame_create(TFB_RX_BUF_SIZE);
	tfb->tx_frame=NULL;
	tfb->id=-1;
	tfb->message_func=NULL;
	tfb->millis_func=NULL;
	tfb->tx_queue_len=0;
	tfb->bus_available_millis=0;
	tfb->seq=1;

	return tfb;
}

bool tfb_is_node(tfb_t *tfb) {
	return tfb->id>0;
}

bool tfb_is_controller(tfb_t *tfb) {
	return (tfb->id==0);
}

void tfb_message_func(tfb_t *tfb, void (*func)(uint8_t *data, size_t size, int from)) {
	tfb->message_func=func;
}

void tfb_dispose(tfb_t *tfb) {
	tfb_frame_dispose(tfb->rx_frame);
	free(tfb);
}

void tfb_set_id(tfb_t *tfb, int id) {
	//printf("set id: %d\n",id);
	tfb->id=id;
}

void tfb_tx_make_current(tfb_t *tfb, tfb_frame_t *frame) {
	tfb_frame_tx_rewind(frame);
	tfb->tx_frame=frame;
}

bool tfb_is_frame_processable_by_us(tfb_t *tfb, tfb_frame_t *frame) {
	if (tfb_frame_get_checksum(tfb->rx_frame))
		return false;

	if (tfb_is_node(tfb)) {
		if (!tfb_frame_has_data(frame,TFB_TO))
			return false;

		if (tfb_frame_get_num(frame,TFB_TO)==tfb->id)
			return true;
	}

	if (tfb_is_controller(tfb)) {
		if (!tfb_frame_has_data(frame,TFB_TO) &&
				tfb_frame_has_data(frame,TFB_FROM))
			return true;
	}

	return false;
}

void tfb_dispose_frame(tfb_t *tfb, tfb_frame_t *frame) {
	//printf("dispose frame called!!!\n");

	for (int i=0; i<tfb->tx_queue_len; i++) {
		if (tfb->tx_queue[i]==frame) {
			pointer_array_remove((void**)tfb->tx_queue,&tfb->tx_queue_len,i);
			i--;
		}
	}

	tfb_frame_dispose(frame);
}

void tfb_schedule_resend(tfb_t *tfb, tfb_frame_t *frame) {
	frame->sent_times++;
	frame->send_at=tfb->millis_func()+(TFB_RESEND_BASE<<frame->sent_times);
}

void tfb_rx_push_byte(tfb_t *tfb, uint8_t byte) {
	tfb_notify_bus_activity(tfb);
	tfb_frame_rx_push_byte(tfb->rx_frame,byte);

	if (tfb_frame_rx_is_complete(tfb->rx_frame)) {
		if (tfb_is_frame_processable_by_us(tfb,tfb->rx_frame)) {
			//printf("proc frame\n");

			if (tfb_frame_has_data(tfb->rx_frame,TFB_PAYLOAD)) {
				uint8_t *payload=tfb_frame_get_data(tfb->rx_frame,TFB_PAYLOAD);
				size_t payload_size=tfb_frame_get_data_size(tfb->rx_frame,TFB_PAYLOAD);

				tfb_frame_t *ackframe=tfb_frame_create(128);
				tfb_frame_set_notification_func(ackframe,tfb,tfb_dispose_frame);
				//tfb_frame_set_auto_dispose(ackframe,true);

				if (tfb_is_controller(tfb)) {
					//printf("acking in controller to: %d\n",tfb_frame_get_num(tfb->rx_frame,TFB_FROM));
					tfb_frame_write_num(ackframe,TFB_TO,tfb_frame_get_num(tfb->rx_frame,TFB_FROM));
				}

				if (tfb_is_node(tfb))
					tfb_frame_write_num(ackframe,TFB_FROM,tfb->id);

				tfb_frame_write_num(ackframe,TFB_ACK,tfb_frame_get_num(tfb->rx_frame,TFB_SEQ));
				tfb_frame_write_checksum(ackframe);
				tfb_tx_make_current(tfb,ackframe);

				if (tfb->message_func)
					tfb->message_func(payload,payload_size,tfb_frame_get_num(tfb->rx_frame,TFB_FROM));
			}

			if (tfb_frame_has_data(tfb->rx_frame,TFB_ACK)) {
				int ackseq=tfb_frame_get_num(tfb->rx_frame,TFB_ACK);
				//printf("got ack: %d we are: %d\n",ackseq,tfb->id);
				for (int i=0; i<tfb->tx_queue_len; i++) {
					if (tfb_frame_has_data(tfb->tx_queue[i],TFB_SEQ) &&
							tfb_frame_get_num(tfb->tx_queue[i],TFB_SEQ)==ackseq) {
						tfb_dispose_frame(tfb,tfb->tx_queue[i]);
						i--;
					}
				}
			}
		}

		tfb_frame_reset(tfb->rx_frame);
	}
}

bool tfb_tx_is_available(tfb_t *tfb) {
	if (!tfb->tx_frame)
		return false;

	return tfb_frame_tx_is_available(tfb->tx_frame);
}

uint8_t tfb_tx_pop_byte(tfb_t *tfb) {
	if (!tfb->tx_frame)
		return 0x7e;

	tfb_notify_bus_activity(tfb);

	uint8_t byte=tfb_frame_tx_pop_byte(tfb->tx_frame);
	if (!tfb_frame_tx_is_available(tfb->tx_frame)) {
		tfb_frame_notify(tfb->tx_frame);
		tfb->tx_frame=NULL;
	}

		/*if (tfb_frame_is_auto_dispose(tfb->tx_frame)) {
			tfb_frame_dispose(tfb->tx_frame);
		}

		else {
			tfb->tx_frame->sent_times++;
			tfb->tx_frame->send_at=tfb->millis_func()+(TFB_RESEND_BASE<<tfb->tx_frame->sent_times);
		}*/


	return byte;
}

bool tfb_send(tfb_t *tfb, uint8_t *data, size_t size) {
	if (!tfb->millis_func)
		return false;

	if (!tfb_is_node(tfb))
		return false;

	if (tfb->tx_queue_len>=TFB_TX_QUEUE_LEN)
		return false;

	tfb_frame_t *frame=tfb_frame_create(size+128);
	tfb_frame_write_num(frame,TFB_FROM,tfb->id);
	tfb_frame_write_num(frame,TFB_SEQ,tfb->seq);
	tfb_frame_write_data(frame,TFB_PAYLOAD,data,size);
	tfb_frame_write_checksum(frame);
	tfb_frame_set_notification_func(frame,tfb,tfb_schedule_resend);
	frame->send_at=tfb->millis_func();
	tfb->seq++;

	tfb->tx_queue[tfb->tx_queue_len++]=frame;

	//printf("here... qlen=%d\n",tfb->tx_queue_len);

	return true;
}

tfb_frame_t *tfb_get_send_frame(tfb_t *tfb) {
	if (!tfb->millis_func)
		return NULL;

	int millis=tfb->millis_func();
	for (int i=0; i<tfb->tx_queue_len; i++)
		if (millis>=tfb->tx_queue[i]->send_at)
			return tfb->tx_queue[i];

	return NULL;
}

void tfb_tick(tfb_t *tfb) {
	if (tfb->tx_frame || !tfb->millis_func)
		return;

	int millis=tfb->millis_func();
	for (int i=0; i<tfb->tx_queue_len; i++) {
		if (tfb->tx_queue[i]->sent_times>=TFB_RETRIES &&
				tfb->tx_queue[i]->send_at>=millis) {
			tfb_dispose_frame(tfb,tfb->tx_queue[i]);
			i--;
		}
	}

	tfb_frame_t *send_cand=tfb_get_send_frame(tfb);
	if (tfb_is_bus_available(tfb) &&
			!tfb->tx_frame &&
			send_cand) {
		tfb_tx_make_current(tfb,send_cand);
	}
}

int tfb_get_queue_len(tfb_t *tfb) {
	return tfb->tx_queue_len;
}

void tfb_millis_func(tfb_t *tfb, uint32_t (*func)()) {
	tfb->millis_func=func;
	tfb_notify_bus_activity(tfb);
}

void tfb_notify_bus_activity(tfb_t *tfb) {
	if (!tfb->millis_func)
		return;

	uint32_t baud=9600;
	uint32_t byte_time = 1000 * 10 / baud; // 10 bits per byte in ms
	if (!byte_time)
		byte_time=1;

	uint32_t base = 2 * byte_time;         // wait at least 2 bytes
	uint32_t random_backoff = (rand() % 10);// * byte_time;

	tfb->bus_available_millis=tfb->millis_func()+base+random_backoff;
	//printf("update bus available: %u\n",tfb->bus_available_millis);
}

bool tfb_is_bus_available(tfb_t *tfb) {
	if (!tfb->millis_func)
		return false;

	if ((int32_t)(tfb->millis_func() - tfb->bus_available_millis) >= 0)
		return true;

	return false;
}

void tfb_srand(unsigned int seed) {
	srand(seed);
}

int tfb_get_timeout(tfb_t *tfb) {
	if (!tfb->tx_queue_len)
		return -1;

	int send_at=tfb->tx_queue[0]->send_at;
	for (int i=0; i<tfb->tx_queue_len; i++) {
		if (tfb->tx_queue[i]->send_at<send_at)
			send_at=tfb->tx_queue[i]->send_at;
	}

	if (send_at<tfb->bus_available_millis)
		send_at=tfb->bus_available_millis;

	int delay=send_at-tfb->millis_func();
	if (delay<0)
		delay=0;

	return delay;
}
