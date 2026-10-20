from flask import jsonify

class Orchestrator:
    def __init__(self):
        self.content_flow = []

    def add_content(self, content):
        self.content_flow.append(content)

    def generate_response(self):
        # Simulate content generation logic
        response = {
            "status": "success",
            "data": self.content_flow
        }
        return jsonify(response)

    def clear_content(self):
        self.content_flow = []