# Frontend README

## Overview
This project is a frontend application built with React and TypeScript. It serves as the user interface for the SignalCorp platform, providing a seamless experience for users to interact with the backend services.

## Project Structure
```
frontend
├── public
│   └── favicon.svg
├── src
│   ├── app
│   │   ├── App.tsx
│   │   ├── routes
│   │   │   ├── HomePage.tsx
│   │   │   └── ArticlePage.tsx
│   │   ├── components
│   │   │   ├── Layout.tsx
│   │   │   ├── ArticleFeed.tsx
│   │   │   ├── CuratorBubble.tsx
│   │   │   ├── SectionUnlocks.tsx
│   │   │   └── GlitchGameOverlay.tsx
│   │   ├── data
│   │   │   └── articles.ts
│   │   ├── hooks
│   │   │   └── useRouteMeta.ts
│   │   └── styles
│   │       └── globals.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd signalcorp-platform/frontend
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Run the application**
   ```
   npm run dev
   ```

## Usage
- The main application logic is located in `src/app/App.tsx`.
- The entry point for the application is `src/main.tsx`, which initializes the React application.
- The application includes various components for displaying articles, managing user interactions, and providing a unique AI-driven experience.

## Configuration
- The TypeScript configuration can be found in `tsconfig.json`.
- Vite configuration is specified in `vite.config.ts`.

## Deployment
This frontend application can be deployed using Netlify. Configuration settings are specified in `netlify.toml`.

## License
This project is licensed under the MIT License.