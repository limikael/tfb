import EventEmitter from "node:events";
import TFB from "../src.js/tfb.js";

let frameTypes=[
	{name: "checksum", value: 1,},
	{name: "from", value: 2,},
	{name: "to", value: 3,},
	{name: "payload", value: 4, type: "string"},
	{name: "seq", value: 5,},
	{name: "ack", value: 6,},
	{name: "announce_name", value: 7, type: "string"},
	{name: "announce_type", value: 8, type: "string"},
	{name: "assign_name", value: 9, type: "string"},
	{name: "session_id", value: 10,},
	{name: "reset_to", value: 11,},
];

let frameTypesByName=Object.fromEntries(frameTypes.map(f=>[f.name,f]));
let frameTypesByValue=Object.fromEntries(frameTypes.map(f=>[f.value,f]));

export default class Bus extends EventEmitter {
	constructor() {
		super();
		this.ports=[];
		this.frame=TFB.tfb_frame_create(1024);
		this.frame_log=[];

		let p=this.createPort();
		p.on("data",data=>{
			for (let byte of data) {
				TFB.tfb_frame_rx_push_byte(this.frame,byte);
				if (TFB.tfb_frame_rx_is_complete(this.frame)) {
					let frame_object=decodeFrame(this.frame);
					TFB.tfb_frame_reset(this.frame);

					this.frame_log.push(frame_object);
					this.emit("frame",frame_object);
				}
			}
		});
	}

	writeFrame(frame_object) {
		this.write(encodeFrame(frame_object));
	}

	write(data) {
		for (let p of this.ports)
			p.emit("data",data);
	}

	createPort() {
		let port=new EventEmitter();
		port.write=data=>{
			if (!this.ports.includes(port))
				return;

			for (let p of this.ports)
				if (p!=port)
					p.emit("data",data);
		}

		this.ports.push(port);

		return port;
	}

	removePort(port) {
		let index=this.ports.indexOf(port);
		if (index>=0)
			this.ports.splice(index,1);
	}
}

export function encodeFrame(frame_object) {
	let frame=TFB.tfb_frame_create(1024);
	let bytes=[];

	for (let k in frame_object) {
		let frameType=frameTypesByName[k];
		if (!frameType)
			throw new Error("Unknown frame type: "+k);

		switch (frameType.type) {
			case "string":
				TFB.tfb_frame_write_data(frame,frameType.value,TFB.module.allocateUTF8(frame_object[k]),frame_object[k].length)
				break;

			default:
				TFB.tfb_frame_write_num(frame,frameType.value,frame_object[k])
				break;
		}
	}

	TFB.tfb_frame_write_checksum(frame);
	while (TFB.tfb_frame_tx_is_available(frame))
		bytes.push(TFB.tfb_frame_tx_pop_byte(frame));

	TFB.tfb_frame_dispose(frame);

	let frame_data=new Uint8Array(bytes);
	return frame_data;
}

export function decodeFrame(frame) {
	let frame_object={};
	for (let i=0; i<TFB.tfb_frame_get_num_keys(frame); i++) {
		let key=TFB.tfb_frame_get_key_at(frame,i);
		let frameType=frameTypesByValue[key];
		if (!frameType)
			throw new Error("Unknown key in data: "+key);

		switch (frameType.type) {
			case "string":
				let data=TFB.tfb_frame_get_data(frame,key);
				let size=TFB.tfb_frame_get_data_size(frame,key);
				let s=[...TFB.module.HEAPU8.subarray(data,data+size)].map(c=>String.fromCharCode(c)).join("");
				frame_object[frameType.name]=s;
				break;

			default:
				frame_object[frameType.name]=TFB.tfb_frame_get_num(frame,key);
				break;
		}
	}

	return frame_object;
}

export function decodeFrameData(frame_data) {
	let frame=TFB.tfb_frame_create(1024);
	for (let byte of frame_data)
		TFB.tfb_frame_rx_push_byte(frame,byte);

	let frame_object=decodeFrame(frame);
	TFB.tfb_frame_dispose(frame);

	return frame_object;
}