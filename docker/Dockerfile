FROM node:22-alpine3.21

WORKDIR /app

COPY *.js ./
COPY *.html ./
COPY assets ./assets/
COPY config ./config/
COPY content ./content/
COPY themes ./themes/
COPY locales ./locales/
COPY examples ./examples/
COPY workspace ./workspace/
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/workspace/site /app/dist

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
