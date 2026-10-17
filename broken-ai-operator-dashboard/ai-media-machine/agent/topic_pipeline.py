class TopicPipeline:
    def __init__(self):
        self.topics = []

    def add_topic(self, topic: str) -> None:
        self.topics.append(topic)

    def process_topics(self) -> None:
        for topic in self.topics:
            self._process_topic(topic)

    def _process_topic(self, topic: str) -> None:
        # Placeholder for topic processing logic
        print(f"Processing topic: {topic}")

    def get_results(self) -> list:
        return self.topics