import { Logger } from 'homebridge';
import { OtodataResponse, PluginConfig } from './types';
export declare function fetchPropaneLevel(config: PluginConfig, log: Logger): Promise<OtodataResponse>;
