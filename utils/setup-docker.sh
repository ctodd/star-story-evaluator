#!/bin/bash

# Script to set up Docker environment for STAR Stories

# Create secrets directory if it doesn't exist
mkdir -p ./secrets

# Function to check if a file exists and create it if it doesn't
ensure_file_exists() {
  if [ ! -f "$1" ]; then
    echo "Creating empty file: $1"
    touch "$1"
  fi
}

# Check which profile to use
if [ "$1" == "anthropic" ]; then
  echo "Setting up for Anthropic API..."
  
  # Check if Anthropic API key exists
  if [ ! -f "./secrets/anthropic_api_key.txt" ]; then
    echo "Anthropic API key not found. Please run 'npm run generate:anthropic' first."
    exit 1
  fi
  
  # Create empty AWS credential files to satisfy Docker Compose
  ensure_file_exists "./secrets/aws_access_key_id.txt"
  ensure_file_exists "./secrets/aws_secret_access_key.txt"
  ensure_file_exists "./secrets/aws_session_token.txt"
  
  # Start Docker Compose with Anthropic profile
  echo "Starting Docker Compose with Anthropic profile..."
  docker compose --profile anthropic up -d star-stories-anthropic
  
else
  echo "Setting up for AWS Bedrock..."
  
  # Check if AWS credentials exist
  if [ ! -f "./secrets/aws_access_key_id.txt" ] || [ ! -f "./secrets/aws_secret_access_key.txt" ]; then
    echo "AWS credentials not found. Please run 'npm run generate:aws' first."
    exit 1
  fi
  
  # Create empty Anthropic API key file to satisfy Docker Compose
  ensure_file_exists "./secrets/anthropic_api_key.txt"
  
  # Start Docker Compose with default profile
  echo "Starting Docker Compose with default profile..."
  docker compose --profile default up -d star-stories
fi

echo "Setup complete!"
