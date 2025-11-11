import TinyFieldbusController from "../src.js/TinyFieldbusController.js";
import TinyFieldbusDevice from "../src.js/TinyFieldbusDevice.js";
import {ResolvablePromise, arrayBufferToString, EventCapture} from "../src.js/js-util.js";
import Bus from "./Bus.js";
import TFB from "../src.js/tfb.js";

describe("tiny fieldbus",()=>{
	describe("timed",()=>{
	    beforeEach(function() {
			jasmine.clock().install();
	    });

	    afterEach(function() {
			jasmine.clock().uninstall();
	    });

		it("sends controller session announcements",async ()=>{
			jasmine.clock().mockDate(new Date(1000));
			//let promise=new ResolvablePromise();
			let frame_log=[];

			let bus=new Bus();
			bus.on("frame",o=>{
				//console.log(o);
				frame_log.push(o);
			});

			let c=new TinyFieldbusController({port: bus.createPort()});
			jasmine.clock().tick(100);
			expect(frame_log.length).toEqual(1);

			jasmine.clock().tick(10000);
			expect(frame_log.length).toBeGreaterThan(5);

			expect(frame_log[0].hasOwnProperty("session_id")).toBeTrue();
		});

		it("can check connection and closes itself on missed ack",async ()=>{
			TFB.tfb_srand(0);
			jasmine.clock().mockDate(new Date(1000));
			let event_log=[];
			let bus=new Bus();
			let c=new TinyFieldbusController({port: bus.createPort()});
			let d=new TinyFieldbusDevice({port: bus.createPort(), name: "hello", type: "world"});
			d.addEventListener("connect",()=>event_log.push("connect"));
			d.addEventListener("close",()=>event_log.push("close"));
			expect(d.isConnected()).toEqual(false);

			jasmine.clock().tick(1000);
			expect(event_log).toEqual(["connect"]);
			expect(d.isConnected()).toEqual(true);
			//console.log(bus.frame_log);
			expect(bus.frame_log).toEqual([
				{ announce_name: 'hello', announce_type: 'world', checksum: 113 },
				{ assign_name: 'hello', to: 1, session_id: 27579, checksum: -71 },
				{ session_id: 27579, checksum: -117 },
				{ from: 1, checksum: 25 }
			]);

			bus.removePort(c.port);

			d.send("hello");
			jasmine.clock().tick(10000);
			expect(event_log).toEqual(["connect","close"]);

			expect(d.isConnected()).toEqual(false);
		});

		it("closes itself if controller not seen",async ()=>{
			jasmine.clock().mockDate(new Date(1000));
			let frame_log=[];
			let event_log=[];

			let bus=new Bus();
			bus.on("frame",o=>{
				//console.log(o);
				frame_log.push(o);
			});

			let c=new TinyFieldbusController({port: bus.createPort()});
			let d=new TinyFieldbusDevice({port: bus.createPort(), name: "hello", type: "world"});
			expect(d.isConnected()).toEqual(false);

			jasmine.clock().tick(10000);
			expect(d.isConnected()).toEqual(true);

			bus.removePort(c.port);
			jasmine.clock().tick(10000);

			expect(d.isConnected()).toEqual(false);
		});

		it("sends device announcements on session announcements",async ()=>{
			TFB.tfb_srand(0);
			jasmine.clock().mockDate(new Date(1000));
			let bus=new Bus();
			let device=new TinyFieldbusDevice({port: bus.createPort(), name: "hello", type: "world"});
			jasmine.clock().tick(1000);
			let controller=new TinyFieldbusController({port: bus.createPort()});
			jasmine.clock().tick(5000);
			expect(device.isConnected()).toEqual(true);

			expect(bus.frame_log.slice(0,8)).toEqual([
				{ announce_name: 'hello', announce_type: 'world', checksum: 113 },
				{ session_id: 15224, checksum: 24 },
				{ announce_name: 'hello', announce_type: 'world', checksum: 113 },
				{ assign_name: 'hello', to: 1, session_id: 15224, checksum: 42 },
				{ session_id: 15224, checksum: 24 },
				{ from: 1, checksum: 25 },
				{ session_id: 15224, checksum: 24 },
				{ from: 1, checksum: 25 }
			]);

			//console.log(bus.frame_log.slice(0,8));
		});

		it("removes devices on missing ack",async ()=>{
			TFB.tfb_srand(0);
			jasmine.clock().mockDate(new Date(1000));
			let bus=new Bus();
			let device=new TinyFieldbusDevice({port: bus.createPort(), name: "hello", type: "world"});
			let controller=new TinyFieldbusController({port: bus.createPort()});
			jasmine.clock().tick(1000);

			bus.removePort(device.port);

			let deviceEp=controller.getDeviceByName("hello");
			let deviceEpEvents=new EventCapture(deviceEp,["close"]);
			deviceEp.send("there?");
			jasmine.clock().tick(10000);

			//console.log(bus.frame_log);
			expect(deviceEpEvents.events.length).toEqual(1);
			expect(deviceEpEvents.events[0].type).toEqual("close");
			expect(Object.values(controller.devicesByName).length).toEqual(0);
		});

		it("removes devices on no activity",async ()=>{
			TFB.tfb_srand(0);
			jasmine.clock().mockDate(new Date(1000));
			let bus=new Bus();
			let device=new TinyFieldbusDevice({port: bus.createPort(), name: "hello", type: "world"});
			let controller=new TinyFieldbusController({port: bus.createPort()});
			jasmine.clock().tick(1000);

			let deviceEp=controller.getDeviceByName("hello");
			//deviceEp.addEventListener("close",()=>console.log("******* closed"));
			let deviceEpEvents=new EventCapture(deviceEp,["close"]);
			jasmine.clock().tick(10000);

			expect(Object.values(controller.devicesByName).length).toEqual(1);

			bus.removePort(device.port);
			jasmine.clock().tick(10000);
			expect(deviceEpEvents.events.length).toEqual(1);
			expect(deviceEpEvents.events[0].type).toEqual("close");
			expect(Object.values(controller.devicesByName).length).toEqual(0);

			//console.log(bus.frame_log);
		});
	});

	it("assigns",async ()=>{
		let promise=new ResolvablePromise();
		let frame_log=[];
		let bus=new Bus();
		bus.on("frame",o=>{
			//console.log(o); 
			frame_log.push(o);
			if (o.assign_name)
				promise.resolve();
		});

		let controllerDevice;
		let controller=new TinyFieldbusController({port: bus.createPort()});
		controller.addEventListener("device",ev=>{
			controllerDevice=ev.device;
		});
		let device=new TinyFieldbusDevice({port: bus.createPort(), name: "devname", type: "devtype"});

		await promise;

		//console.log(controllerDevice);
		expect(controllerDevice.name).toEqual("devname");
		expect(controllerDevice.id).toEqual(1);
	});

	it("can send and receive",async ()=>{
		let done=new ResolvablePromise();
		let deviceEndpointPromise=new ResolvablePromise();
		let frame_log=[];
		let messages=[];
		let bus=new Bus();
		bus.on("frame",o=>{
			//console.log(o); 
			frame_log.push(o);
		});

		let controller=new TinyFieldbusController({port: bus.createPort()});
		controller.addEventListener("device",ev=>deviceEndpointPromise.resolve(ev.device));
		let device=new TinyFieldbusDevice({port: bus.createPort(), name: "devname", type: "devtype"});
		device.addEventListener("message",ev=>{
			messages.push("c: "+arrayBufferToString(ev.data));
			if (messages.length==3)
				done.resolve();
		});

		let deviceEndpoint=await deviceEndpointPromise;
		deviceEndpoint.addEventListener("message",ev=>{
			messages.push("d: "+arrayBufferToString(ev.data));
			if (messages.length==3)
				done.resolve();
		});

		deviceEndpoint.send("hello from the controller");
		device.send("hello");
		device.send("again");

		await done;
		expect(messages).toContain("d: hello");
		expect(messages).toContain("d: again");
		expect(messages).toContain("c: hello from the controller");
	});
});