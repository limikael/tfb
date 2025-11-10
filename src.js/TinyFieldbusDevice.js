import TFB from "./tfb.js";
import TfbHandler from "./TfbHandler.js";

export default class TinyFieldbusDevice extends EventTarget {
	constructor({port, name, type}={}) {
		super();
		this.tfb=TFB.tfb_create_device(TFB.module.allocateUTF8(name),TFB.module.allocateUTF8(type));
		this.tfbHandler=new TfbHandler({tfb: this.tfb, port});
		//this.tfb=new TinyFieldbus({port, mode: "device", device_name: name, device_type: type});
	}

	send(data) {
		this.tfbHandler.send(data);
	}
}