import { Group, TradfriClient, AccessoryTypes, Accessory } from 'node-tradfri-client/build';
import { config } from "./config";

const tradfri = new TradfriClient(config.addr);

// required only once
tradfri.authenticate(config.securityCode).then((response) => {
    const { identity, psk } = response;

    console.log("Write identity and psk in config.ts");
    console.log(`identity: ${identity}`);
    console.log(`psk: ${psk}`);
}).catch((error) => {
    console.log("error: " + error);
});
