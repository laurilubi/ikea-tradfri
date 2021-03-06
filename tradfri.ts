import { FamilyDetector } from './familyDetector';
import { Group, TradfriClient, AccessoryTypes, Accessory } from 'node-tradfri-client/build';
import { config } from "./config";
import { Decision } from './decision';
import { DirectController } from './directController';
import { DecisionMaker } from './decisionMaker';
import { SunProvider, GeoPosition } from './sunProvider';
import { Logger } from './logger';
import { AwayController } from './awayController';

const tradfri = new TradfriClient(config.addr);
var groups = {};
var lights = {};
var hasFullConnection = false;
const logger = new Logger();
const sunProvider = new SunProvider(config.geo, logger);
const directController = new DirectController(logger);
const decisionMaker = new DecisionMaker(sunProvider, logger);
const familyDetector = new FamilyDetector(config.family, logger);
const awayController = new AwayController(config.away, groups, familyDetector, logger);

var handleConnect = async function (): Promise<void> {
	tradfri.reset();
	for (var key in groups)
		delete groups[key];
	for (var key in lights)
		delete lights[key];
	hasFullConnection = false;

	logger.log(`Connecting to ${config.addr} ...`);
	var result = await tradfri.connect(config.identity, config.psk);
	if (result == false) throw new Error("Could not connect");

	logger.log("Connected");
};

var handleGroups = async function (): Promise<void> {
	logger.log("Fetching groups...");
	return new Promise<void>((resolve) => {
		var doneHandler = null;
		var done = function () {
			//log("- groups fetched");
			resolve();
		}

		var groupUpdated = function (group: Group) {
			if (doneHandler != null) clearTimeout(doneHandler);
			doneHandler = setTimeout(done, 500);

			logger.log(`- group ${group.instanceId} ${group.name}`);
			groups[group.instanceId] = group;
		};

		tradfri
			.on("group updated", groupUpdated)
			.observeGroupsAndScenes();
		doneHandler = setTimeout(done, 2000);
	});
};

var handleLights = async function (): Promise<void> {
	logger.log("Fetching lights...");
	return new Promise<void>((resolve) => {
		var doneHandler = null;
		var done = function () {
			//log("- lights fetched");
			hasFullConnection = true;
			resolve();
		}

		var lightUpdated = function (device: Accessory) {
			if (doneHandler != null) clearTimeout(doneHandler);
			doneHandler = setTimeout(done, 500);

			if (device.type !== AccessoryTypes.lightbulb) return;
			var light = device.lightList[0];
			var power = light.onOff ? light.dimmer : 0;
			var colorTempStr = light.colorTemperature == null ? "" : ` (${light.colorTemperature}°)`;
			var isDeadStr = device.alive ? "" : " (dead)";
			logger.log(`- light ${device.instanceId} power=${power}${colorTempStr} ${device.name} ${isDeadStr}`);
			lights[device.instanceId] = device;
		};

		tradfri
			.on("device updated", lightUpdated)
			.observeDevices();
		doneHandler = setTimeout(done, 2000);
	});
};

var pollForDecisions = function () {
	sunProvider.getTimes(); // trigger load from external API

	familyDetector.FamilyLeft.on(() => { awayController.onFamilyLeft(operateGroup); });
	familyDetector.FamilyReturned.on(() => { awayController.onFamilyReturned(operateGroup); });

	logger.log("Polling for decisions from now on");
	setInterval(makeDirectDecisions, 5 * 1000);

	// setTimeout(makeDecisions, 5 * 1000);
	setInterval(makeDecisions, 30 * 1000);
};

var makeDirectDecisions = async function () {
	for (let groupId in groups) {
		let group = groups[groupId];

		const decision = directController.pollForDecision(group);
		if (decision != null)
			await operateGroup(group, decision);
	}
};

var makeDecisions = async function () {
	// log("Checking for a decision");

	for (let groupId in groups) {
		let group = groups[groupId];

		const awayDecision = awayController.makeDecision(group);
		if (awayDecision != null)
			await operateGroup(group, awayDecision);

		const decision = decisionMaker.makeDecision(group);
		if (decision != null)
			await operateGroup(group, decision);
	}
};

var operateGroup = async function (group: Group, decision: Decision) {
	// built-in functions fail to work
	// const operation =  {
	// onOff: true
	// };
	// const requestSent = await tradfri.operateGroup(group, operation);
	await guaranteeConnection();

	// logger.log(`Group ${group.name} (${group.instanceId}) operation ${JSON.stringify(decision)} devices=${JSON.stringify(group.deviceIDs)}`);
	for (var deviceId of group.deviceIDs) {
		//log(deviceId);
		const device = lights[deviceId];
		if (device == null) continue;
		const light = device.lightList[0];

		var success = null;
		var logInfo = "";
		// if (decision.onOff != null) {
		// 	success = await light.toggle(decision.onOff);
		// 	logInfo = `toggle=${decision.onOff}`;
		// }
		if (decision.power != null) {
			if (decision.power === 0) {
				success = await light.toggle(false);
			} else {
				success = await light.setBrightness(decision.power, config.transitionTime);
				success &= await light.toggle(true);
			}
			logInfo = `power=${decision.power}`;
		}
		if (decision.color != null) {
			success = await light.setHue(decision.color, config.transitionTime);
			logInfo = `color=${decision.color}`;
		}
		if (decision.colorTemp != null) {
			success = await light.setColorTemperature(decision.colorTemp, config.transitionTime);
			logInfo = `colorTemp=${decision.colorTemp}`;
		}

		if (success)
			logger.log(`COMMAND ${logInfo} (${deviceId} ${device.name})`);
		// else
		// 	logger.log(`skipped ${logInfo} (${deviceId})`);
	}
};

var guaranteeConnection = async function () {
	// logger.log("Pinging gateway");
	var isConnected = await tradfri.ping();
	// logger.log(`isConnected=${isConnected}`);
	if (isConnected && hasFullConnection) return;

	logger.log("Ping failed, reconnecting...");
	await handleConnect();
	await handleGroups();
	await handleLights();
}

// main
guaranteeConnection().then(() => {
	pollForDecisions();

	familyDetector.updatePingStatus();
	setInterval(function () {
		familyDetector.updatePingStatus();
		setTimeout(function () {
			familyDetector.printStatusChange();
		}, 5000);
	}, config.family.pingInterval * 1000);

	setInterval(function () { guaranteeConnection(); }, 60 * 1000);
}).catch();
