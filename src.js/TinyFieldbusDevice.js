import TFB from "./tfb.js";
import TfbHandler from "./TfbHandler.js";
import {CustomEvent, arrayBufferToString} from "./js-util.js";

export default class TinyFieldbusDevice extends EventTarget {
	constructor({port, name, type}={}) {
		super();
		this.port=port;
		this.tfb=TFB.tfb_create_device(TFB.module.allocateUTF8(name),TFB.module.allocateUTF8(type));
		this.tfbHandler=new TfbHandler({tfb: this.tfb, port});
		this.tfbHandler.addEventListener("message",this.handleMessage);
		this.tfbHandler.addEventListener("status",this.handleStatus);
	}

	send(data) {
		this.tfbHandler.send(data);
	}

	handleMessage=ev=>{
		//console.log("message in dev: "+arrayBufferToString(ev.data));
		this.dispatchEvent(new CustomEvent("message",{
			data: ev.data
		}));
	}

	handleStatus=ev=>{
		this.dispatchEvent(new CustomEvent("status"));
		if (this.isConnected())
			this.dispatchEvent(new CustomEvent("connect"));

		else
			this.dispatchEvent(new CustomEvent("close"));
	}

	isConnected() {
		return TFB.tfb_is_connected(this.tfb);
	}
}
