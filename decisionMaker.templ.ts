import { Group } from 'node-tradfri-client/build';
import * as moment from "moment";
import * as babel from "babel-polyfill";

export class DecisionMaker {
	public makeDecision(group: Group): Decision {
		var m = moment();
		var time = m.format("HH:mm"); // eg "08:00"
		var weekday = m.day(); // Su Mo ... Fr Sa
		var weektime = m.format("dd HH:mm"); // eg "Su 08:23"
		//log(JSON.stringify({ time: time, weekday: weekday, weektime: weektime, m: m }));

		if (group.name === "Living room" && time === "19:00") {
			// condition for group and time
			// switch to softer color/temperature in the living room at 19:00
			return new Decision({
				dimmer: 50, // 50% dimmed
				colorTemp: 100 // 0, 63, 100
			});
		} else if ((group.name === "Bed room" || group.name === "Living room")
			&& (time === "23:15" || time === "00:30" || time === "09:00")) {
			// condition applies to several groups and times
			// turn off the lights in the living room and bed room
			// - at night 23:15
			// - also later at 00:30 if you turned them on manuallt
			// - in the morning if you forgot
			return new Decision({
				dimmer: 0
			});
		} else if (group.name === "Hall") {
			// turn on and off at specific times
			if (time === "16:00" || time === "23:15") {
				return new Decision({
					dimmer: 1 // lowest possible light
				});
			} else if (time === "08:00") {
				return new Decision({
					dimmer: 0
				});
			}
		}

		return null;
	}
}

export class Decision {
	public onOff: boolean = null;
	public dimmer: number = null;
	public colorTemp: number = null; // 0, 63, 100
	public color: string = null;

	public constructor(init?: Partial<Decision>) {
		Object.assign(this, init);
	}
};
