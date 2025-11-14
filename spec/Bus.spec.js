import Bus, {encodeFrame, decodeFrame} from "./Bus.js";
import TFB from "../src.js/tfb.js";

describe("bus",()=>{
	it("can encode a frame",()=>{
		let data=encodeFrame({to: 1, ack: 123, announce_name: "hello"});
		//console.log(data);

		let decoded=decodeFrame(data);
		//console.log(decoded);

		expect(decoded).toEqual({ to: 1, ack: 123, announce_name: 'hello', checksum: 1 });
	});

	it("can send and receive",()=>{
		let b=new Bus();
		let log=[];

		let ports=[];
		for (let i=0; i<3; i++) {
			ports[i]=b.createPort();
			ports[i].on("data",data=>{
				log.push("recv on "+i+": "+String(data));
				//console.log("recv on "+i+": "+String(data));
			})
		}

		ports[1].write("hello");

		expect(log).toEqual([
			"recv on 0: hello",
			"recv on 2: hello"
		]);
	});
});