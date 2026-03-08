FROM golang:1.24-alpine

WORKDIR /app

COPY . .

RUN go mod download

EXPOSE 8080

CMD ["sh", "-c", "GO_API_HTTP_PORT=${PORT:-8080} exec go run ./cmd/server"]
