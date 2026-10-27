import * as React from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ChatActivityContext, type ChatActivity, type ChatActivityContextValue } from './chatActivity';

export function ChatActivityProvider({ children }: { children: React.ReactNode }) {
  const [activity, setActivity] = React.useState<ChatActivity | null>(null);
  const activityRef = React.useRef<ChatActivity | null>(null);
  const allowRef = React.useRef(false);

  activityRef.current = activity;

  const register = React.useCallback((next: ChatActivity | null) => {
    activityRef.current = next;
    setActivity(next);
  }, []);

  const allowNextNavigation = React.useCallback((navigate: () => void) => {
    allowRef.current = true;
    try {
      navigate();
    } finally {
      allowRef.current = false;
    }
  }, []);

  const blocker = useBlocker(
    React.useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => {
        if (!activityRef.current?.streaming) return false;
        if (allowRef.current) return false;
        return currentLocation.pathname !== nextLocation.pathname;
      },
      [],
    ),
  );

  React.useEffect(() => {
    if (!activity?.streaming) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activity?.streaming]);

  const value = React.useMemo<ChatActivityContextValue>(
    () => ({ activity, register, allowNextNavigation }),
    [activity, register, allowNextNavigation],
  );

  const blocked = blocker.state === 'blocked';

  return (
    <ChatActivityContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={blocked}
        title="Stop generating?"
        description="A response is still being generated. If you leave now, generation stops and the partial response will not be saved."
        confirmLabel="Leave and stop"
        cancelLabel="Stay"
        destructive
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
        onConfirm={() => {
          activityRef.current?.stop();
          if (blocker.state === 'blocked') blocker.proceed();
        }}
      />
    </ChatActivityContext.Provider>
  );
}
