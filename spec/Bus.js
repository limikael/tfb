import EventEmitter from "node:events";
import TFB from "../src.js/tfb.js";

let FRAME_KEYS={
	1: "checksum",
	2: "from",
	3: "to",
	4: "payload",
	5: "seq",
	6: "ack",
	7: "announce_name",
	8: "announce_type",
	9: "assign_name",
	10: "session_id"
}

export default class Bus extends EventEmitter {
	constructor() {
		super();
		this.ports=[];
		this.frame=TFB.tfb_frame_create(1024);

		let p=this.createPort();
		p.on("data",data=>{
			for (let byte of data) {
				TFB.tfb_frame_rx_push_byte(this.frame,byte);
				if (TFB.tfb_frame_rx_is_complete(this.frame)) {
					let frame_object={};

					for (let i=0; i<TFB.tfb_frame_get_num_keys(this.frame); i++) {
						let key=TFB.tfb_frame_get_key_at(this.frame,i);
						let key_name=FRAME_KEYS[key];
						if (["payload","announce_name","announce_type","assign_name"].includes(key_name)) {
							let data=TFB.tfb_frame_get_data(this.frame,key);
							let size=TFB.tfb_frame_get_data_size(this.frame,key);
							let s=[...TFB.module.HEAPU8.subarray(data,data+size)].map(c=>String.fromCharCode(c)).join("");
							frame_object[key_name]=s;
						}

						else
							frame_object[key_name]=TFB.tfb_frame_get_num(this.frame,key);
					}

					this.emit("frame",frame_object);

					//console.log(frame_object);
					//console.log("got frame: "+TFB.tfb_frame_get_size(this.frame));
					//console.log("got frame: "+TFB.tfb_frame_get_key_at(this.frame,0));
					//console.log("got frame: "+TFB.tfb_frame_get_num_keys(this.frame));

					TFB.tfb_frame_reset(this.frame);
				}
			}
		});
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