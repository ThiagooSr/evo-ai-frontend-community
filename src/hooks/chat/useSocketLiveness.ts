import { useEffect, useRef } from 'react';
import type { BaseActionCableConnector } from '@/services/chat/websocket/BaseActionCableConnector';
import { requestRealtimeResync } from '@/services/chat/websocket/realtimeResync';

// Abas escondidas têm timers estrangulados pelo navegador: se ficou tempo
// suficiente fora, pode ter perdido mensagens mesmo sem o socket avisar a queda.
const HIDDEN_RESYNC_THRESHOLD_MS = 20_000;

/**
 * Mantém o socket vivo e pede ressincronização dos dados quando a aba volta a
 * ficar visível ou a internet volta. Sem isso, mensagens recebidas durante a
 * ausência só apareciam após F5 (o ActionCable não reenvia eventos perdidos).
 */
export const useSocketLiveness = (
  getConnector: () => BaseActionCableConnector | null,
  enabled: boolean,
  { resync }: { resync: boolean },
): void => {
  const hiddenAtRef = useRef<number | null>(null);
  const getConnectorRef = useRef(getConnector);
  getConnectorRef.current = getConnector;

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;

      getConnectorRef.current()?.ensureConnected();
      if (resync && hiddenFor >= HIDDEN_RESYNC_THRESHOLD_MS) {
        requestRealtimeResync('visible');
      }
    };

    const handleOnline = () => {
      getConnectorRef.current()?.ensureConnected();
      if (resync) requestRealtimeResync('online');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, resync]);
};
