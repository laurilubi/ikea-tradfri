import { SunProvider, SunInfo } from './sunProvider';
import { Group } from 'node-tradfri-client/build';
import * as moment from "moment";
import * as babel from "babel-polyfill";

export class DecisionMaker {
	private sunProvider: SunProvider;
	private sunUpdated: Date = null;

	constructor(sunProvider: SunProvider) {
		this.sunProvider = sunProvider;
	}

	private printSunTimes() {
		if (this.sunUpdated != null && this.sunProvider.getCacheUpdated().getTime() === this.sunUpdated.getTime())
			return;
		this.sunUpdated = this.sunProvider.getCacheUpdated();

		// for log-file only
		// include the sun-relative times that you use in conditions
		// sorted from earliest to latest
		console.log(`sunrise - 00:30 = ${this.sunrise("-00:30")}`);
		console.log(`sunrise         = ${this.sunrise()}`);
		console.log(`sunrise + 01:30 = ${this.sunrise("01:30")}`);
		console.log(`sunset          = ${this.sunset()}`);
	}

	public makeDecision(group: Group): Decision {
		var m = moment();
		var time = m.format("HH:mm"); // eg "08:00"
		var weekday = m.day(); // Su Mo ... Fr Sa
		var weektime = m.format("dd HH:mm"); // eg "Su 08:23"
		//log(JSON.stringify({ time: time, weekday: weekday, weektime: weektime, m: m }));
		this.printSunTimes();

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
		} else if (group.name === "Outdoor") {
			if (time === this.sunset()) {
				return new Decision({
					dimmer: 95
				});
			} else if (time === this.sunrise()) {
				return new Decision({
					dimmer: 0
				});
			}
		}

		return null;
	}

	private sunrise(hhmm = "00:00"): string {
		var diff = moment.duration(`${hhmm}:00.000`);
		var time = this.sunProvider.getTimes().sunrise.add(diff);
		// console.log(hhmm);
		// console.log(diff);
		// console.log(time);
		return time.format("HH:mm");
	}

	private sunset(hhmm = "00:00"): string {
		var diff = moment.duration(hhmm);
		var time = this.sunProvider.getTimes().sunset.add(diff);
		// console.log(hhmm);
		// console.log(diff);
		// console.log(time);
		return time.format("HH:mm");
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
