# Media Site Chaos

## Overview
This project is a chaotic media website that combines elements of BuzzFeed, Newgrounds, and Adult Swim. It features AI-generated content, a unique design aesthetic, and integrated monetization strategies.

## Project Structure
```
media-site-chaos
├── public
│   └── favicon.svg
├── src
│   ├── app
│   │   ├── App.tsx
│   │   ├── routes
│   │   │   ├── HomePage.tsx
│   │   │   ├── ArticlePage.tsx
│   │   │   └── CategoryPage.tsx
│   │   ├── components
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── ArticleFeed.tsx
│   │   │   ├── CuratorBubble.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── SectionUnlocks.tsx
│   │   │   ├── GlitchOverlay.tsx
│   │   │   └── MonetizationBanner.tsx
│   │   ├── data
│   │   │   └── articles.ts
│   │   ├── hooks
│   │   │   └── useRouteMeta.ts
│   │   └── styles
│   │       └── globals.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
└── netlify.toml
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd media-site-chaos
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Run the application**
   ```
   npm start
   ```

## Features
- **AI-Generated Content**: Articles and media are dynamically generated using AI, providing a unique user experience.
- **Chaotic Design**: The website embraces a chaotic aesthetic, reminiscent of Adult Swim and Newgrounds.
- **Integrated Monetization**: Strategies for monetization are built into the site, including ads and subscription prompts.
- **Interactive Elements**: Features like hover-triggered messaging and progressive section unlocks enhance user engagement.

## Usage
- The main application logic is located in `src/app/App.tsx`.
- The entry point for the application is `src/main.tsx`, which starts the React application.

## Configuration
- The TypeScript configuration can be found in `tsconfig.json`.
- Workspace-specific settings are located in `.gitignore`.

## Deployment
This project can be deployed using Netlify. Configuration settings are specified in `netlify.toml`. 

## License
This project is licensed under the MIT License.