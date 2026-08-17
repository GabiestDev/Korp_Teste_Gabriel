#!/usr/bin/env bash
# Run the docker-compose stack using .env if present
# Usage: ./run-compose.sh
if [ -f .env ]; then
  echo "Using .env file for docker compose"
  docker compose --env-file .env up --build -d
else
  echo "No .env file found — using docker-compose defaults"
  docker compose up --build -d
fi
