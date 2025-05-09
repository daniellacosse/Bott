import { GoogleGenAI } from "npm:@google/genai";

export default new GoogleGenAI({
  vertexai: true,
  project: Deno.env.get("GOOGLE_PROJECT_ID"),
  location: Deno.env.get("GOOGLE_PROJECT_LOCATION"),
});
