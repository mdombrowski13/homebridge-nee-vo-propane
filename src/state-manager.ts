import { OtodataResponse, PluginConfig, PropaneState } from './types';

export class StateManager {
  private state: PropaneState | null = null;

  hasChanged(response: OtodataResponse): boolean {
    if (this.state === null) return true;
    return this.state.lastRead !== response.lastRead;
  }

  update(response: OtodataResponse, config: PluginConfig): PropaneState {
    const gallons = (response.lastLevel / 100) * config.tankCapacityGallons;
    this.state = {
      percentage: response.lastLevel,
      gallons,
      lastRead: response.lastRead,
    };
    return this.state;
  }

  getCurrent(): PropaneState | null {
    return this.state;
  }
}
