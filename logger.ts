import * as moment from 'moment';

export class Logger {
	public log(line: string): void {
		var m = moment();
		console.log(`${m.format("YYYY-MM-DD HH:mm:ss.SSS")}: ${line}`);
	}
}
