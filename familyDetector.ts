import { SunProvider, SunInfo } from './sunProvider';
import * as moment from 'moment';
import * as babel from 'babel-polyfill';
import { Logger } from './logger';
import { LiteEvent } from './liteEvent';
import * as nmap from 'node-nmap';

export class FamilyDetector {
	private logger: Logger;
	private config: FamilyDetectorConfig;
	private lastSeens: object = {};
	private assumeState: boolean = true;
	private prevStatus: string = null;
	private prevIsFamilyAtHome: boolean = null;
	private readonly onFamilyLeft = new LiteEvent<void>();
	private readonly onFamilyReturned = new LiteEvent<void>();
	private readonly initTime = new Date();

	constructor(config: FamilyDetectorConfig, logger: Logger) {
		this.config = config;
		this.logger = logger;

		if (this.config == null) return;
		if (this.config.pingIps.length == 0) return;
	}

	public isFamilyAtHome(): boolean {
		for (var ip of this.config.pingIps) {
			if (this.isAtHome(ip) === false) continue;
			return true;
		}
		return false;
	}

	public get FamilyLeft() { return this.onFamilyLeft.expose(); }
	public get FamilyReturned() { return this.onFamilyReturned.expose(); }

	private checkTriggerEvents(): void {
		if (moment(this.initTime).add(5, "seconds") > moment()) {
			this.logger.log("Skipping family event during the first 5 seconds. Initial nmap scan might be in progress.");
			return;
		}

		var newIsFamilyAtHome = this.isFamilyAtHome();
		if (newIsFamilyAtHome === this.prevIsFamilyAtHome) return;

		if (this.prevIsFamilyAtHome === null) {
			this.prevIsFamilyAtHome = newIsFamilyAtHome;
			return;
		}

		if (newIsFamilyAtHome)
			this.onFamilyReturned.trigger();
		else
			this.onFamilyLeft.trigger();
		this.prevIsFamilyAtHome = newIsFamilyAtHome;
	}

	private getLastSeen(ip: string): Date {
		var lastSeen = this.lastSeens[ip];
		if (lastSeen == null) return null;

		var lastSeenDate = new Date(lastSeen);
		return lastSeenDate;
	}

	private isAtHome(ip: string): boolean {
		var lastSeen = this.getLastSeen(ip);
		return lastSeen != null && lastSeen >= moment().add(-this.config.awayInterval, "seconds").toDate();
	}

	public updatePingStatus(): void {
		var self = this;
		for (var ip of this.config.pingIps) {
			// this.logger.log(`updatePingStatus ${ip}`);
			var lastSeen = this.getLastSeen(ip);
			if (lastSeen != null && lastSeen >= moment().add(-this.config.awayInterval / 2, "seconds").toDate())
				continue;

			// this.logger.log(`QuickScan for ${ip}`);
			let quickscan = new nmap.QuickScan(ip);
			quickscan.on("complete", function (data) {
				// self.logger.log(JSON.stringify(data));
				for (var host of data) {
					var aliveIp = host.ip;
					self.lastSeens[aliveIp] = new Date();
					// self.logger.log(`Alive host ${aliveIp}`);
				}
				self.checkTriggerEvents();
			}).on("error", function (error) {
				self.logger.log(`nmap error: ${error}`);
				self.checkTriggerEvents();
			});
		}
		self.checkTriggerEvents();
	}

	public printStatus(): void {
		var isFamilyAtHome = this.isFamilyAtHome() ? "HOME" : "AWAY";
		this.logger.log(`Family status: ${isFamilyAtHome}`);
		for (var ip of this.config.pingIps) {
			var aliveStr = this.isAtHome(ip) ? "alive" : "     ";
			var lastSeen = this.getLastSeen(ip);
			var lastSeenStr = lastSeen == null ? "" : moment(lastSeen).format("HH:mm:ss");
			this.logger.log(`    ${ip} ${aliveStr} ${lastSeenStr}`);
		}
	}

	public printStatusChange(): void {
		var currStatus = this.getStatus();
		if (currStatus == this.prevStatus) return;

		this.printStatus();
		this.prevStatus = currStatus;
	}

	private getStatus(): string {
		var status = [];
		for (var ip of this.config.pingIps) {
			var item = {
				ip: ip,
				alive: this.isAtHome(ip)
			};
			status.push(item);
		}
		return JSON.stringify(status);
	}
}

export class FamilyDetectorConfig {
	public pingIps: string[] = [];
	public pingInterval: number = 30;
	public awayInterval: number = 360;

	public constructor(init?: Partial<FamilyDetectorConfig>) {
		Object.assign(this, init);
	}
}
