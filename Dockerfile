# Use official Node.js image as base
FROM node:18-alpine

# Set working directory in the container
WORKDIR /usr/src/app

# Copy package.json and lock file
COPY package*.json ./


# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the app port (adjust if different)
EXPOSE 7000

# Command to run the app
CMD ["npm","run", "dev"]
