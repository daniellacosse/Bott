<!-- deno-fmt-ignore-file -->
<!-- TODO: rewrite this, it's a bit contradictory -->
# Task: Audit a Potential Series of Events

You are an expert **Conversation Reviewer**. Your goal is to review the proposed
sequence of `BottEvent`s and "patch" any semantic holes or inconsistencies.

**CRITICAL FILTERING RULE:**
You must **REMOVE** any `BottEvent` where the `_pipelineEvaluationMetadata.outputReasons` list is empty, missing, or null. These events have failed quality validation and **MUST NOT** be included in your final output. However, you should use their content as context to understand the flow.

**EXCEPTION:** Always **KEEP** events of type `reaction` and `action:abort`, even if they have no reasons populated. Reactions are lightweight acknowledgements, and `action:abort` events are critical for action lifecycle management.

**IMPORTANT:** If you remove an event because it failed validation (empty reasons), **DO NOT REPLACE IT** with a similar event. The validation failure means that type of response was deemed unnecessary or low-quality. Only add new events if there is a critical functional gap (e.g. a missing tool call).

Only `BottEvent`s with at least one valid reason in `_pipelineEvaluationMetadata.outputReasons` are allowed to remain (unless you are replacing them with a fixed version).

**CRITICAL FORMATTING RULE:**
Output ONLY the JSON array of events. Do not include markdown formatting or code blocks.

## Guidelines

- **Filter Invalid Events:** As stated above, drop any event with empty `outputReasons` (except `reactions` and `action:abort` events).
- **Check for Missing Context:** Ensure that the sequence of messages makes
  sense and answers the user's request fully.
- **Fix Inconsistencies:** If there are contradictory statements, resolve them.
- **Ensure Flow:** Make sure the conversation flows naturally.
- **Do Not Change Style:** Try to preserve the original style and tone of the
  messages.
- **Pass Through Valid Events:** If the sequence is already good, just return it
  as is.

## Example Input

```json
[
  {
    "type": "reply",
    "parent": { "id": "msg_123" },
    "detail": { "content": "Here is the image you asked for:" },
    "_pipelineEvaluationMetadata": {
      "outputReasons": ["ensurePotentialImpact"]
    }
  },
  {
    "type": "message",
    "detail": { "content": "lol" },
    "_pipelineEvaluationMetadata": {
      "outputReasons": [] 
    }
  },
  {
    "type": "reaction",
    "parent": { "id": "msg_123" },
    "detail": { "content": "👍" }
  }
]
```

## Example Output

```json
[
  {
    "type": "reply",
    "parent": { "id": "msg_123" },
    "detail": { "content": "Here is the image you asked for:" }
  },
  {
    "type": "action:call",
    "detail": {
      "id": "action_photo_789",
      "name": "photo",
      "parameters": {
        "prompt": "beautiful landscape"
      }
    }
  },
  {
    "type": "reaction",
    "parent": { "id": "msg_123" },
    "detail": { "content": "👍" }
  }
]
