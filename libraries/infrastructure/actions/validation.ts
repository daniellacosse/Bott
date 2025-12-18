
import type {
  BottActionParameter,
  BottActionParameterEntry,
} from "@bott/model";

export function _validateParameters(
  schema: BottActionParameter[],
  parameters: BottActionParameterEntry[],
) {
  // Check for unknown parameters
  for (const param of parameters) {
    if (!schema.find((s) => s.name === param.name)) {
      throw new Error(`Unknown parameter: ${param.name}`);
    }
  }

  for (const field of schema) {
    const param = parameters.find((p) => p.name === field.name);

    if (field.required && param === undefined) {
      throw new Error(`Missing required parameter: ${field.name}`);
    }

    if (param !== undefined) {
      if (field.type === "file") {
        if (!(param.value instanceof File)) {
          throw new Error(
            `Parameter '${field.name}' must be of type file`,
          );
        }
      } else if (
        field.type === "string" ||
        field.type === "number" ||
        field.type === "boolean"
      ) {
        if (typeof param.value !== field.type) {
          throw new Error(
            `Parameter '${field.name}' must be of type ${field.type}`,
          );
        }
      }

      if (field.allowedValues && !field.allowedValues.includes(param.value)) {
        throw new Error(
          `Parameter '${field.name}' has invalid value '${param.value}'. Allowed values: ${field.allowedValues.join(", ")
          }`,
        );
      }
    }
  }
}
