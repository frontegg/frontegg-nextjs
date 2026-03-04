/** Type declaration for iron-session/edge to avoid pulling in broken package types */
declare module 'iron-session/edge' {
  type PasswordOption = string | Record<string, string>;
  export function unsealData<T>(seal: string, options: { password: PasswordOption }): Promise<T>;
  export function sealData(data: unknown, options: { password: PasswordOption; ttl?: number }): Promise<string>;
}
