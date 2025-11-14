import tfb from "../src.js/tfb.js";

function hex8(n) {
	return Number(n).toString(16).padStart(2, '0');
}

describe("tfb frame",()=>{
	it("can create a frame",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		tfb.tfb_frame_dispose(frame);
	});

	it("can receive",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		tfb.tfb_frame_rx_push_byte(frame,65);

		expect(tfb.tfb_frame_get_buffer_at(frame,0)).toEqual(65);
		expect(tfb.tfb_frame_get_size(frame)).toEqual(1);
		expect(tfb.tfb_frame_rx_is_complete(frame)).toEqual(false);

		tfb.tfb_frame_rx_push_byte(frame,0x7e);
		expect(tfb.tfb_frame_get_size(frame)).toEqual(1);
		expect(tfb.tfb_frame_rx_is_complete(frame)).toEqual(true);

		tfb.tfb_frame_reset(frame);
		expect(tfb.tfb_frame_get_size(frame)).toEqual(0);
		expect(tfb.tfb_frame_rx_is_complete(frame)).toEqual(false);

		tfb.tfb_frame_rx_push_byte(frame,0x7e);
		expect(tfb.tfb_frame_get_size(frame)).toEqual(0);
		expect(tfb.tfb_frame_rx_is_complete(frame)).toEqual(false);

		tfb.tfb_frame_rx_push_byte(frame,0x7d);
		tfb.tfb_frame_rx_push_byte(frame,65^0x20);
		expect(tfb.tfb_frame_get_buffer_at(frame,0)).toEqual(65);
		expect(tfb.tfb_frame_get_size(frame)).toEqual(1);
	});

	it("can write raw bytes",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		tfb.tfb_frame_write_byte(frame,123);

		expect(tfb.tfb_frame_get_size(frame)).toEqual(1);
		expect(tfb.tfb_frame_get_buffer_at(frame,0)).toEqual(123);
	});

	it("can transmit",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		expect(tfb.tfb_frame_tx_is_available(frame)).toEqual(false);
		tfb.tfb_frame_write_byte(frame,123);
		tfb.tfb_frame_write_byte(frame,0x7e);
		tfb.tfb_frame_write_byte(frame,65);
		tfb.tfb_frame_write_byte(frame,0x7d);
		expect(tfb.tfb_frame_tx_is_available(frame)).toEqual(true);
		let a=[];

		while (tfb.tfb_frame_tx_is_available(frame))
			a.push(tfb.tfb_frame_tx_pop_byte(frame));

		//console.log(a.map(v=>hex8(v)));
		expect(a.map(v=>hex8(v))).toEqual(['7e', '7b', '7d', '5e', '41', '7d', '5d', '7e']);

		tfb.tfb_frame_tx_rewind(frame);

		let b=[];
		while (tfb.tfb_frame_tx_is_available(frame))
			b.push(tfb.tfb_frame_tx_pop_byte(frame));

		//console.log(b);
		expect(b).toEqual(a);
	});

	it("can write encoded bytes",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		let p=tfb.tfb_module.allocateUTF8("A".repeat(8000));

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,1);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([ 9, 65 ]);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,2);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([ 10, 65, 65 ]);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,3);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([ 13, 3, 65, 65, 65 ]);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,4);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([ 11, 65, 65, 65, 65 ]);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,5);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([13, 5, 65, 65, 65, 65, 65]);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,p,256);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame).slice(0,4)).toEqual([14, 1, 0, 65]);
	});

	it("can get encoded bytes",async ()=>{
		let frame=tfb.tfb_frame_create(1024);

		tfb.tfb_frame_reset(frame);
		tfb.tfb_frame_write_data(frame,1,tfb.tfb_module.allocateUTF8("hello"),5);
		tfb.tfb_frame_write_data(frame,2,tfb.tfb_module.allocateUTF8("wrld"),4);

		expect(tfb.tfb_frame_get_data_size(frame,1)).toEqual(5);
		expect(tfb.tfb_frame_get_data_size(frame,2)).toEqual(4);
		expect(tfb.tfb_frame_get_data_size(frame,3)).toEqual(0);

		expect(tfb.tfb_module.HEAPU8[tfb.tfb_frame_get_data(frame,1)]).toEqual("h".charCodeAt());
		expect(tfb.tfb_module.HEAPU8[tfb.tfb_frame_get_data(frame,2)]).toEqual("w".charCodeAt());
		expect(tfb.tfb_frame_get_data(frame,3)).toEqual(0);
	});

	it("can write encoded nums",async ()=>{
		let frame=tfb.tfb_frame_create(1024);

		tfb.tfb_frame_write_num(frame,1,123);
		tfb.tfb_frame_write_num(frame,2,-129);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_buffer_array(frame)).toEqual([ 9, 123, 18, 255, 127 ]);
	});

	it("can read encoded nums",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		tfb.tfb_frame_write_num(frame,1,123);
		tfb.tfb_frame_write_num(frame,2,1234);
		tfb.tfb_frame_write_num(frame,3,-6543);
		//console.log(tfb_frame_get_buffer_array(frame));
		expect(tfb.tfb_frame_get_num(frame,1)).toEqual(123);
		expect(tfb.tfb_frame_get_num(frame,2)).toEqual(1234);
		expect(tfb.tfb_frame_get_num(frame,3)).toEqual(-6543);
	});

	it("can write checksum",async ()=>{
		let frame=tfb.tfb_frame_create(1024);
		tfb.tfb_frame_write_data(frame,1,tfb.tfb_module.allocateUTF8("hello"),5);
		tfb.tfb_frame_write_checksum(frame);
		//console.log(tfb_frame_get_checksum(frame));
		expect(tfb.tfb_frame_get_checksum(frame)).toEqual(0);
	});
});