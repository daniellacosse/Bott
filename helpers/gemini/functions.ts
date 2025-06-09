import {
  type AnyShape,
  type BottRequestHandler,
  BottRequestOptionType,
} from "@bott/model";
import {
  type FunctionDeclaration,
  Type as FunctionCallingParameterType,
} from "npm:@google/genai";

export const createGeminiFunctionDefinition = (
  requestHandler: BottRequestHandler<AnyShape, AnyShape> & { name: string },
): FunctionDeclaration => {
  const properties: Record<
    string,
    { type: FunctionCallingParameterType; description?: string }
  > = {};
  const requiredParams: string[] = [];

  if (requestHandler.options) {
    for (const option of requestHandler.options) {
      const geminiType = mapBottTypeToGeminiType(option.type);

      if (!geminiType) {
        console.warn(
          `[WARN] Skipping option "${option.name}" for function "${requestHandler.name}" due to unsupported type "${option.type}".`,
        );
        continue;
      }

      properties[option.name] = { type: geminiType };
      if (option.description) {
        properties[option.name].description = option.description;
      }
      if (option.required) {
        requiredParams.push(option.name);
      }
    }
  }

  return {
    name: requestHandler.name,
    description: requestHandler.description,
    parameters: {
      type: FunctionCallingParameterType.OBJECT,
      properties,
      required: requiredParams,
    },
  };
};

function mapBottTypeToGeminiType(
  bottType: BottRequestOptionType,
): FunctionCallingParameterType | undefined {
  switch (bottType) {
    case BottRequestOptionType.STRING:
      return FunctionCallingParameterType.STRING;
    case BottRequestOptionType.INTEGER:
      return FunctionCallingParameterType.INTEGER;
    case BottRequestOptionType.BOOLEAN:
      return FunctionCallingParameterType.BOOLEAN;
    default:
      return undefined;
  }
}
