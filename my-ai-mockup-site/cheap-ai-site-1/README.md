# cheap-ai-site

## Overview
This project is a TypeScript application built using Vite, designed to create a scalable and efficient web application. It serves as a template for developing modern web applications with a focus on performance and developer experience.

## Project Structure
```
cheap-ai-site
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
├── src
│   ├── main.ts
│   ├── app.ts
│   └── styles.css
└── public
    └── favicon.svg
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

## Usage
- The main application logic is located in `src/app.ts`.
- The entry point for the application is `src/main.ts`, which initializes and mounts the application to the DOM.

## Configuration
- The TypeScript configuration can be found in `tsconfig.json` and `tsconfig.node.json`.
- The Vite configuration is specified in `vite.config.ts`.

## Deployment
This project can be deployed using various hosting services. Ensure to build the project using `npm run build` before deployment.

## License
This project is licensed under the MIT License.