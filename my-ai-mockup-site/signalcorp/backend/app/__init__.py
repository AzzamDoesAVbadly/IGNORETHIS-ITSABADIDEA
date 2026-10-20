from flask import Flask

app = Flask(__name__)

from . import api  # Import the API routes

# Additional package-level variables or configurations can be added here if needed.