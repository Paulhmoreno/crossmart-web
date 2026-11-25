import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiConfigSource, AiConfigStatus, AiProviderName } from '@/api/schema';
import type { AiConfig } from '../ai-settings.types';
import type * as AiHooks from '../hooks/useAiConfig';
import {
  useClearAiConfig,
  useListAiModels,
  useSaveAiConfig,
  useTestAiConfig,
} from '../hooks/useAiConfig';
import { AiSettingsForm } from './AiSettingsForm';

vi.mock('../hooks/useAiConfig', async (importOriginal) => ({
  ...(await importOriginal<typeof AiHooks>()),
  useSaveAiConfig: vi.fn<typeof useSaveAiConfig>(),
  useTestAiConfig: vi.fn<typeof useTestAiConfig>(),
  useListAiModels: vi.fn<typeof useListAiModels>(),
  useClearAiConfig: vi.fn<typeof useClearAiConfig>(),
}));

const EMPTY_CONFIG: AiConfig = {
  configured: false,
  source: AiConfigSource.none,
  provider: AiProviderName.anthropic,
  baseUrl: null,
  model: 'claude-sonnet-4-6',
  hasApiKey: false,
  status: AiConfigStatus.DISABLED,
  capabilities: {
    structuredOutput: false,
    jsonSchema: false,
    streaming: false,
    toolCalling: false,
    vision: false,
    modelsEndpoint: false,
  },
  lastError: null,
  lastTestedAt: null,
  updatedAt: null,
};

function setup(config: AiConfig = EMPTY_CONFIG) {
  const saveMutate = vi.fn<() => void>();
  const testMutate = vi.fn<() => void>();
  const listMutateAsync = vi
    .fn<
      () => Promise<{
        supported: boolean;
        models: { id: string; ownedBy: string | null }[];
        error: string | null;
      }>
    >()
    .mockResolvedValue({
      supported: true,
      models: [{ id: 'gpt-4o-mini', ownedBy: 'openai' }],
      error: null,
    });

  vi.mocked(useSaveAiConfig).mockReturnValue({
    mutate: saveMutate,
    reset: vi.fn<() => void>(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSaveAiConfig>);
  vi.mocked(useTestAiConfig).mockReturnValue({
    mutate: testMutate,
    reset: vi.fn<() => void>(),
    isPending: false,
    error: null,
    data: undefined,
  } as unknown as ReturnType<typeof useTestAiConfig>);
  vi.mocked(useListAiModels).mockReturnValue({
    mutateAsync: listMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useListAiModels>);
  vi.mocked(useClearAiConfig).mockReturnValue({
    mutateAsync: vi.fn<() => Promise<void>>(),
    isPending: false,
  } as unknown as ReturnType<typeof useClearAiConfig>);

  render(<AiSettingsForm workspaceId="ws-1" config={config} />);
  return { saveMutate, testMutate, listMutateAsync };
}

describe('AiSettingsForm', () => {
  it('supports configuring OpenAI Compatible with base URL, masked API key, manual model, model discovery, and test connection', async () => {
    const { saveMutate, testMutate, listMutateAsync } = setup();

    expect(screen.getByText('Sin configurar')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password');

    await userEvent.type(screen.getByLabelText('URL base de la API'), 'https://api.example.com/v1');
    await userEvent.type(screen.getByLabelText('API Key'), 'sk-demo-key');
    await userEvent.click(screen.getByRole('button', { name: 'Consultar modelos' }));

    expect(listMutateAsync).toHaveBeenCalledWith({
      provider: AiProviderName.openai_compatible,
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-demo-key',
    });

    await userEvent.type(screen.getByLabelText('Modelo'), 'gpt-4o-mini');
    await userEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    expect(testMutate).toHaveBeenCalledWith({
      provider: AiProviderName.openai_compatible,
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-demo-key',
      model: 'gpt-4o-mini',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(saveMutate).toHaveBeenCalledWith(
      {
        provider: AiProviderName.openai_compatible,
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-demo-key',
        model: 'gpt-4o-mini',
      },
      expect.anything(),
    );
  });

  it('displays active provider, model, verified capabilities, and last error when configured', () => {
    setup({
      ...EMPTY_CONFIG,
      configured: true,
      source: AiConfigSource.workspace,
      provider: AiProviderName.openai_compatible,
      baseUrl: 'https://api.example.com/v1',
      model: 'deepseek-chat',
      hasApiKey: true,
      status: AiConfigStatus.ERROR,
      capabilities: {
        structuredOutput: true,
        jsonSchema: false,
        streaming: true,
        toolCalling: true,
        vision: false,
        modelsEndpoint: true,
      },
      lastError: 'Rate limit exceeded',
    });

    expect(screen.getByText('deepseek-chat')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('✓ Salida estructurada')).toBeInTheDocument();
    expect(screen.getByText('— JSON Schema estricto')).toBeInTheDocument();
  });
});
