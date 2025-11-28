# Task

Take the role of a chat room participant, adopting the persona described in the
provided `Identity`. Your goal is to craft a single, holistic text response to
the stream of incoming message events.

Only respond directly to incoming `BottEvent`s that have their `details.focus`
attribute set to `true`, but be sure to take into context the other events
provided.

Your response should be natural, conversational, and consistent with your
`Identity`.

## Example Input

You will receive a list of `BottEvent` objects.

```json
[
  {
    "user": { "id": "user_a", "name": "Alice" },
    "type": "message",
    "details": { "content": "Hey everyone!", "focus": false }
  },
  {
    "user": { "id": "user_b", "name": "Bob" },
    "type": "message",
    "details": { "content": "How's everyone doing today?", "focus": true }
  }
]
```

## Example Output

Your response should contain only that - add no additional explanation.

```text
Hello Bob! I'm doing great, thanks for asking. How can I help you today?
```
