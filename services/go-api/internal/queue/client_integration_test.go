package queue

import (
	"context"
	"errors"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	testcontainers "github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

const redisTestcontainerImage = "redis:7.2-alpine"

func TestClientIntegrationPushPopRoundTripWithTestcontainers(t *testing.T) {
	client, redisClient := newContainerBackedQueueClient(t)
	ctx := context.Background()

	queueID := "integration-round-trip"
	message, err := client.Push(ctx, queueID, "user.created", map[string]any{
		"user_id": "123",
	}, PushOptions{})
	if err != nil {
		t.Fatalf("Push() error = %v", err)
	}

	queueTTL, err := redisClient.TTL(ctx, client.queueKey(queueID)).Result()
	if err != nil {
		t.Fatalf("TTL() error = %v", err)
	}
	if queueTTL <= 0 {
		t.Fatalf("queue key TTL = %v, expected positive value", queueTTL)
	}

	popped, err := client.Pop(ctx, queueID, PopOptions{})
	if err != nil {
		t.Fatalf("Pop() error = %v", err)
	}

	if popped.ID != message.ID {
		t.Fatalf("Pop() message ID = %q, want %q", popped.ID, message.ID)
	}

	if popped.EventType != "user.created" {
		t.Fatalf("Pop() event type = %q, want %q", popped.EventType, "user.created")
	}

	size, err := client.Size(ctx, queueID)
	if err != nil {
		t.Fatalf("Size() error = %v", err)
	}
	if size != 0 {
		t.Fatalf("Size() = %d, want %d", size, 0)
	}
}

func TestClientIntegrationDelayedVisibilityWithTestcontainers(t *testing.T) {
	client, _ := newContainerBackedQueueClient(t)
	ctx := context.Background()

	queueID := "integration-delayed-visible"
	_, err := client.Push(ctx, queueID, "task.scheduled", map[string]any{
		"task_id": "abc",
	}, PushOptions{
		AvailableAt: time.Now().UTC().Add(1200 * time.Millisecond),
	})
	if err != nil {
		t.Fatalf("Push() error = %v", err)
	}

	_, err = client.Pop(ctx, queueID, PopOptions{})
	if !errors.Is(err, ErrQueueEmpty) {
		t.Fatalf("first Pop() error = %v, want %v", err, ErrQueueEmpty)
	}

	time.Sleep(1500 * time.Millisecond)

	popped, err := client.Pop(ctx, queueID, PopOptions{})
	if err != nil {
		t.Fatalf("second Pop() error = %v", err)
	}

	if popped.EventType != "task.scheduled" {
		t.Fatalf("Pop() event type = %q, want %q", popped.EventType, "task.scheduled")
	}
}

func TestClientIntegrationVisibilityTimeoutStoresReceiptWithTestcontainers(t *testing.T) {
	client, redisClient := newContainerBackedQueueClient(t)
	ctx := context.Background()

	queueID := "integration-receipts"
	_, err := client.Push(ctx, queueID, "invoice.created", map[string]any{
		"invoice_id": "inv-1",
	}, PushOptions{})
	if err != nil {
		t.Fatalf("Push() error = %v", err)
	}

	popped, err := client.Pop(ctx, queueID, PopOptions{
		VisibilityTimeoutSeconds: 5,
		ConsumerID:               "consumer-a",
	})
	if err != nil {
		t.Fatalf("Pop() error = %v", err)
	}
	if popped.ReceiptHandle == "" {
		t.Fatal("Pop() receipt handle is empty")
	}

	receiptKey := client.receiptKey(queueID, popped.ReceiptHandle)
	receiptValue, err := redisClient.Get(ctx, receiptKey).Result()
	if err != nil {
		t.Fatalf("Get() receipt key error = %v", err)
	}
	if receiptValue != popped.ID {
		t.Fatalf("receipt key value = %q, want %q", receiptValue, popped.ID)
	}

	receiptTTL, err := redisClient.TTL(ctx, receiptKey).Result()
	if err != nil {
		t.Fatalf("TTL() receipt key error = %v", err)
	}
	if receiptTTL <= 0 {
		t.Fatalf("receipt TTL = %v, expected positive value", receiptTTL)
	}
	if receiptTTL > 5*time.Second {
		t.Fatalf("receipt TTL = %v, expected to be <= 5s", receiptTTL)
	}

	if err := client.DeleteReceipt(ctx, queueID, popped.ReceiptHandle); err != nil {
		t.Fatalf("DeleteReceipt() error = %v", err)
	}

	exists, err := redisClient.Exists(ctx, receiptKey).Result()
	if err != nil {
		t.Fatalf("Exists() error = %v", err)
	}
	if exists != 0 {
		t.Fatalf("receipt key should be deleted, exists count = %d", exists)
	}
}

func newContainerBackedQueueClient(t *testing.T) (*Client, *redis.Client) {
	t.Helper()

	container, host, port := startRedisContainer(t)

	redisClient := redis.NewClient(&redis.Options{
		Addr: net.JoinHostPort(host, port),
		DB:   0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf("failed to ping testcontainer Redis at %s:%s: %v", host, port, err)
	}

	t.Cleanup(func() {
		if err := redisClient.Close(); err != nil {
			t.Logf("warning: failed to close redis client: %v", err)
		}

		terminateCtx, terminateCancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer terminateCancel()

		if err := container.Terminate(terminateCtx); err != nil {
			t.Logf("warning: failed to terminate redis testcontainer: %v", err)
		}
	})

	return NewClient(redisClient), redisClient
}

func startRedisContainer(t *testing.T) (testcontainers.Container, string, string) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        redisTestcontainerImage,
			ExposedPorts: []string{"6379/tcp"},
			WaitingFor:   wait.ForListeningPort("6379/tcp").WithStartupTimeout(3 * time.Minute),
		},
		Started: true,
	})
	if err != nil {
		if shouldSkipContainerRuntimeError(err) {
			t.Skipf("skipping Testcontainers integration test: %v", err)
		}
		t.Fatalf("failed to start Redis testcontainer: %v", err)
	}

	host, err := container.Host(ctx)
	if err != nil {
		terminateContainerSilently(container)
		t.Fatalf("failed to resolve Redis container host: %v", err)
	}

	mappedPort, err := container.MappedPort(ctx, "6379/tcp")
	if err != nil {
		terminateContainerSilently(container)
		t.Fatalf("failed to resolve Redis container port: %v", err)
	}

	return container, host, mappedPort.Port()
}

func shouldSkipContainerRuntimeError(err error) bool {
	message := strings.ToLower(err.Error())

	skipSignals := []string{
		"cannot connect to the docker daemon",
		"is the docker daemon running",
		"docker socket",
		"no such file or directory",
		"permission denied",
		"docker host",
		"podman",
	}

	for _, signal := range skipSignals {
		if strings.Contains(message, signal) {
			return true
		}
	}

	return false
}

func terminateContainerSilently(container testcontainers.Container) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_ = container.Terminate(ctx)
}
