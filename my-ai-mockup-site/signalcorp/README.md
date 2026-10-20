# SignalCorp Project

## Overview
SignalCorp is a web application designed to create and manage digital content through a frontend interface and a Python backend. The project is structured to separate the frontend and backend components, allowing for easy deployment and maintenance.

## Project Structure
```
signalcorp
├── frontend
│   ├── index.html
│   ├── netlify.toml
│   ├── .env.example
│   └── README.md
├── backend
│   ├── app
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api.py
│   │   ├── config.py
│   │   └── schemas.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── .gitignore
└── README.md
```

## Frontend
The frontend of the application is built using HTML, CSS, and JavaScript. It is designed to be deployed on Netlify. The main files include:

- **index.html**: The static homepage for the application.
- **netlify.toml**: Configuration settings for deploying the frontend to Netlify.
- **.env.example**: Example environment variables for local development.

### Setup Instructions
1. Navigate to the `frontend` directory.
2. Copy `.env.example` to `.env` and configure your environment variables.
3. Deploy the frontend to Netlify using the settings in `netlify.toml`.

## Backend
The backend of the application is built using Python and serves as the API for the frontend. Key files include:

- **app/__init__.py**: Initializes the backend application package.
- **app/main.py**: Entry point for the backend application.
- **app/api.py**: Defines the API endpoints.
- **app/config.py**: Contains configuration settings.
- **app/schemas.py**: Defines data schemas for validation.
- **requirements.txt**: Lists Python dependencies.

### Setup Instructions
1. Navigate to the `backend` directory.
2. Copy `.env.example` to `.env` and configure your environment variables.
3. Install the required packages using:
   ```
   pip install -r requirements.txt
   ```
4. Run the backend application using:
   ```
   python app/main.py
   ```

## Deployment
The frontend is deployed on Netlify, and it points to the hosted backend API URL. Ensure that the API URL is correctly set in the frontend environment variables.

## License
This project is licensed under the MIT License.