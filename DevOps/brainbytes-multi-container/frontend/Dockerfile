# Use Node.js official image
FROM node:22

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH="/usr/src/app/node_modules/.bin:$PATH"

# Copy the rest of the application code
COPY . .

# Copy environment variables
COPY .env.frontend .env

# Debugging: Print Node.js and npm versions
RUN node -v && npm -v

# Debugging: Print installed dependencies
RUN ls -la node_modules

# Debugging: Print environment variables
RUN echo "Environment Variables:" && env

# Debugging: Print the contents of the .env file
RUN cat .env

# Build the Next.js application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]