from flask import Blueprint, jsonify

api = Blueprint('api', __name__)

@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@api.route('/articles', methods=['GET'])
def get_articles():
    # Placeholder for fetching articles
    return jsonify({"articles": []}), 200

@api.route('/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    # Placeholder for fetching a specific article
    return jsonify({"article": {"id": article_id, "title": "Sample Article"}}), 200

@api.route('/submit', methods=['POST'])
def submit_article():
    # Placeholder for submitting an article
    return jsonify({"message": "Article submitted successfully"}), 201