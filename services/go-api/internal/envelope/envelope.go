// Package envelope provides message envelope serialization for dynamic JSON payloads.
// It handles encoding/decoding of PayloadEnvelope structures with support for
// arbitrary JSON payloads, metadata, and encryption fields.
package envelope

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// EncryptionMode represents the encryption state of a message payload.
type EncryptionMode int

const (
	// EncryptionModeUnspecified indicates no encryption mode was set.
	EncryptionModeUnspecified EncryptionMode = iota
	// EncryptionModeUnencrypted indicates the payload is plaintext.
	EncryptionModeUnencrypted
	// EncryptionModeEdgeEncrypted indicates the payload will be encrypted at the edge.
	EncryptionModeEdgeEncrypted
	// EncryptionModeClientEncrypted indicates the payload was encrypted by the client.
	EncryptionModeClientEncrypted
)

// String returns the string representation of the encryption mode.
func (m EncryptionMode) String() string {
	switch m {
	case EncryptionModeUnspecified:
		return "UNSPECIFIED"
	case EncryptionModeUnencrypted:
		return "UNENCRYPTED"
	case EncryptionModeEdgeEncrypted:
		return "EDGE_ENCRYPTED"
	case EncryptionModeClientEncrypted:
		return "CLIENT_ENCRYPTED"
	default:
		return "UNKNOWN"
	}
}

// EncryptionModeFromString parses an encryption mode from its string representation.
func EncryptionModeFromString(s string) (EncryptionMode, error) {
	switch s {
	case "UNSPECIFIED", "ENCRYPTION_MODE_UNSPECIFIED":
		return EncryptionModeUnspecified, nil
	case "UNENCRYPTED", "ENCRYPTION_MODE_UNENCRYPTED":
		return EncryptionModeUnencrypted, nil
	case "EDGE_ENCRYPTED", "ENCRYPTION_MODE_EDGE_ENCRYPTED":
		return EncryptionModeEdgeEncrypted, nil
	case "CLIENT_ENCRYPTED", "ENCRYPTION_MODE_CLIENT_ENCRYPTED":
		return EncryptionModeClientEncrypted, nil
	default:
		return EncryptionModeUnspecified, fmt.Errorf("unknown encryption mode: %s", s)
	}
}

// Payload represents a dynamic JSON payload as a map.
type Payload map[string]any

// Metadata represents key-value metadata pairs.
type Metadata map[string]string

// Envelope represents a message envelope with dynamic JSON payload support.
// It is designed to be serialized to JSON for storage and transmission.
type Envelope struct {
	// EventType is required and identifies the type of event.
	EventType string `json:"event_type"`

	// Payload contains the dynamic JSON payload data.
	Payload Payload `json:"payload"`

	// Metadata contains optional key-value pairs.
	Metadata Metadata `json:"metadata,omitempty"`

	// EncryptionMode indicates how the payload is encrypted.
	EncryptionMode EncryptionMode `json:"encryption_mode,omitempty"`

	// EncryptionKeyID identifies the key used for encryption.
	EncryptionKeyID string `json:"encryption_key_id,omitempty"`

	// EncryptionAlgorithm is the algorithm used for client-side encryption.
	EncryptionAlgorithm string `json:"encryption_algorithm,omitempty"`

	// EncryptedPayload contains the encrypted data when using client encryption.
	EncryptedPayload []byte `json:"encrypted_payload,omitempty"`

	// EncryptedDataKey contains the encrypted data key for envelope encryption.
	EncryptedDataKey []byte `json:"encrypted_data_key,omitempty"`

	// EncryptionIV is the initialization vector for encryption.
	EncryptionIV []byte `json:"encryption_iv,omitempty"`

	// EncryptionAuthTag is the authentication tag for authenticated encryption.
	EncryptionAuthTag []byte `json:"encryption_auth_tag,omitempty"`
}

// Message represents a complete queue message with envelope and metadata.
type Message struct {
	// ID is the unique identifier for the message.
	ID string `json:"id"`

	// QueueID identifies which queue this message belongs to.
	QueueID string `json:"queue_id"`

	// Envelope contains the message payload and metadata.
	Envelope *Envelope `json:"envelope"`

	// QueuedAt is when the message was added to the queue.
	QueuedAt time.Time `json:"queued_at"`

	// VisibleAt is when the message becomes available for consumption.
	VisibleAt time.Time `json:"visible_at"`

	// ExpiresAt is when the message will expire from the queue.
	ExpiresAt time.Time `json:"expires_at"`

	// ReceiptHandle is used for message acknowledgment.
	ReceiptHandle string `json:"receipt_handle,omitempty"`
}

var (
	// ErrMissingEventType is returned when event_type is empty.
	ErrMissingEventType = errors.New("event_type is required and must be non-empty")

	// ErrMissingPayload is returned when payload is nil.
	ErrMissingPayload = errors.New("payload is required and must not be nil")

	// ErrInvalidPayload is returned when payload is not a valid object.
	ErrInvalidPayload = errors.New("payload must be a valid JSON object")

	// ErrEncryptionConflict is returned when both encrypted and unencrypted data exist.
	ErrEncryptionConflict = errors.New("cannot have both plaintext payload and encrypted fields")
)

