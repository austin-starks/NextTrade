# NextTrade - Plan your next trade

A system to create, test, optimize, and deploy algorithmic trading strategies.

[Read More about it here](https://medium.com/@austin-starks/i-created-an-open-source-automated-trading-platform-f9d94575ceba)

For a better, faster, cloud-based platform, [check out NexusTrade](https://nexustrade.io/). 

NexusTrade is a AI-Powered platform that streamlines the configuration of trading strategies. It's faster, more configurable, and more feature-rich than NextTrade. It features a powerful AI Chat Assistant tool as an entry point to many of its features.

Some improvements include:
 - Enhanced configurability: Can essentially express any trading idea you can imagine
 - AI-Powered Research Tools: Perform in-depth company analysis and compare companies between each other
 - Powerful stock screener: Use natural language to find stocks in over 130 industries and 30+ fundamental indicators

## NextTrade Features

1. Combine conditions to form compound conditions. Combine compound conditions and create trading strategies.
   - For example:
     - Condition A: QQQ stock is 1 SD below its 5-day mean price
     - Condition B: Buying power is above $8,000.
     - Condition C: Condition A and condition B
     - Strategy: If condition C, buy $3000 of SPY
2. Create unlimited portfolios with different combinations of strategies
3. Backtest those strategies using historical data.
   - Only stocks are currently supported, but cryptocurrency and options support is baked into the architecture
4. Optimize the strategy's parameters using a genetic algorithm
   - Choose hyperparameters like mutation rate, training period, validation period, and population size
   - Choose to optimize percent gain, sortino ratio, sharpe ratio, or max drawdown
5. Deploy the strategies live and see how it performs in real-time

## System Architecture and Design

Some architectural artifacts can be found at this link:
https://drive.google.com/drive/folders/1TgZNGPd7TBWi47dWh0TI2nZ_9WUhv_P_?usp=sharing

## Local Installation

### Prerequisites

1. Mac, Linux or WSL2 preferred
   - [How to set up Linux on Windows with WSL 2](https://s1gr1d.medium.com/how-to-set-up-linux-on-windows-with-wsl-2-debe2a64d20d)
2. Tradier Account (with at least a free sandbox token; additional brokers TBD)
   - [Production vs Sandbox data details](https://documentation.tradier.com/brokerage-api/overview/market-data)
   - [Sandbox Account and Signup info](https://documentation.tradier.com/brokerage-api/overview/endpoints)

### Mac Setup

1. Clone the repository.
2. Install [MongoDB community edition](https://docs.mongodb.com/manual/administration/install-community/) and enable it.
3. Install the dependencies: `npm run install-all`
4. Make sure all tests pass: `cd app && npm t && cd ..`
5. Add your Tradier token to the `./app/env` file and rename the file to .env

### Linux/WSL2 setup (tested on Ubuntu 20.04)

1. If needed, install Node.js. NVM Option:
   1. `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash`
   2. Exit and restart the terminal session.
   3. `nvm install --lts`
2. Install [MongoDB community edition](https://docs.mongodb.com/manual/administration/install-community/) and enable. For Ubuntu 20.04:
   1. `curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -`
   2. `echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list`
   3. `sudo apt update`
   4. `sudo apt install mongodb-org`
   5. Linux/Ubuntu specific:
      1. `sudo systemctl status mongod` (verify it's running)
      2. `sudo systemctl enable mongod` (to auto-start at boot)
   6. WSL2 specific:
      1. `sudo mkdir -p /data/db`
      2. `` sudo chown -R `id -un` /data/db ``
      3. `wget -O mongod.sh https://raw.githubusercontent.com/mongodb/mongo/master/debian/init.d`
      4. `sudo mv ./mongod.sh /etc/init.d/mongod`
      5. `sudo chmod +x /etc/init.d/mongod`
      6. `sudo service mongod start`
         - [Auto-start options for WSL2 on Win11](https://learn.microsoft.com/en-us/windows/wsl/wsl-config#boot-settings)
      7. `sudo service mongod status` (verify it's running)
   7. `mongo --eval 'db.runCommand({ connectionStatus: 1 })'` (verify it's working)
3. Clone the NextTrade repository: `cd ~ && git clone https://github.com/austin-starks/NextTrade && cd NextTrade`
4. Install the dependencies: `npm run install-all`
5. Copy the sample config file to .env `cp ./app/env ./app/.env`
6. Add your Tradier token to the `./app/.env` file
7. Make sure all tests pass: `cd app && npm t; cd ..`

## Turning on the system

### Manually managed

#### Development environment

1. Open two terminal windows.
2. In a terminal instance, turn on the client: `cd client; npm start`
3. In another terminal instance, turn on the server: `cd app; npm start`
4. Once started, load the app: [http://localhost:3000](http://localhost:3000)

### PM2 Managed

#### Setup

1. `npm install pm2@latest -g`
2. `cd ~/NextTrade/client && pm2 start npm --name "NextTrade-Client" -- start`
3. `cd ~/NextTrade/app && pm2 start npm --name "NextTrade-App" -- start`
4. `pm2 save`

#### Running (assuming no other PM2 apps)

1. To start the client+app: `pm2 start all`
2. To stop the client+app: `pm2 stop all`
3. Other Useful commands: `pm2 status`, `pm2 logs`, `pm2 monit` See [PM2 Quickstart](https://pm2.keymetrics.io/docs/usage/quick-start/) for more.
