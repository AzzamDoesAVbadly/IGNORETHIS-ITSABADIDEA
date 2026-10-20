from typing import Any, Dict

class Memory:
    def __init__(self):
        self.storage: Dict[str, Any] = {}

    def store(self, key: str, value: Any) -> None:
        """Store a value in memory with the given key."""
        self.storage[key] = value

    def retrieve(self, key: str) -> Any:
        """Retrieve a value from memory by its key."""
        return self.storage.get(key, None)

    def delete(self, key: str) -> None:
        """Delete a value from memory by its key."""
        if key in self.storage:
            del self.storage[key]

    def clear(self) -> None:
        """Clear all stored values from memory."""
        self.storage.clear()