// NewEnvelope creates a new envelope with the given event type and payload.
func NewEnvelope(eventType string, payload Payload) *Envelope {
	return &Envelope{
		EventType: eventType,
		Payload:   payload,
		Metadata:  make(Metadata),
	}
}

// NewEnvelopeWithMetadata creates a new envelope with metadata.
func NewEnvelopeWithMetadata(eventType string, payload Payload, metadata Metadata) *Envelope {
	return &Envelope{
		EventType: eventType,
		Payload:   payload,
		Metadata:  metadata,
	}
}

// Validate checks if the envelope meets MVP semantic requirements.
func (e *Envelope) Validate() error {
	if e.EventType == "" {
		return ErrMissingEventType
	}

	if e.Payload == nil {
		return ErrMissingPayload
	}

	return e.validateEncryptionFields()
}

// validateEncryptionFields ensures encryption fields are consistent.
func (e *Envelope) validateEncryptionFields() error {
	hasEncryptedPayload := len(e.EncryptedPayload) > 0
	hasEncryptionFields := e.EncryptionKeyID != "" ||
		e.EncryptionAlgorithm != "" ||
		len(e.EncryptedDataKey) > 0 ||
		len(e.EncryptionIV) > 0 ||
		len(e.EncryptionAuthTag) > 0

	switch e.EncryptionMode {
	case EncryptionModeUnencrypted, EncryptionModeUnspecified:
		if hasEncryptedPayload || hasEncryptionFields {
			return ErrEncryptionConflict
		}
	case EncryptionModeEdgeEncrypted:
		// Payload is required at API boundary, encrypted fields optional for downstream
	case EncryptionModeClientEncrypted:
		if !hasEncryptedPayload {
			return errors.New("client encryption requires encrypted_payload")
		}
		if e.EncryptionAlgorithm == "" {
			return errors.New("client encryption requires encryption_algorithm")
		}
	}

	return nil
}

// WithMetadata adds metadata to the envelope.
func (e *Envelope) WithMetadata(key, value string) *Envelope {
	if e.Metadata == nil {
		e.Metadata = make(Metadata)
	}
	e.Metadata[key] = value
	return e
}

// WithEncryption sets the encryption mode for the envelope.
func (e *Envelope) WithEncryption(mode EncryptionMode) *Envelope {
	e.EncryptionMode = mode
	return e
}

// WithEncryptionKeyID sets the encryption key identifier.
func (e *Envelope) WithEncryptionKeyID(keyID string) *Envelope {
	e.EncryptionKeyID = keyID
	return e
}

// ToJSON serializes the envelope to JSON bytes.
func (e *Envelope) ToJSON() ([]byte, error) {
	if err := e.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	return json.Marshal(e)
}

// FromJSON deserializes an envelope from JSON bytes.
func FromJSON(data []byte) (*Envelope, error) {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, fmt.Errorf("failed to unmarshal envelope: %w", err)
	}

	if env.Metadata == nil {
		env.Metadata = make(Metadata)
	}

	return &env, nil
}

// GenerateMessageID creates a new unique message identifier.
func GenerateMessageID() string {
	return uuid.New().String()
}

// NewMessage creates a new queue message with a generated ID and current timestamp.
func NewMessage(queueID string, envelope *Envelope, ttl time.Duration) *Message {
	now := time.Now().UTC()
	return &Message{
		ID:         GenerateMessageID(),
		QueueID:    queueID,
		Envelope:   envelope,
		QueuedAt:   now,
		VisibleAt:  now,
		ExpiresAt:  now.Add(ttl),
	}
}

// NewMessageWithID creates a new queue message with a specific ID.
func NewMessageWithID(id, queueID string, envelope *Envelope, queuedAt, visibleAt, expiresAt time.Time) *Message {
	return &Message{
		ID:            id,
		QueueID:       queueID,
		Envelope:      envelope,
		QueuedAt:      queuedAt,
		VisibleAt:     visibleAt,
		ExpiresAt:     expiresAt,
		ReceiptHandle: GenerateMessageID(), // Generate receipt handle on creation
	}
}

// ToJSON serializes the message to JSON bytes.
func (m *Message) ToJSON() ([]byte, error) {
	return json.Marshal(m)
}

// MessageFromJSON deserializes a message from JSON bytes.
func MessageFromJSON(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal message: %w", err)
	}
	return &msg, nil
}

// IsExpired checks if the message has expired.
func (m *Message) IsExpired() bool {
	return time.Now().UTC().After(m.ExpiresAt)
}

// IsVisible checks if the message is available for consumption.
func (m *Message) IsVisible() bool {
	return time.Now().UTC().After(m.VisibleAt) || time.Now().UTC().Equal(m.VisibleAt)
}
