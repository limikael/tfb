import TinyFieldbus from "./TinyFieldbus.js";

export default class TinyFieldbusDevice extends EventTarget {
	constructor({port, id}={}) {
		super();
		this.tfb=new TinyFieldbus({port, id});
	}

	send(data) {
		this.tfb.send(data);
	}
}