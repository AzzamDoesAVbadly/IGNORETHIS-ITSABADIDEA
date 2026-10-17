class ContentScheduler:
    def __init__(self):
        self.scheduled_tasks = []

    def schedule_content(self, content_id, publish_time):
        task = {
            'content_id': content_id,
            'publish_time': publish_time
        }
        self.scheduled_tasks.append(task)
        return task

    def cancel_schedule(self, content_id):
        self.scheduled_tasks = [
            task for task in self.scheduled_tasks if task['content_id'] != content_id
        ]

    def get_scheduled_tasks(self):
        return self.scheduled_tasks

    def clear_schedule(self):
        self.scheduled_tasks.clear()