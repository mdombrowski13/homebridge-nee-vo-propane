import { OtodataResponse, PluginConfig, PropaneState } from './types';
export declare class StateManager {
    private state;
    hasChanged(response: OtodataResponse): boolean;
    update(response: OtodataResponse, config: PluginConfig): PropaneState;
    getCurrent(): PropaneState | null;
}
