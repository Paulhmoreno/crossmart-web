import { useCallback, useRef, useState } from 'react';
import { env } from '@/config/env';

export type AgentExecutionPhase =
  | 'thinking'
  | 'waiting_provider'
  | 'running_tool'
  | 'awaiting_approval'
  | 'cancelling';

export interface AgentToolRunView {
  id: string;
  toolName: string;
  title: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  outcome?: string;
  isError?: boolean;
}

export interface AgentTurnFinishedPayload {
  turnId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';
  text: string;
  toolsUsed: string[];
  toolRuns: AgentToolRunView[];
  error?: string;
}

type SseEventFrame =
  | { type: 'turn_started'; turnId: string; agentKey: string; startedAt: string }
  | { type: 'status'; phase: AgentExecutionPhase; detail?: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_started'; tool: AgentToolRunView }
  | { type: 'tool_finished'; tool: AgentToolRunView }
  | { type: 'error'; code: string; message: string }
  | ({ type: 'turn_finished' } & AgentTurnFinishedPayload);

export interface AgentStreamState {
  isBusy: boolean;
  isCancelling: boolean;
  turnId: string | null;
  phase: AgentExecutionPhase | null;
  phaseDetail: string | null;
  streamingText: string;
  toolRuns: AgentToolRunView[];
  errorMessage: string | null;
}

const SSE_DATA_PREFIX = 'data:';
const SSE_DATA_PREFIX_LEN = SSE_DATA_PREFIX.length;

const INITIAL_STATE: AgentStreamState = {
  isBusy: false,
  isCancelling: false,
  turnId: null,
  phase: null,
  phaseDetail: null,
  streamingText: '',
  toolRuns: [],
  errorMessage: null,
};

function upsertToolRun(list: AgentToolRunView[], next: AgentToolRunView): AgentToolRunView[] {
  const idx = list.findIndex((item) => item.id === next.id);
  if (idx === -1) return [...list, next];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}

/**
 * Shared SSE execution stream hook for Crossmart agent Supervisors (`sales`, `social`, and future agents).
 * Mirrors `useAgentWorkerTurn`: handles live text deltas, tool start/finish rows, provider wait state,
 * cancellation confirmation, and guaranteed cleanup on disconnect or error.
 */
export function useAgentStream() {
  const [state, setState] = useState<AgentStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const turnIdRef = useRef<string | null>(null);
  const cancelUrlBuilderRef = useRef<((turnId: string) => string) | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(async () => {
    const activeTurnId = turnIdRef.current;
    setState((prev) => ({
      ...prev,
      isCancelling: true,
      phase: 'cancelling',
      phaseDetail: null,
    }));
    if (activeTurnId && cancelUrlBuilderRef.current) {
      const cancelPath = cancelUrlBuilderRef.current(activeTurnId);
      await fetch(`${env.apiUrl}${cancelPath}`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => undefined);
    }
    abortRef.current?.abort();
  }, []);

  const startStream = useCallback(
    async (options: {
      path: string;
      body: Record<string, unknown>;
      cancelPathForTurn: (turnId: string) => string;
      onFinished?: (payload: AgentTurnFinishedPayload) => void;
      onError?: (message: string) => void;
    }): Promise<AgentTurnFinishedPayload | null> => {
      if (abortRef.current) return null;

      const controller = new AbortController();
      abortRef.current = controller;
      turnIdRef.current = null;
      cancelUrlBuilderRef.current = options.cancelPathForTurn;

      setState({
        isBusy: true,
        isCancelling: false,
        turnId: null,
        phase: 'thinking',
        phaseDetail: null,
        streamingText: '',
        toolRuns: [],
        errorMessage: null,
      });

      let finalPayload: AgentTurnFinishedPayload | null = null;
      let accumulatedText = '';
      let latestToolRuns: AgentToolRunView[] = [];

      const applyFrame = (frame: SseEventFrame) => {
        switch (frame.type) {
          case 'turn_started':
            turnIdRef.current = frame.turnId;
            setState((prev) => ({ ...prev, turnId: frame.turnId, phase: 'waiting_provider' }));
            break;
          case 'status':
            setState((prev) => ({
              ...prev,
              phase: frame.phase,
              phaseDetail: frame.detail ?? null,
            }));
            break;
          case 'text_delta':
            accumulatedText += frame.delta;
            setState((prev) => ({
              ...prev,
              streamingText: prev.streamingText + frame.delta,
            }));
            break;
          case 'tool_started':
          case 'tool_finished':
            latestToolRuns = upsertToolRun(latestToolRuns, frame.tool);
            setState((prev) => ({
              ...prev,
              toolRuns: upsertToolRun(prev.toolRuns, frame.tool),
            }));
            break;
          case 'error':
            setState((prev) => ({ ...prev, errorMessage: frame.message }));
            options.onError?.(frame.message);
            break;
          case 'turn_finished':
            finalPayload = frame;
            break;
        }
      };

      try {
        const response = await fetch(`${env.apiUrl}${options.path}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(options.body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as { message?: string };
          const msg = errBody.message ?? `HTTP ${response.status}`;
          setState((prev) => ({ ...prev, isBusy: false, isCancelling: false, errorMessage: msg }));
          options.onError?.(msg);
          return null;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body unavailable.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            const dataLines = block
              .split('\n')
              .filter((line) => line.startsWith(SSE_DATA_PREFIX))
              .map((line) => line.slice(SSE_DATA_PREFIX_LEN).trim());
            if (dataLines.length === 0) continue;
            try {
              const parsed = JSON.parse(dataLines.join('\n')) as SseEventFrame;
              applyFrame(parsed);
            } catch {
              // Ignore malformed keepalive chunk.
            }
          }
        }

        if (finalPayload) {
          options.onFinished?.(finalPayload);
          return finalPayload;
        }

        const synthetic: AgentTurnFinishedPayload = {
          turnId: turnIdRef.current ?? 'local',
          status: controller.signal.aborted ? 'cancelled' : 'completed',
          text: accumulatedText,
          toolsUsed: latestToolRuns.map((tool) => tool.toolName),
          toolRuns: latestToolRuns,
        };
        options.onFinished?.(synthetic);
        return synthetic;
      } catch (err) {
        if (controller.signal.aborted) {
          const cancelledPayload: AgentTurnFinishedPayload = {
            turnId: turnIdRef.current ?? 'cancelled',
            status: 'cancelled',
            text: accumulatedText,
            toolsUsed: latestToolRuns.map((tool) => tool.toolName),
            toolRuns: latestToolRuns,
          };
          options.onFinished?.(cancelledPayload);
          return cancelledPayload;
        }
        const msg = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, errorMessage: msg }));
        options.onError?.(msg);
        return null;
      } finally {
        abortRef.current = null;
        turnIdRef.current = null;
        cancelUrlBuilderRef.current = null;
        setState((prev) => ({
          ...prev,
          isBusy: false,
          isCancelling: false,
          phase: null,
          phaseDetail: null,
          streamingText: '',
        }));
      }
    },
    [],
  );

  return { state, startStream, cancel, reset };
}
