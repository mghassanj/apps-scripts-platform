FROM alpine:latest

RUN apk add --no-cache curl bash

WORKDIR /app
COPY sync.sh .
RUN chmod +x sync.sh

CMD ["./sync.sh"]
