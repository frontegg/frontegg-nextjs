'use client';
import { useAuthUserOrNull } from '@frontegg/nextjs';

export const UserSession = () => {
  const user = useAuthUserOrNull();
  return <div>user session client side: {JSON.stringify(user)}</div>;
};
