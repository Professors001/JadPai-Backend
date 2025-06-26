# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage build cache
COPY package*.json ./

# --- FIX IS HERE ---
# Install ALL dependencies (including devDependencies like nodemon)
# We use 'npm install' which is standard for this purpose.
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a non-root user to run the application (Excellent practice!)
# No changes needed here, this is great for security.
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001
# Note: I changed the username to a more generic 'appuser' but 'nextjs' is fine too.

# Change ownership of the app directory to the new user
RUN chown -R appuser:nodejs /app

# Switch to the non-root user
USER appuser

# Expose the port your app runs on
EXPOSE 6969

# Define the default command to run your application.
# This will be used for production, but docker-compose overrides it for development.
CMD ["npm", "start"]