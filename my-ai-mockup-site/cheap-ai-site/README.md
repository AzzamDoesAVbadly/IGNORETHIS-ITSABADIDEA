# Cheap AI Site

## Overview
This project is a chaotic web application designed to simulate a broken AI interface. It features aggressive glitch effects, CRT monitor aesthetics, and fake telemetry panels to create an unsettling user experience.

## Project Structure
```
cheap-ai-site
├── src
│   ├── app.ts
│   ├── main.ts
│   ├── styles
│   │   └── globals.css
│   ├── components
│   │   ├── CrtOverlay.ts
│   │   ├── TelemetryPanel.ts
│   │   ├── GlitchText.ts
│   │   └── Hero.ts
│   └── data
│       └── telemetry.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── netlify.toml
└── .gitignore
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd cheap-ai-site
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Run the application**
   ```
   npm run dev
   ```

## Features
- CRT monitor effect with flicker and distortion.
- Aggressive glitch animations throughout the interface.
- Fake telemetry panels displaying chaotic system diagnostics.
- Unhinged aesthetic designed to simulate a malfunctioning AI.

## Usage
- The main application logic is located in `src/app.ts`.
- The entry point for the application is `src/main.ts`, which starts the application and applies global styles.

## Configuration
- The TypeScript configuration can be found in `tsconfig.json`.
- Workspace-specific settings are located in `.gitignore`.

## Deployment
This project can be deployed using Netlify. Configuration settings are specified in `netlify.toml`.

## License
This project is licensed under the MIT License.