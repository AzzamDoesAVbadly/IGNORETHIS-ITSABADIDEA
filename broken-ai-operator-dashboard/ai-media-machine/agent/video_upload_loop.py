class VideoUploadLoop:
    def __init__(self):
        self.uploading = False

    def start_uploading(self):
        self.uploading = True
        print("Video upload loop started.")

    def stop_uploading(self):
        self.uploading = False
        print("Video upload loop stopped.")

    def check_upload_status(self):
        return self.uploading