# Use Node.js official image
FROM node:22

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Add node_modules/.bin to PATH (absolute path is safer)
ENV PATH="/usr/src/app/node_modules/.bin:$PATH"

# Copy the rest of the application code
COPY . .

COPY .env.frontend .env

# Ensure next is executable (rare but safe to include)
RUN chmod +x ./node_modules/.bin/next

# Build the Next.js application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
