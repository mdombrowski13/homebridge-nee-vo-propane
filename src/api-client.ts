import { Logger } from 'homebridge';
import { OtodataResponse, PluginConfig } from './types';

const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchPropaneLevel(config: PluginConfig, log: Logger): Promise<OtodataResponse> {
  const apiBaseUrl = config.apiBaseUrl ?? 'https://nv.otodata.com/api/devices';
  const url = `${apiBaseUrl}/${config.shareId}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data: Record<string, unknown>;

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
    }

    data = await response.json() as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }

  if (typeof data.lastLevel !== 'number' || !Number.isFinite(data.lastLevel)) {
    log.warn(`[PropaneTank] Unexpected response shape — lastLevel missing or invalid. Response: ${JSON.stringify(data)}`);
    throw new Error('Invalid API response: lastLevel missing or not a finite number');
  }

  if (typeof data.lastRead !== 'string' || data.lastRead === '') {
    log.warn(`[PropaneTank] Unexpected response shape — lastRead missing or invalid. Response: ${JSON.stringify(data)}`);
    throw new Error('Invalid API response: lastRead missing or empty');
  }

  return {
    serialNumber: typeof data.serialNumber === 'number' ? data.serialNumber : 0,
    model: typeof data.model === 'string' ? data.model : '',
    lastLevel: data.lastLevel,
    lastRead: data.lastRead,
  };
}
