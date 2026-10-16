# My AI Mockup Site

## Overview
This project is a web application designed to simulate a broken AI experience. It features a route-aware article feed, hover-triggered "AI curator" messaging, progressive section unlocks, and a glitchy minigame overlay on the landing page.

## Features
- **Article Feed**: Displays a list of articles with route awareness for easy navigation.
- **AI Curator Messaging**: Hover over elements to receive contextual messages from the AI curator.
- **Progressive Section Unlocks**: Content is revealed progressively as users interact with the page.
- **Glitchy Minigame Overlay**: A fun, interactive minigame that simulates a malfunctioning AI.

## Project Structure
```
my-ai-mockup-site
├── public
│   └── favicon.svg
├── src
│   ├── app.tsx
│   ├── main.tsx
│   ├── components
│   │   ├── ArticleFeed.tsx
│   │   ├── AIMessage.tsx
│   │   ├── SectionUnlock.tsx
│   │   ├── GlitchGame.tsx
│   │   ├── RouteShell.tsx
│   │   └── Header.tsx
│   ├── data
│   │   └── articles.ts
│   ├── hooks
│   │   └── useFeedRouting.ts
│   ├── pages
│   │   ├── HomePage.tsx
│   │   └── ArticlePage.tsx
│   ├── styles
│   │   └── globals.css
│   └── types
│       └── index.ts
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd my-ai-mockup-site
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Technologies Used
- React
- TypeScript
- Vite
- CSS

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes. 

## License
This project is licensed under the MIT License.