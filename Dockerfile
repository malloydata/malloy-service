FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY . /usr/src/app

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev


EXPOSE 14310
ENTRYPOINT [ "node", "./dist/server.js"]
