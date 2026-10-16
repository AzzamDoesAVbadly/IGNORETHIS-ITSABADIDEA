# My AI Mock Landing

This project is a playful exploration of a broken AI theme, featuring a route-aware article feed, hover-triggered "AI curator" messaging, progressive section unlocks, and a glitchy minigame overlay on the landing page.

## Features

- **Route-aware Article Feed**: Displays a list of articles that users can navigate through.
- **AI Curator Messaging**: Engaging hover-triggered messages that simulate an AI curator's interaction.
- **Progressive Section Unlocks**: Content sections that unlock progressively based on user interactions.
- **Glitchy Minigame Overlay**: A fun, interactive overlay that gives the impression of a malfunctioning AI.

## Project Structure

```
my-ai-mock-landing
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
│   │   ├── styles
│   │   │   └── globals.css
│   │   └── lib
│   │       └── utils.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── public
│   └── favicon.svg
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd my-ai-mock-landing
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` to view the application.

## Technologies Used

- React
- TypeScript
- Vite
- CSS

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes. 

## License

This project is licensed under the MIT License.