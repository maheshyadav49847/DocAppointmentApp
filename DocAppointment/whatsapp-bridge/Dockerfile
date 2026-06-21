FROM node:20-alpine
WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3101

# Start the application
CMD ["npm", "start"]
