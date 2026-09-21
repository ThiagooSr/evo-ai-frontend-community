/**
 * O ActionCable não reenvia o que aconteceu enquanto o socket esteve fora do ar
 * (queda de rede, aba em segundo plano, computador dormindo). Quem detecta que
 * pode ter havido essa lacuna dispara este evento; o ChatContext escuta e
 * rebusca a conversa aberta e a lista pela API.
 */
export const REALTIME_RESYNC_EVENT = 'evolution:realtime-resync';

export type RealtimeResyncReason = 'reconnected' | 'visible' | 'online';

export const requestRealtimeResync = (reason: RealtimeResyncReason): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REALTIME_RESYNC_EVENT, { detail: { reason } }));
};
