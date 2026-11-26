import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Minimal `renderHook` built on react-dom (no @testing-library dependency).
 * Must be used in a DOM environment (jsdom).
 */
export function renderHook<P, R>(hook: (props: P) => R, initialProps: P) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const result = { current: undefined as unknown as R };
  const container = document.createElement('div');
  const root = createRoot(container);

  const Harness = ({ hookProps }: { hookProps: P }) => {
    result.current = hook(hookProps);
    return null;
  };

  const render = (props: P) => {
    act(() => {
      root.render(createElement(Harness, { hookProps: props }));
    });
  };

  render(initialProps);

  return {
    result,
    rerender: render,
    unmount: () =>
      act(() => {
        root.unmount();
      }),
  };
}
