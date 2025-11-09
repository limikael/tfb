import TinyFieldbusController from "../src.js/TinyFieldbusController.js";
import TinyFieldbusDevice from "../src.js/TinyFieldbusDevice.js";
import {ResolvablePromise, arrayBufferToString} from "../src.js/js-util.js";
import Bus from "./Bus.js";

describe("tiny fieldbus",()=>{
	it("can be created",async ()=>{
		let promise=new ResolvablePromise();
		let frame_log=[];

		let bus=new Bus();
		bus.on("frame",o=>frame_log.push(o));
		let c=new TinyFieldbusController({port: bus.createPort()});
		let received=[];
		c.deviceById(1).addEventListener("message",ev=>{
			received.push(arrayBufferToString(ev.data));
			if (received.length==2) {
				expect(received).toEqual(["hello one","hello again"]);
				promise.resolve();
			}
		});

		let d1=new TinyFieldbusDevice({port: bus.createPort(), id: 1});
		d1.send("hello one");
		d1.send("hello again");

		await promise;

		expect(frame_log).toEqual([
			{ from: 1, seq: 1, payload: 'hello one', checksum: 59 },
			{ to: 1, ack: 1, checksum: 33 },
			{ from: 1, seq: 2, payload: 'hello again', checksum: 62 },
			{ to: 1, ack: 2, checksum: 34 }
		]);
		//console.log(frame_log);
	});
});