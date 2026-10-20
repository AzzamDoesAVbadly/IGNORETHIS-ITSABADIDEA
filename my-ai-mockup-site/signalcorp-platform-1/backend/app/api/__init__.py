from flask import Blueprint

api = Blueprint('api', __name__)

from . import routes  # Import the routes for the API