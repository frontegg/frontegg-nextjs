
export class FronteggEnvNotFound extends Error {
  constructor(...name: string[]) {
    const message = `Missing one or more environment variables (${name.join(', ')}). add it to the .env.local file.`
    super(message);
    Object.setPrototypeOf(this, FronteggEnvNotFound.prototype);
  }
}
