# Frontend README

## Overview
This project is the frontend component of the SignalCorp application, designed to serve as a static homepage and interact with the backend API. It is built using HTML, CSS, and JavaScript, and is deployed on Netlify.

## Project Structure
```
frontend
├── index.html
├── netlify.toml
├── .env.example
└── README.md
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd signalcorp/frontend
   ```

2. **Environment Variables**
   - Copy the `.env.example` file to `.env` and update the variables as needed for your local development environment.

3. **Deploying to Netlify**
   - Ensure that the `netlify.toml` file is correctly configured with the build command and publish directory.
   - Deploy the frontend application to Netlify by connecting your repository and following the deployment instructions.

## Usage
- The main entry point for the application is `index.html`, which contains the structure and links to styles and scripts.
- The frontend interacts with the backend API hosted at the specified URL in the environment variables.

## License
This project is licensed under the MIT License.