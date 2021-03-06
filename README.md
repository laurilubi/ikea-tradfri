# ikea-tradfri
Dynamic scheduling of ikea lights via Ikea Gateway

# Features
- Control light groups in detail
- Auto-reconnect
- Times based on local sunrise and sunset
- Detect that no one is at home by wifi and mobiles

# Plans
- If no one is at home, run in low-energy mode but sometimes changes happen

# Installation
- Install nodejs from https://nodejs.org/en/download/ or by any other means.

For kali linux, run:

`curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -`

`sudo apt-get install -y nodejs`

`node -v`

- Install global nodejs packages

`npm install -g typescript ts-node`

`npm install --save-dev @types/es6-promise`

`npm install --save-dev @types/es6-collections`

- Install folder-local nodejs packages

These can also be global if you want.

`cd /ikea` # or any new folder

`npm install node-tradfri-client babel-polyfill moment axios node-nmap list-files-in-dir linq-es2015`

- Set your configuration

`cp config.templ.ts config.ts`

Modify `config.ts` for your needs.

- Set your scheduling

`cp decisionMaker.templ.ts decisionMaker.ts`

Modify `decisionMaker.ts` for your needs.

- Execute

`ts-node tradfri.ts >> log`
