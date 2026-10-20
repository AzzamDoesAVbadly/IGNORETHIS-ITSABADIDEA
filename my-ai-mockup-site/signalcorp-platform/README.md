# SignalCorp Platform

## Overview
The SignalCorp Platform is a web application that consists of a frontend built with React and a backend powered by Flask. This project serves as a template for developing scalable web applications with a focus on content generation and AI-driven features.

## Project Structure
```
signalcorp-platform
├── backend
│   ├── app
│   │   ├── __init__.py
│   │   ├── api
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   ├── engine
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py
│   │   │   ├── content.py
│   │   │   └── memory.py
│   │   ├── config.py
│   │   └── models.py
│   ├── requirements.txt
│   ├── run.py
│   └── README.md
├── frontend
│   ├── public
│   │   └── favicon.svg
│   ├── src
│   │   ├── app
│   │   │   ├── App.tsx
│   │   │   ├── routes
│   │   │   │   ├── HomePage.tsx
│   │   │   │   └── ArticlePage.tsx
│   │   │   ├── components
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── ArticleFeed.tsx
│   │   │   │   ├── CuratorBubble.tsx
│   │   │   │   ├── SectionUnlocks.tsx
│   │   │   │   └── GlitchGameOverlay.tsx
│   │   │   ├── data
│   │   │   │   └── articles.ts
│   │   │   ├── hooks
│   │   │   │   └── useRouteMeta.ts
│   │   │   └── styles
│   │   │       └── globals.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── README.md
├── netlify.toml
├── .gitignore
└── README.md
```

## Setup Instructions

### Backend
1. **Navigate to the backend directory**
   ```
   cd backend
   ```

2. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```
   python run.py
   ```

### Frontend
1. **Navigate to the frontend directory**
   ```
   cd frontend
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Run the application**
   ```
   npm start
   ```

## Deployment
- The frontend can be deployed using Netlify. Configuration settings are specified in `netlify.toml`.
- The backend can be deployed on any platform that supports Python applications.

## License
This project is licensed under the MIT License.