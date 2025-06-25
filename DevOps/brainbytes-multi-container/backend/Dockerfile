# Use a lightweight Node.js image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy only package.json and package-lock.json to leverage Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Set environment variables (optional, can also be passed during runtime)
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]