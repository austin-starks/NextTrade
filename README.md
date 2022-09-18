# NextTrade

A system to create algorithmic trading strategies

## Overview

The system is divided into 3 main functionalities:

- The client - this is the interface that users will interact with.
- The server - this receives requests from the user and sends back the requested data or executes the user's action.
- The app - executes the live-trading and paper-trading functionality in the application

All systems are currently implemented using TypeScript. The client is located in the client folder and is implemented using React. The server and app are implemented using NodeJS are located in the app folder. While the server and app share the same codebase, they are deployed on different instances to isolate their unique functionality and ensure separation of concerns.

## Installation

1. Clone the repository.
2. [Download MongoDB community edition](https://docs.mongodb.com/manual/administration/install-community/). Turn on MongoDB. It is recommended that you turn it on in the background so that you can close the tab.
3. Open your IDE to the NextTrade folder. It is recommended to use VSCode, but you can use any IDE that you want. Open a terminal window within the IDE.
4. Install the dependencies: `npm run install-all`
5. Make sure all tests pass: `cd app; npm t`
6. Add secrets to the env file (in app folder) and rename the file to .env

## Turning on the system

To turn on the client and server:

1. Open two terminal windows.
2. In one window, turn on the client: `cd client; npm start`
3. In the other window, turn on the server: `cd app; npm start`

## System Architecture and Design
https://drive.google.com/file/d/1yj63cTSuwasXW4TfEjmUL5qMdZYKH2hb/view?usp=sharing
