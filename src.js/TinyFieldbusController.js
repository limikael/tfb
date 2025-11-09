import TinyFieldbus from "./TinyFieldbus.js";
import {arrayBufferToString, SyncEventTarget} from "./js-util.js";

export default class TinyFieldbusController extends SyncEventTarget {
	constructor({port}={}) {
		super();
		this.devices=[];
		this.tfb=new TinyFieldbus({port, id: 0});
		this.tfb.addEventListener("message",messageEv=>{
			let device=this.deviceById(messageEv.from);
			let ev=new Event("message");
			ev.data=messageEv.data;
			device.dispatchEvent(ev);
		});
	}

	deviceById(id) {
		if (!id)
			return;

		for (let device of this.devices)
			if (device.id==id)
				return device;

		let device=new SyncEventTarget();
		device.id=id;
		this.devices.push(device);

		return device;
	}
}