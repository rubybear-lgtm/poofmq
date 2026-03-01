module github.com/rubyapps/poofmq-go-api

go 1.24.0

require (
	github.com/google/uuid v1.6.0
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.26.3
	github.com/redis/go-redis/v9 v9.7.3
	github.com/rubyapps/poofmq/gen/go/poofmq/v1 v0.0.0
	google.golang.org/genproto/googleapis/api v0.0.0-20250218202821-56aae31c358a
	google.golang.org/grpc v1.71.0
	google.golang.org/protobuf v1.36.5
)

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	golang.org/x/net v0.37.0 // indirect
	golang.org/x/sys v0.31.0 // indirect
	golang.org/x/text v0.22.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250218202821-56aae31c358a // indirect
)

replace github.com/rubyapps/poofmq/gen/go/poofmq/v1 => ../../gen/go/poofmq/v1
