import { Decision } from './decision';
import { listFilesSync } from 'list-files-in-dir';
import { Group } from 'node-tradfri-client/build';
import * as babel from 'babel-polyfill';
import { Logger } from './logger';
import * as Enumerable from 'linq-es2015'
// import { asEnumerable, Range } from 'ts-linq';
import * as fs from 'fs';

export class DirectController {
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	public pollForDecision(group: Group): Decision {
		for (var filePath of listFilesSync("control")) {
			const command = this.getCommand(filePath);
			if (command[0] !== group.name) continue;

			this.logger.log("Found file " + filePath);

			var hasOptions = false;
			var decision = new Decision();
			for (var i = 1; i < command.length; i++) {
				if (command[i].startsWith("p")) {
					decision.power = parseInt(command[i].substring(1));
					hasOptions = true;
				}
			}

			fs.unlink(filePath);
			return hasOptions
				? decision
				: null;
		}

		return null;
	}

	private getCommand(filePath: string): string[] {
		const fileName = Enumerable.asEnumerable(filePath.split("/")).Last();
		const parts = fileName.split("-");
		return parts;
	}
}
