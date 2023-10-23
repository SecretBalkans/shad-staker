FROM --platform=linux/amd64 node:lts-alpine as build-stage

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

# production stage
FROM nginx:stable-alpine as production-stage
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/vue/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
