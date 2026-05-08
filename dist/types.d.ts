export interface PluginConfig {
    name: string;
    shareId: string;
    tankCapacityGallons: number;
    pollIntervalMinutes?: number;
    lowThreshold?: number;
    apiBaseUrl?: string;
}
export interface OtodataResponse {
    serialNumber: number;
    model: string;
    lastLevel: number;
    lastRead: string;
}
export interface PropaneState {
    percentage: number;
    gallons: number;
    lastRead: string;
}
