import { GeoPosition } from "./sunProvider";

export const config = {
	addr: "GW-ABCDEFGHI123", // host name, see under the gateway; or IP address
	securityCode: "aBcDeFgHiJkLmNoP", // see under the gateway
	identity: "tradfri_1234567890123", // first time, create identity and psk via auth.ts
	psk: "aBcDeFgHiJkLmNoP",
	transitionTime: 3, // in seconds
	geo: new GeoPosition({
		latitude: 59.8546472, // Uppsala, Sweden
		longitude: 17.6145007
	})
};
