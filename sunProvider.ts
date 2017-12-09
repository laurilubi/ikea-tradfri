import * as moment from "moment";
import * as babel from "babel-polyfill";
import axios from 'axios';
import { Logger } from "./logger";

export class SunProvider {
	private logger: Logger;
	private apiBaseUrl: string = "https://api.sunrise-sunset.org";

	private cache: SunInfo = new SunInfo({
		sunrise: moment("06:00", "HH:mm"),
		sunset: moment("18:00", "HH:mm")
	});
	private cacheUpdated: Date = null;

	private geo: GeoPosition = null;

	constructor(geo: GeoPosition, logger: Logger) {
		this.geo = new GeoPosition(geo);
		this.logger = logger;
	};

	public getTimes(): SunInfo {
		if (this.cacheNeedsUpdate())
			this.updateCache();

		return new SunInfo(this.cache);
	}

	public getCacheUpdated(): Date {
		return new Date(this.cacheUpdated);
	}

	private cacheNeedsUpdate(): boolean {
		if (this.cacheUpdated == null) return true;

		var todayDoy = moment().dayOfYear();
		var cacheUpdatedDoy = moment(this.cacheUpdated).dayOfYear();
		return cacheUpdatedDoy != todayDoy;
	}

	private async updateCache(): Promise<void> {
		try {
			if (this.geo == null)
				throw new Error("Geo position is required.");

			const url = `${this.apiBaseUrl}/json?lat=${this.geo.latitude}&lng=${this.geo.longitude}&formatted=0`;
			this.logger.log(`Downloading from ${url}`);
			axios.get(url)
				.then(response => {
					if (response.data.status !== "OK")
						throw new Error(`API status: ${response.data.status}`);

					var sunrise = moment.utc(response.data.results.civil_twilight_begin);
					sunrise.local();
					// this.logger.log(sunrise);
					var sunset = moment.utc(response.data.results.civil_twilight_end);
					sunset.local();
					// this.logger.log(sunset);

					this.cache = new SunInfo({
						sunrise: sunrise,
						sunset: sunset
					});
					this.logger.log("Updated sunProvider cache:");
					this.logger.log(`    ${this.cache.sunrise}`);
					this.logger.log(`    ${this.cache.sunset}`);
					// this.logger.log(response.data);
					// this.logger.log(response.data.url);
					// this.logger.log(response.data.explanation);

					this.cacheUpdated = new Date();
				})
				.catch(error => {
					throw new Error(error);
				});
		} catch (error) {
			this.logger.log("SunProvider: " + error);
		}
	}
}

export class SunInfo {
	public sunrise: any = null; // moment
	public sunset: any = null; // moment

	public constructor(init?: Partial<SunInfo>) {
		if (init == null) return;
		if (init.sunrise != null)
			this.sunrise = moment(init.sunrise);
		if (init.sunset != null)
			this.sunset = moment(init.sunset);
		// Object.assign(this, init);
	}
}

export class GeoPosition {
	public latitude: number = null;
	public longitude: number = null;

	public constructor(init?: Partial<GeoPosition>) {
		Object.assign(this, init);
	}
}
