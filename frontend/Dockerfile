# A standard Dockerfile for a Node.js application
# Note that we only really use this in development, see the backend Dockerfile for how we build the frontend for production.
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]