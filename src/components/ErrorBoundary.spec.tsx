import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import ErrorBoundary from './ErrorBoundary';

const Fallback = () => <div>fallback</div>;

const Page = ({ crash, onMount }: { crash: boolean; onMount: () => void }) => {
  const mounted = useRef(false);
  if (!mounted.current) {
    mounted.current = true;
    onMount();
  }
  if (crash) throw new Error('boom');
  return <div>page</div>;
};

describe('ErrorBoundary resetKey', () => {
  it('leaves the fallback when resetKey changes after an error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary fallback={Fallback} resetKey="/conversations/a">
        <Page crash onMount={() => {}} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeTruthy();

    rerender(
      <ErrorBoundary fallback={Fallback} resetKey="/conversations/b">
        <Page crash={false} onMount={() => {}} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('page')).toBeTruthy();
  });

  it('does not remount healthy children when resetKey changes', () => {
    const onMount = vi.fn();
    const { rerender } = render(
      <ErrorBoundary fallback={Fallback} resetKey="/conversations/a">
        <Page crash={false} onMount={onMount} />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary fallback={Fallback} resetKey="/conversations/b">
        <Page crash={false} onMount={onMount} />
      </ErrorBoundary>,
    );

    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
