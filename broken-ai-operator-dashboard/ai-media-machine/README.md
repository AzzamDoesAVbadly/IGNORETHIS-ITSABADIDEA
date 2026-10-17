# AI Media Machine

## Overview
The AI Media Machine is a project designed to automate the processing and management of media content, particularly focusing on video files. It includes various modules that handle scheduling, topic processing, video uploading, and video file processing.

## Project Structure
```
ai-media-machine
├── agent
│   ├── __init__.py
│   ├── content_scheduler.py
│   ├── topic_pipeline.py
│   ├── video_upload_loop.py
│   └── video_worker.py
├── README.md
├── requirements.txt
└── .gitignore
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd ai-media-machine
   ```

2. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

3. **Run the application**
   - The main functionality is handled by the modules in the `agent` directory. You can import and use them in your scripts as needed.

## Usage
- **Content Scheduler**: Use the `ContentScheduler` class from `content_scheduler.py` to manage content scheduling tasks.
- **Topic Pipeline**: The `TopicPipeline` class in `topic_pipeline.py` allows you to add and process topics.
- **Video Upload Loop**: The `VideoUploadLoop` class in `video_upload_loop.py` manages the video uploading process.
- **Video Worker**: The `VideoWorker` class in `video_worker.py` is responsible for processing video files.

## License
This project is licensed under the MIT License.