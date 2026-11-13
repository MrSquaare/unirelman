import * as z from "zod";

export class InvalidJSONError extends Error {
  readonly source: string;
  readonly details: string;

  constructor(source: string, details: string) {
    super(`Invalid JSON in ${source}\n${details}`);

    this.name = "InvalidJSONError";
    this.source = source;
    this.details = details;
  }
}

const decodeJSON = (source: string, content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidJSONError(source, error.message);
    }

    throw error;
  }
};

export const parseJSON = <TSchema extends z.ZodType>(
  source: string,
  content: string,
  schema: TSchema,
): z.output<TSchema> => {
  const result = schema.safeParse(decodeJSON(source, content));

  if (!result.success) {
    throw new InvalidJSONError(source, z.prettifyError(result.error));
  }

  return result.data;
};
