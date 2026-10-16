# Broken AI Operator Dashboard

## Overview
The Broken AI Operator Dashboard is a visually engaging application designed to simulate an AI operations environment. It features dark signal overlays, stronger glitch motion effects, route-specific article cards, and fake diagnostics to create an immersive experience.

## Features
- **Dark Signal Overlays**: Visualize data with dark signal effects to enhance the user experience.
- **Stronger Glitch Motion**: Adds a dynamic and engaging aesthetic to the dashboard.
- **Route-Specific Article Cards**: Displays relevant articles and diagnostics for each route.
- **Fake Diagnostics**: Simulates AI diagnostics to provide a realistic operational feel.

## Project Structure
```
broken-ai-operator-dashboard
├── public
│   └── favicon.svg
├── src
│   ├── app
│   │   ├── App.tsx
│   │   ├── routes
│   │   │   └── Dashboard.tsx
│   │   └── styles
│   │       └── globals.css
│   ├── components
│   │   ├── Header.tsx
│   │   ├── SignalGrid.tsx
│   │   ├── RouteCard.tsx
│   │   ├── DiagnosticPanel.tsx
│   │   └── GlitchOverlay.tsx
│   ├── data
│   │   └── dashboard.ts
│   ├── hooks
│   │   └── useDashboardData.ts
│   ├── lib
│   │   └── utils.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
└── eslint.config.js
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd broken-ai-operator-dashboard
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
To start the development server, run:
```
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to view the dashboard.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.