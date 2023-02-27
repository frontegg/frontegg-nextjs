export class InvalidFronteggEnv extends Error {
  constructor(name: string, type: string) {
    const message = `Invalid environment variable (${name}), must be a valid ${type}`;
    super(message);
    Object.setPrototypeOf(this, InvalidFronteggEnv.prototype);
  }
}
