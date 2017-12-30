import { FamilyDetector } from './familyDetector';
import { Decision } from './decision';
import { listFilesSync } from 'list-files-in-dir';
import { Group } from 'node-tradfri-client/build';
import * as babel from 'babel-polyfill';
import { Logger } from './logger';
import * as Enumerable from 'linq-es2015';
import * as moment from 'moment';

export class AwayController {
	private selectedPrimaryGroupName: string = null;
	private selectedSecondaryGroupName: string = null;
	private lastPrimaryChange: Date = null;
	private lastSecondaryChange: Date = null;
	private nextPrimaryChange: Date = null;
	private nextSecondaryChange: Date = null;

	private config: AwayConfig;
	private groups: object;
	private familyDetector: FamilyDetector;
	private logger: Logger;

	constructor(config: AwayConfig, groups: object, familyDetector: FamilyDetector, logger: Logger) {
		this.config = new AwayConfig(config);
		this.groups = groups;
		this.familyDetector = familyDetector;
		this.logger = logger;

		// this.familyDetector.FamilyLeft.on(() => { this.onFamilyLeft(); });
		// this.familyDetector.FamilyReturned.on(() => { this.onFamilyReturned(); });
	}

	private getGroup(groupName: string): Group {
		var self = this;
		const groupId = Object.keys(self.groups)
			.filter(function (_) {
				return self.groups[_].name === groupName;
			})[0];
		const group = self.groups[groupId];
		return group;
		// const group = Enumerable.asEnumerable(this.groups)
		// 	.Single(_ => _.name === groupName);
	}

	public onFamilyLeft(operateGroupFunc): void {
		// if (this.familyDetector.isFamilyAtHome()) return;
		// if (this.isIncluded(group.name) === false) return null;

		this.logger.log("Family left");
		this.selectNewPrimaryGroup();

		for (var groupName of this.config.primaryGroupNames) {
			var decision = new Decision({
				power: this.getPower(groupName)
			});
			operateGroupFunc(this.getGroup(groupName), decision);
		}

		for (var groupName of this.config.secondaryGroupNames) {
			var decision = new Decision({
				power: 0
			});
			operateGroupFunc(this.getGroup(groupName), decision);
		}
	}

	public onFamilyReturned(operateGroupFunc): void {
		// if (this.familyDetector.isFamilyAtHome()) return;
		// if (this.isIncluded(group.name) === false) return null;

		this.logger.log("Family returned");
		for (var groupName of this.config.primaryGroupNames) {
			var decision = new Decision({
				power: 90
			});
			operateGroupFunc(this.getGroup(groupName), decision);
		}
	}

	public makeDecision(group: Group): Decision {
		if (this.familyDetector.isFamilyAtHome()) return;
		// if (this.config == null) return null;
		if (this.isIncluded(group.name) === false) return null;

		const nowHhmm = moment().format("HH:mm");
		this.updatePrimaryLogic(group.name);
		// this.updateSecondaryLogic(group.name);

		if (moment(this.lastPrimaryChange).format("HH:mm") !== nowHhmm) return;

		var decision = new Decision();
		if (group.name === this.selectedPrimaryGroupName) {
			decision.power = 70; //Math.round(30 + Math.random() * 30);
		} else {
			decision.power = 0;
		}
		return decision;
	}

	private getPower(groupName: string): number {
		// TODO sunrise+1h
		// TODO sunset-1h
		if (groupName === this.selectedPrimaryGroupName) {
			return Math.round(30 + Math.random() * 30);
		} else {
			return 0;
		}
	}

	private updatePrimaryLogic(groupName: string): void {
		// if (this.selectedPrimaryGroupName != null && groupName !== this.selectedPrimaryGroupName) return;

		const shouldChange = this.getShouldChange(
			this.selectedPrimaryGroupName,
			this.nextPrimaryChange);
		if (shouldChange === false) return;

		this.selectNewPrimaryGroup();
	}

	private selectNewPrimaryGroup(): void {
		var self = this;
		// TODO exclude dead lights and groups
		const otherGroupNames = Object.keys(this.groups)
			.map(function (key) {
				return self.groups[key].name;
			}).filter(function (groupName) {
				return groupName !== self.selectedPrimaryGroupName
					&& Enumerable.asEnumerable(self.config.primaryGroupNames).Any(_ => _ == groupName);
			});
		// this.logger.log(`otherGroupNames: ${JSON.stringify(otherGroupNames)}`);

		if (otherGroupNames.length > 0) {
			var rnd = Math.floor(Math.random() * otherGroupNames.length);
			this.selectedPrimaryGroupName = otherGroupNames[rnd];
			this.lastPrimaryChange = new Date();
		}

		const spanMinutes = this.config.slowestChangeMinutes - this.config.fastestChangeMinutes;
		const rndMinutes = Math.round(Math.random() * spanMinutes) + this.config.fastestChangeMinutes;
		this.nextPrimaryChange = moment().add(rndMinutes, "minutes").toDate();

		this.logger.log(`Selected new primary group: ${this.selectedPrimaryGroupName}`);
		this.logger.log(`               next change: ${this.nextPrimaryChange}`);
	}

	// private updateSecondaryLogic(groupName: string): void {
	// 	if (this.selectedSecondaryGroupName != null && groupName !== this.selectedSecondaryGroupName) return;

	// 	const shouldChange = this.getShouldChange(
	// 		this.selectedSecondaryGroupName,
	// 		this.lastSecondaryChange);
	// 	if (shouldChange === false) return;

	// 	// TODO choose selectedSecondaryGroupName
	// 	this.selectedSecondaryGroupName = "new sec group";
	// 	this.lastSecondaryChange = new Date();
	// }

	private isIncluded(groupName: string): boolean {
		const isPrimary = Enumerable.asEnumerable(this.config.primaryGroupNames).Any(_ => _ == groupName);
		// this.logger.log(`groupName=${groupName}`);
		// this.logger.log(`isPrimary=${isPrimary}`);
		// const isSecondary = Enumerable.asEnumerable(this.config.secondaryGroupNames).Any(_ => _ == groupName);
		return isPrimary; // || isSecondary;
	}

	private getShouldChange(
		selectedGroupName: string,
		nextChange: Date
		// groupCount: number
	): boolean {
		if (selectedGroupName == null) return true;
		if (nextChange == null) return true;

		return moment().format("HH:mm") >= moment(nextChange).format("HH:mm");

		// var now = moment();
		// var minTime = moment(nextChange).add(this.config.fastestChangeMinutes, "minutes");
		// var maxTime = moment(nextChange).add(this.config.slowestChangeMinutes, "minutes");
		// if (now <= minTime) return false; // block changing too fast
		// if (now >= maxTime) return true; // force chaning, too slow

		// const timeChance = (now - minTime) / (maxTime - minTime);
		// const retryCount = (maxTime - minTime).minutes() * 2; // checked twice per minute
		// const chance = timeChance / groupCount / retryCount;

		// const rnd = Math.random();
		// return rnd < chance;
	}
}

export class AwayConfig {
	public primaryGroupNames: string[] = [];
	public secondaryGroupNames: string[] = [];
	public fastestChangeMinutes: number = 15;
	public slowestChangeMinutes: number = 45;

	public constructor(init?: Partial<AwayConfig>) {
		Object.assign(this, init);
	}
}
