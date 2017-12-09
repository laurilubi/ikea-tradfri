import { Group, TradfriClient, AccessoryTypes, Accessory } from 'node-tradfri-client/build';
import { config } from "./config";
import { Decision, DecisionMaker } from './decisionMaker';
import { SunProvider, GeoPosition } from './sunProvider';
import { Logger } from './logger';

const tradfri = new TradfriClient(config.addr);
const groups = {};
const lights = {};
const logger = new Logger();
const sunProvider = new SunProvider(config.geo, logger);
const decisionMaker = new DecisionMaker(sunProvider, logger);

var handleConnect = async function (): Promise<void> {
	log(`Connecting to ${config.addr} ...`);
	var result = await tradfri.connect(config.identity, config.psk);
	if (result == false) throw new Error("Could not connect");

	log("Connected");
};

var handleGroups = async function (): Promise<void> {
	log("Fetching groups...");
	return new Promise<void>((resolve) => {
		var doneHandler = null;
		var done = function () {
			//log("- groups fetched");
			resolve();
		}

		var groupUpdated = function (group: Group) {
			if (doneHandler != null) clearTimeout(doneHandler);
			doneHandler = setTimeout(done, 500);

			log(`- group ${group.instanceId} ${group.name}`);
			groups[group.instanceId] = group;
		};

		tradfri
			.on("group updated", groupUpdated)
			.observeGroupsAndScenes();
		doneHandler = setTimeout(done, 2000);
	});
};

var handleLights = async function (): Promise<void> {
	log("Fetching lights...");
	return new Promise<void>((resolve) => {
		var doneHandler = null;
		var done = function () {
			//log("- lights fetched");
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
			log(`- light ${device.instanceId} power=${power}${colorTempStr} ${device.name} ${isDeadStr}`);
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

	log("Polling for decisions from now on");
	//setTimeout(makeDecisions, 1);
	setInterval(makeDecisions, 15 * 1000);
};

var makeDecisions = async function () {
	// log("Checking for a decision");

	for (let groupId in groups) {
		let group = groups[groupId];

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

	log(`Group ${group.name} (${group.instanceId}) operation ${JSON.stringify(decision)} devices=${JSON.stringify(group.deviceIDs)}`);
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
			log(`CMD ${logInfo} (${deviceId} ${device.name})`);
		else
			log(`skipped ${logInfo} (${deviceId})`);
	}
};

var log = function (line) {
	logger.log(line);
};

// main
handleConnect().then(() => {
	handleGroups().then(() => {
		handleLights().then(() => {
			pollForDecisions();
		});
	});
});
