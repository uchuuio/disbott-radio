FROM letsxo/node-ffmpeg:latest
EXPOSE 3000
WORKDIR /app
ADD . /app
RUN yarn
CMD yarn run start