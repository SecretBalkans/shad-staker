FROM --platform=linux/amd64 node:lts-alpine

# Set the working directory inside the container
WORKDIR /app/vue

# Copy package.json and package-lock.json to the working directory
COPY package.json yarn.lock postinstall.js prepare.js ./

RUN yarn cache clean

# Install project dependencies
RUN yarn install

# Copy the rest of the application code to the container
COPY . .

# build app for production with minification
RUN yarn run build

EXPOSE 4173

# Start your application
CMD [ "yarn", "preview" ]