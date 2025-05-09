import { DatabaseSync, SupportedValueType } from "node:sqlite";

const client = new DatabaseSync(Deno.env.get("DB_PATH") ?? "test.db");

interface SqlInstructions {
  query: string;
  params: any[];
}

function isSqlInstructions(value: any): value is SqlInstructions {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.query === "string" &&
    Array.isArray(value.params)
  );
}

// naive sql tag
export function sql(
  strings: TemplateStringsArray,
  ...interpolations: (SupportedValueType | SqlInstructions | (SqlInstructions | SupportedValueType)[])[]
): SqlInstructions {
  let resultQuery = "";
  const resultParams: SupportedValueType[] = [];

  for (let i = 0; i < interpolations.length; i++) {
    const currentTemplate = strings.raw[i];

    resultQuery += currentTemplate;

    const currentInterpolations = interpolations[i];

    if (isSqlInstructions(currentInterpolations)) {
      resultQuery += currentInterpolations.query;
      resultParams.push(...currentInterpolations.params);
      continue;
    }

    if (Array.isArray(currentInterpolations)) {
      for (let j = 0; j < currentInterpolations.length; j++) {
        const currentInterpolation = currentInterpolations[j];

        if (isSqlInstructions(currentInterpolation)) {
          resultQuery += currentInterpolation.query;
          resultParams.push(...currentInterpolation.params);
        } else {
          resultQuery += "?";
          resultParams.push(currentInterpolation);
        }

        if (j < currentInterpolations.length - 1) {
          resultQuery += ", ";
        }
      }
      continue;
    }

    resultQuery += "?";
    resultParams.push(currentInterpolations);
  }

  return {
    query: resultQuery + strings.raw.at(-1),
    params: resultParams
  }
}

export const exec = ({ query, params }: SqlInstructions): any => {
  const statement = client.prepare(query);
  const isReadQuery = query.trim().toLowerCase().startsWith("select");

  if (isReadQuery) {
    return statement.all(...params);
  } 
  
  return statement.run(...params);
}
