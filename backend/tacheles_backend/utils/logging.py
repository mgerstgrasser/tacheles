import logging


def get_logger(name: str) -> logging.Logger:
    # To keep things simple, we just use the uvicorn logger for now.
    # This respects the --log-level argument passed to uvicorn, so
    # we don't clutter logs with debug messages in production.
    # In a real application, you can use this function to set up
    # more sophisticated logging, e.g. to log to a file.
    return logging.getLogger("uvicorn.error")
