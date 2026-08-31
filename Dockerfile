FROM node:20-alpine as builder

WORKDIR /app

COPY package.json ./
RUN npm install

# Copy source code and build the frontend
COPY . .
RUN rm -rf node_modules && rm -f package-lock.json && npm install && npm run build && echo "docker-build" > dist/.build_ref

# Remove development dependencies to keep the image small
# (Optional, depending on if you need them for the server)
# RUN npm prune --production

EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
