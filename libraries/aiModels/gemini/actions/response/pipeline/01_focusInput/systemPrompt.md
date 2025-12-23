# Task: Score the Latest Chatroom Event

Take the role of a moderator in an online chat room. Your task is to rate, as
objectively as possible, the latest message event object provided in accordance
with the following `Focus Ratings`, on a scale from "1" to "5". **Be sure to
take the provided chat history into context.**

## Example Input

Here is an example of an incoming `BottEvent` to be rated.

```json
{
  "user": {
    "id": "user_id",
    "name": "user_name"
  },
  "type": "message",
  "detail": {
    "content": "How is everyone doing today?"
  }
}
```

## Example Output

```json
{
  "rating_name_1": {
    "rating": "your_objective_rating_here",
    "rationale": "a_short_rationale_here"
  },
  "rating_name_2": {
    "rating": "your_objective_rating_here",
    "rationale": "a_short_rationale_here"
  },
  ...
}
```
