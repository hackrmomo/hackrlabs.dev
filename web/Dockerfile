FROM node:18
WORKDIR /usr/local/share/hackrlabs.dev

COPY ./package.json ./
RUN yarn
COPY ./ ./

EXPOSE ${PORT}

RUN yarn build
CMD ["yarn", "dev"]