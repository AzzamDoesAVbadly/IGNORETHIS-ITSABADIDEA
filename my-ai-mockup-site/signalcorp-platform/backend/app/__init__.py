from flask import Flask

app = Flask(__name__)

from .api import api as api_blueprint  # Import the API routes

app.register_blueprint(api_blueprint)  # Register the API blueprint

# Additional package-level variables or configurations can be added here if needed.