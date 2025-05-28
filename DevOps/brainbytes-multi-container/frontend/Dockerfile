FROM node:22-alpine

WORKDIR /usr/src/app

# Copy only the lock and package files first to install dependencies
COPY package.json package-lock.json ./

# Clean and strict install to avoid leftover versions
RUN npm ci --omit=dev

# Now copy the rest of the application
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
