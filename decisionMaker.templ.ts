import { Decision } from './decision';
import { SunProvider, SunInfo } from './sunProvider';
import { Group } from 'node-tradfri-client/build';
import * as moment from "moment";
import * as babel from "babel-polyfill";
import { Logger } from './logger';

export class DecisionMaker {
	private logger: Logger;
	private sunProvider: SunProvider;
	private sunUpdated: Date = null;

	constructor(sunProvider: SunProvider, logger: Logger) {
		this.sunProvider = sunProvider;
		this.logger = logger;
	}

	private printSunTimes() {
		if (this.sunUpdated != null && this.sunProvider.getCacheUpdated().getTime() === this.sunUpdated.getTime())
			return;
		this.sunUpdated = this.sunProvider.getCacheUpdated();

		// for log-file only
		// include the sun-relative times that you use in conditions
		// sorted from earliest to latest
		this.logger.log(`sunrise - 00:30 = ${this.sunrise("-00:30")}`);
		this.logger.log(`sunrise         = ${this.sunrise()}`);
		this.logger.log(`sunrise + 01:30 = ${this.sunrise("01:30")}`);
		this.logger.log(`sunset          = ${this.sunset()}`);
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
				power: 50, // 50% dimmed
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
				power: 0
			});
		} else if (group.name === "Hall") {
			// turn on and off at specific times
			if (time === "16:00" || time === "23:15") {
				return new Decision({
					power: 1 // lowest possible light
				});
			} else if (time === "08:00") {
				return new Decision({
					power: 0
				});
			}
		} else if (group.name === "Outdoor") {
			if (time === this.sunset()) {
				return new Decision({
					power: 95
				});
			} else if (time === this.sunrise()) {
				return new Decision({
					power: 0
				});
			}
		}

		return null;
	}

	private sunrise(hhmm = "00:00"): string {
		var diff = moment.duration(`${hhmm}:00.000`);
		var time = this.sunProvider.getTimes().sunrise.add(diff);
		// this.logger.log(hhmm);
		// this.logger.log(diff);
		// this.logger.log(time);
		return time.format("HH:mm");
	}

	private sunset(hhmm = "00:00"): string {
		var diff = moment.duration(hhmm);
		var time = this.sunProvider.getTimes().sunset.add(diff);
		// this.logger.log(hhmm);
		// this.logger.log(diff);
		// this.logger.log(time);
		return time.format("HH:mm");
	}
}
