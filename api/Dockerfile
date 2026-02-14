# syntax=docker/dockerfile:1

# Use a stable Python base image
FROM python:3.11-slim-bullseye as base

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
# Using a separate layer for requirements to speed up rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

# Copy the rest of the source code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Run the application
# We use 'python __main__.py' because the code is structured as a script
CMD ["python", "__main__.py"]
