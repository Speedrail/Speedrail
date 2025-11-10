# Speedrail

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Issues](https://img.shields.io/github/issues/Speedrail/Speedrail)](https://github.com/Speedrail/Speedrail/issues)
[![Version](https://img.shields.io/badge/version-0.06-orange)](https://github.com/Speedrail/Speedrail)

## Overview

Speedrail is a modern transit tracking and route planning app built with Expo and React Native. It has many useful features from a variety of apps combined into one, including live tracking, notifications, station maps, station data, etc.

## Features

- Real-time transit data 
- Live tracking view for stations and routes
- Route planning and station details
- Google Maps and MTA API fetching

## Getting Started

### Prerequisites

- Node.js >= 16.x
- npm >= 7.x

### Installation

```bash
npm install
```

### Running the App

```bash
npx expo start
```

You can open the app in:

- Development build
- Android emulator
- iOS simulator
- Expo Go

Edit files in the `app/` directory to start developing. The project uses [file-based routing](https://docs.expo.dev/router/introduction/).

### Resetting the Project

To reset the starter code:

```bash
npm run reset-project
```

This moves starter code to `app-example/` and creates a blank `app/` directory.

## Project Structure

```
app/           # Main app screens and navigation
components/    # Reusable UI components
constants/     # Theme and configuration
contexts/      # React contexts
hooks/         # Custom hooks
services/      # API integrations
assets/        # Images and static assets
scripts/       # Utility scripts
```

## Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)



## License

This project is licensed under the GPLv3 License. See the [LICENSE](LICENSE) file for details.
