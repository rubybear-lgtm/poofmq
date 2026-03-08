#!/usr/bin/env node
/**
 * Integration test: push and pop against a running poofMQ API.
 * Set POOFMQ_BASE_URL (or GO_API_BASE_URL) to target a running API.
 * Queue is created implicitly by push.
 */
import { PoofmqClient } from "../../dist/src/index.js";

const baseUrl =
  process.env.POOFMQ_BASE_URL || process.env.GO_API_BASE_URL || "http://localhost:8080";
const client = new PoofmqClient({ baseUrl });

const queueId = `sdk-test-${Date.now()}`;

async function main() {
  try {
    const pushRes = await client.push(queueId, "test.event", { foo: "bar" });
    if (!pushRes.messageId) {
      console.error("FAIL: push response missing messageId");
      process.exit(1);
    }
    console.log("PUSH OK:", pushRes.messageId);

    const message = await client.pop(queueId);
    if (!message || !message.envelope) {
      console.error("FAIL: pop returned no message or envelope");
      process.exit(1);
    }
    if (message.envelope.eventType !== "test.event") {
      console.error("FAIL: eventType mismatch", message.envelope.eventType);
      process.exit(1);
    }
    if (JSON.stringify(message.envelope.payload) !== '{"foo":"bar"}') {
      console.error("FAIL: payload mismatch", message.envelope.payload);
      process.exit(1);
    }
    console.log("POP OK:", message.envelope.eventType, message.envelope.payload);

    const empty = await client.pop(queueId);
    if (empty !== null) {
      console.error("FAIL: expected null for empty queue, got", empty);
      process.exit(1);
    }
    console.log("EMPTY QUEUE OK");

    console.log("Integration tests passed.");
  } catch (err) {
    console.error("Integration test error:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
    process.exit(1);
  }
}

main();
