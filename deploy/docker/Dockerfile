FROM node:20-alpine

WORKDIR /app

COPY src ./src/
COPY res/themes ./res/themes/
COPY res/locales ./res/locales/
COPY res/vendor ./res/vendor/
COPY bin ./bin/
COPY *.js ./
COPY *.json ./
COPY *.ico ./
COPY site ./site/
COPY deploy/docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/dist

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
