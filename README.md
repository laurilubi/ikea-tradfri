# ikea-tradfri
Dynamic scheduling of ikea lights via Ikea Gateway

# Features
- Control light groups in detail
- Times based on local sunrise and sunset

# Plans
- No one at home runs low-energy but sometimes changes happen
- Detect that no one is at home by wifi and mobiles

# Installation
- Install nodejs from https://nodejs.org/en/download/ or by any other means.

For kali linux, run:

`curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -`

`sudo apt-get install -y nodejs`

- Install global nodejs packages

`npm install -g typescript ts-node`

`npm install --save-dev @types/es6-promise`

`npm install --save-dev @types/es6-collections`

- Install folder-local nodejs packages

These can also be global if you want.

`cd /ikea` # or any new folder

`npm install node-tradfri-client babel-polyfill moment axios`

- Set your configuration

`cp config.templ.ts config.ts`

Modify `config.ts` for your needs.

- Set your scheduling

`cp decisionMaker.templ.ts decisionMaker.ts`

Modify `decisionMaker.ts` for your needs.

- Execute

`ts-node tradfri.ts >> log`
