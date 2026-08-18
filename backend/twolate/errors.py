"""Service-layer errors mapped to HTTP by the route layer."""


class ServiceError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status
