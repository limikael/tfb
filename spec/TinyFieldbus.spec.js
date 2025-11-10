import TinyFieldbusController from "../src.js/TinyFieldbusController.js";
import TinyFieldbusDevice from "../src.js/TinyFieldbusDevice.js";
import {ResolvablePromise, arrayBufferToString} from "../src.js/js-util.js";
import Bus from "./Bus.js";

describe("tiny fieldbus",()=>{
	describe("",()=>{
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
			d.addEventListener("connect",()=>event_log.push("connect"));
			d.addEventListener("close",()=>event_log.push("close"));
			expect(d.isConnected()).toEqual(false);

			jasmine.clock().tick(1000);
			expect(event_log).toEqual(["connect"]);
			expect(d.isConnected()).toEqual(true);
			expect(frame_log.length).toEqual(3);

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