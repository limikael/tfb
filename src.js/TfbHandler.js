import TFB from "./tfb.js";
import {SyncEventTarget} from "./js-util.js";

export default class TfbHandler extends SyncEventTarget {
	constructor({port, tfb}={}) {
		super();

		this.tfb=tfb;
		this.port=port;

		TFB.tfb_message_func(this.tfb,TFB.module.addFunction((data, size)=>{
			let data_copy=TFB.module.HEAPU8.buffer.slice(data,data+size);
			let ev=new Event("message");
			ev.data=data_copy;
			try {
				this.dispatchEvent(ev);
			}

			catch (e) {
				console.error(e);
				throw e;
			}
		},"vii"));

		TFB.tfb_message_from_func(this.tfb,TFB.module.addFunction((data, size, from)=>{
			let data_copy=TFB.module.HEAPU8.buffer.slice(data,data+size);
			let ev=new Event("message");
			ev.data=data_copy;
			ev.from=from;
			try {
				this.dispatchEvent(ev);
			}

			catch (e) {
				console.error(e);
				throw e;
			}
		},"viii"));

		TFB.tfb_device_func(this.tfb,TFB.module.addFunction((name_ptr)=>{
			let name=TFB.module.UTF8ToString(name_ptr);
			let id=TFB.tfb_device_id_by_name(this.tfb,name_ptr);
			//console.log("device cb: "+name);
			let ev=new Event("device");
			ev.name=name;
			ev.id=id;
			try {
				this.dispatchEvent(ev);
			}

			catch (e) {
				console.error(e);
				throw e;
			}
		},"vi"));

		this.port.on("data",this.handleData);

		//TFB.tfb_set_id(this.tfb,this.id);
		this.updateTimeout();
	}

	send(data) {
		if (typeof data=="string")
			data=new TextEncoder().encode(data);

		if (!(data instanceof Uint8Array))
			throw new Error("Need Uint8Array to send");

		let pointer=TFB.module._malloc(data.length);
		TFB.module.HEAPU8.set(data,pointer);
		let res=TFB.tfb_send(this.tfb,pointer,data.length);
		TFB.module._free(pointer);
		this.updateTimeout();

		if (!res)
			throw new Error("Send failed");
	}

	drain() {
		while (TFB.tfb_tx_is_available(this.tfb)) {
			let byte=TFB.tfb_tx_pop_byte(this.tfb);
			//console.log("draining: "+byte);
			this.port.write(new Uint8Array([byte]))
		}
	}

	handleData=(data)=>{
		for (let byte of data) {
			//console.log("byte: "+byte+" seen by: "+this.id);
			TFB.tfb_rx_push_byte(this.tfb,byte);
		}

		this.drain();
		TFB.tfb_tick(this.tfb);
		this.drain();
		this.updateTimeout();
	}

	handleTimeout=()=>{
		this.drain();
		TFB.tfb_tick(this.tfb);
		this.drain();
		this.updateTimeout();
	}

	updateTimeout() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId=null;
		}

		let t=TFB.tfb_get_timeout(this.tfb);
		if (t>=0) {
			//console.log("setting timeout: "+t);
			setTimeout(this.handleTimeout,t);
		}

		else {
			//console.log("no timeout to set");
		}
	}
}