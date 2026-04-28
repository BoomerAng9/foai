import os

PORT = int(os.getenv("PORT", "8081"))
VERSION = "0.1.0"
ENV = os.getenv("ENV", "production")
