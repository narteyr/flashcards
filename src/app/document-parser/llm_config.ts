import { readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const DEFAULT_CONFIG_PATH = path.join(
  process.cwd(),
  'src',
  'app',
  'document-parser',
  'llm_options.yml',
);

export interface LLMProviderConfig {
  label: string;
  provider: 'google' | 'anthropic' | string;
  model: string;
  env_var: string;
  max_output_tokens?: number;
  temperature?: number;
  description?: string;
}

export interface LLMConfig {
  default_provider?: string;
  providers: Record<string, LLMProviderConfig>;
  metadata?: Record<string, unknown>;
}

interface LoadOptions {
  configPath?: string;
}

let cachedConfig: LLMConfig | null = null;
let cachedPath: string | null = null;

export async function loadLLMConfig(options: LoadOptions = {}): Promise<LLMConfig> {
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  if (cachedConfig && cachedPath === configPath) {
    return cachedConfig;
  }

  const file = await readFile(configPath, 'utf8');
  const parsed = YAML.parse(file) as LLMConfig | null;
  if (!parsed || !parsed.providers) {
    throw new Error(`Invalid LLM configuration at ${configPath}`);
  }

  cachedConfig = parsed;
  cachedPath = configPath;
  return parsed;
}

export async function resolveProvider(
  providerKey?: string,
  options?: LoadOptions,
): Promise<{ key: string; config: LLMProviderConfig; full: LLMConfig }> {
  const config = await loadLLMConfig(options);
  const fallback = config.default_provider ?? 'anthropic_claude';
  const selectedKey = providerKey ?? fallback;
  const provider = config.providers[selectedKey];
  if (!provider) {
    const available = Object.keys(config.providers).join(', ') || 'none';
    throw new Error(
      `Provider "${selectedKey}" not found in llm_options.yml. Available providers: ${available}`,
    );
  }
  return { key: selectedKey, config: provider, full: config };
}

export function resetLLMConfigCache(): void {
  cachedConfig = null;
  cachedPath = null;
}

