export const writeOutput = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

export const writeError = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

export const writeJSON = (value: unknown): void => {
  if (value === undefined) {
    return;
  }

  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};
