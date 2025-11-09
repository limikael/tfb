import TFB from "../src.js/tfb.js";

function frame_from_array(a) {
	let frame=TFB.tfb_frame_create(1024);
	for (let byte of a)
		TFB.tfb_frame_rx_push_byte(frame,byte);

	return frame;
}

function drain_tx_to_frame(tfb) {
	let out=[];
	while (TFB.tfb_tx_is_available(tfb))
		out.push(TFB.tfb_tx_pop_byte(tfb));

	let frame=frame_from_array(out);
	if (!TFB.tfb_frame_get_size(frame))
		return;

	return frame;
}

describe("tfb",()=>{
	it("can be created",async ()=>{
		let tfb=TFB.tfb_create();
		TFB.tfb_dispose(tfb);
	});

	it("can call the message callback, and sends acks",()=>{
		let frame=TFB.tfb_frame_create(1024);
		TFB.tfb_frame_write_num(frame,TFB.TFB_TO,34);
		TFB.tfb_frame_write_num(frame,TFB.TFB_SEQ,9);
		TFB.tfb_frame_write_data(frame,TFB.TFB_PAYLOAD,TFB.tfb_module.allocateUTF8("hello"),5);
		TFB.tfb_frame_write_checksum(frame);
		TFB.tfb_frame_tx_rewind(frame);

		let callbackParams=[];

		let tfb=TFB.tfb_create();
		TFB.tfb_set_id(tfb,34);
		TFB.tfb_message_func(tfb,TFB.module.addFunction((data,size)=>{
			let a=[...TFB.module.HEAPU8.subarray(data,data+size)].map(c=>String.fromCharCode(c)).join("");
			callbackParams.push(a);
		},"viii"));

		while (TFB.tfb_frame_tx_is_available(frame)) {
			let byte=TFB.tfb_frame_tx_pop_byte(frame);
			TFB.tfb_rx_push_byte(tfb,byte);
		}

		let out=[];
		while (TFB.tfb_tx_is_available(tfb))
			out.push(TFB.tfb_tx_pop_byte(tfb));

		expect(callbackParams).toEqual(["hello"]);
		//console.log(out);
		expect(out).toEqual([126, 17, 34, 49, 9,  9,  2, 126]);
	});

	it("can send and ack",()=>{
		TFB.tfb_srand(Date.now());

		let millis=1000;

		let tfb=TFB.tfb_create();
		TFB.tfb_set_id(tfb,34);
		TFB.tfb_millis_func(tfb,TFB.module.addFunction(()=>{
			return millis;
		},"i"));

		expect(TFB.tfb_is_bus_available(tfb)).toEqual(false);
		millis=2000;
		expect(TFB.tfb_is_bus_available(tfb)).toEqual(true);

		let res=TFB.tfb_send(tfb,TFB.tfb_module.allocateUTF8("hello"),5);
		expect(res).toEqual(true);

		expect(TFB.tfb_get_queue_len(tfb)).toEqual(1);
		TFB.tfb_tick(tfb);

		let out=[];
		while (TFB.tfb_tx_is_available(tfb))
			out.push(TFB.tfb_tx_pop_byte(tfb));

		let frame=frame_from_array(out);
		let ackframe=TFB.tfb_frame_create(1024);
		TFB.tfb_frame_write_num(ackframe,TFB.TFB_TO,TFB.tfb_frame_get_num(frame,TFB.TFB_FROM));
		TFB.tfb_frame_write_num(ackframe,TFB.TFB_ACK,TFB.tfb_frame_get_num(frame,TFB.TFB_SEQ));
		TFB.tfb_frame_write_checksum(ackframe);

		//console.log("sending ack...");
		while (TFB.tfb_frame_tx_is_available(ackframe))
			TFB.tfb_rx_push_byte(tfb,TFB.tfb_frame_tx_pop_byte(ackframe));

		expect(TFB.tfb_get_queue_len(tfb)).toEqual(0);
	});

	it("does resend",()=>{
		TFB.tfb_srand(Date.now());
		let millis=1000;
		let tfb=TFB.tfb_create();
		TFB.tfb_set_id(tfb,34);
		TFB.tfb_millis_func(tfb,TFB.module.addFunction(()=>{
			return millis;
		},"i"));

		expect(TFB.tfb_get_timeout(tfb)).toEqual(-1);

		let res=TFB.tfb_send(tfb,TFB.tfb_module.allocateUTF8("hello"),5);
		expect(res).toEqual(true);
		expect(TFB.tfb_get_queue_len(tfb)).toEqual(1);

		for (let i=0; i<10; i++) {
			TFB.tfb_tick(tfb);
			expect(TFB.tfb_tx_is_available(tfb)).toEqual(false);
			//console.log("timeout: "+TFB.tfb_get_timeout(tfb));

			if (TFB.tfb_get_timeout(tfb)>=0)
				millis+=TFB.tfb_get_timeout(tfb);

			TFB.tfb_tick(tfb);

			if (i>=5)
				expect(TFB.tfb_tx_is_available(tfb)).toEqual(false);

			else
				expect(TFB.tfb_tx_is_available(tfb)).toEqual(true);

			let frame=drain_tx_to_frame(tfb);
			expect(TFB.tfb_tx_is_available(tfb)).toEqual(false);
		}
	});
});