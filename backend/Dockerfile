FROM node:24.22-alpine3.24

RUN addgroup app && adduser -S -G app app
USER app

WORKDIR /app
COPY --chown=app:app package*.json ./
RUN npm ci
COPY --chown=app:app . .

EXPOSE 3000

CMD ["npm", "start"]