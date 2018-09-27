FROM node:8

WORKDIR /usr/src/tic-express

# Install
COPY package*.json ./
RUN npm install

# Source code
COPY . .

CMD [ "npm", "start" ]