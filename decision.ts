import * as babel from 'babel-polyfill';

export class Decision {
	public power: number = null; // combined onOff and dimmer
	public colorTemp: number = null; // 0, 63, 100
	public color: string = null;

	public constructor(init?: Partial<Decision>) {
		Object.assign(this, init);
	}
}
