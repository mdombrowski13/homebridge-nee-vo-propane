import { PlatformAccessory, Service, Characteristic } from 'homebridge';
import { PropaneTankPlatform } from './platform';
import { PluginConfig, PropaneState } from './types';
import { fetchPropaneLevel } from './api-client';
import { StateManager } from './state-manager';

const POLL_MIN_MINUTES = 60;
const DEFAULT_POLL_MINUTES = 1440;
const DEFAULT_LOW_THRESHOLD = 30;
const DEFAULT_API_BASE_URL = 'https://nv.otodata.com/api/devices';

const UUID_PROPANE_SERVICE   = 'E863F010-079E-48FF-8F27-9C2605A29F52';
const UUID_GALLONS_REMAINING = 'E863F011-079E-48FF-8F27-9C2605A29F52';
const UUID_TANK_CAPACITY     = 'E863F012-079E-48FF-8F27-9C2605A29F52';

export class PropaneTankAccessory {
  private readonly infoService: Service;
  private readonly humiditySensor: Service;
  private readonly batteryService: Service;
  private readonly propaneService: Service;
  private readonly gallonsChar: Characteristic;
  private readonly tankCapacityChar: Characteristic;
  private readonly stateManager = new StateManager();
  private readonly pollIntervalMs: number;
  private readonly lowThreshold: number;
  private readonly resolvedConfig: Required<PluginConfig>;

  constructor(
    private readonly platform: PropaneTankPlatform,
    private readonly accessory: PlatformAccessory,
    config: PluginConfig,
  ) {
    const hap = platform.api.hap;
    const { Service: HapService, Characteristic: HapCharacteristic, Formats, Perms } = hap;

    // Clamp poll interval and warn if below minimum
    const requestedPoll = config.pollIntervalMinutes ?? DEFAULT_POLL_MINUTES;
    const clampedPoll = Math.max(requestedPoll, POLL_MIN_MINUTES);
    if (requestedPoll < POLL_MIN_MINUTES) {
      platform.log.warn(
        `[PropaneTank] WARNING: pollIntervalMinutes (${requestedPoll}) is below the 60-minute minimum. Using 60.`,
      );
    }

    this.pollIntervalMs = clampedPoll * 60 * 1000;
    this.lowThreshold = config.lowThreshold ?? DEFAULT_LOW_THRESHOLD;
    this.resolvedConfig = {
      name: config.name,
      shareId: config.shareId,
      tankCapacityGallons: config.tankCapacityGallons,
      pollIntervalMinutes: clampedPoll,
      lowThreshold: this.lowThreshold,
      apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    };

    // Accessory information
    this.infoService = this.accessory.getService(HapService.AccessoryInformation) as Service;
    this.infoService
      .setCharacteristic(HapCharacteristic.Manufacturer, 'Otodata / Nee-Vo')
      .setCharacteristic(HapCharacteristic.Model, 'Propane Tank Sensor')
      .setCharacteristic(HapCharacteristic.FirmwareRevision, '1.0.2')
      .setCharacteristic(HapCharacteristic.SerialNumber, 'Pending first poll...');

    // Humidity Sensor (primary — Apple Home renders this as "XX%" in the room tile
    // and exposes it as a trigger in automations; propane % maps directly to humidity %)
    this.humiditySensor =
      this.accessory.getService(HapService.HumiditySensor) ??
      this.accessory.addService(HapService.HumiditySensor, config.name);

    this.humiditySensor
      .getCharacteristic(HapCharacteristic.CurrentRelativeHumidity)
      .onGet(() => this.stateManager.getCurrent()?.percentage ?? 0);

    // Battery Service (maps propane % to HomeKit battery UI for low-level alert)
    this.batteryService =
      this.accessory.getService(HapService.Battery) ??
      this.accessory.addService(HapService.Battery, config.name);

    this.batteryService.setCharacteristic(
      HapCharacteristic.ChargingState,
      HapCharacteristic.ChargingState.NOT_CHARGING,
    );

    this.batteryService
      .getCharacteristic(HapCharacteristic.BatteryLevel)
      .onGet(() => this.stateManager.getCurrent()?.percentage ?? 0);

    this.batteryService
      .getCharacteristic(HapCharacteristic.StatusLowBattery)
      .onGet(() => this.getLowBatteryStatus());

    // Custom Propane Service (secondary — gallons and capacity metadata)
    // Search services array directly by UUID — getService(string) is unreliable on PlatformAccessory
    this.propaneService =
      this.accessory.services.find(s => s.UUID === UUID_PROPANE_SERVICE) ??
      this.accessory.addService(new HapService('Propane Tank', UUID_PROPANE_SERVICE, 'propane-tank'));

    this.gallonsChar =
      this.propaneService.characteristics.find(c => c.UUID === UUID_GALLONS_REMAINING) ??
      this.propaneService.addCharacteristic(
        new HapCharacteristic('Gallons Remaining', UUID_GALLONS_REMAINING, {
          format: Formats.FLOAT,
          perms: [Perms.NOTIFY, Perms.PAIRED_READ],
          minValue: 0,
          maxValue: 99999,
          minStep: 0.1,
        }),
      );

    this.tankCapacityChar =
      this.propaneService.characteristics.find(c => c.UUID === UUID_TANK_CAPACITY) ??
      this.propaneService.addCharacteristic(
        new HapCharacteristic('Tank Capacity', UUID_TANK_CAPACITY, {
          format: Formats.FLOAT,
          perms: [Perms.PAIRED_READ],
          minValue: 0,
          maxValue: 99999,
          minStep: 1,
        }),
      );

    // Tank capacity is static — set it once
    this.tankCapacityChar.updateValue(config.tankCapacityGallons);

    // Initial poll immediately, then on interval
    this.poll();
    setInterval(() => this.poll(), this.pollIntervalMs);
  }

  private getLowBatteryStatus(): number {
    const { Characteristic } = this.platform.api.hap;
    const pct = this.stateManager.getCurrent()?.percentage ?? 100;
    return pct < this.lowThreshold
      ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  }

  private async poll(): Promise<void> {
    try {
      const response = await fetchPropaneLevel(this.resolvedConfig, this.platform.log);

      const { Characteristic } = this.platform.api.hap;
      this.infoService.updateCharacteristic(
        Characteristic.SerialNumber,
        response.serialNumber.toString(),
      );

      if (!this.stateManager.hasChanged(response)) {
        this.platform.log.debug('[PropaneTank] No change detected — skipping HomeKit update.');
        return;
      }

      const state = this.stateManager.update(response, this.resolvedConfig);
      this.updateCharacteristics(state);
      this.platform.log.info(
        `[PropaneTank] Updated: ${state.percentage}% (${state.gallons.toFixed(1)} gal remaining, last read ${state.lastRead})`,
      );
    } catch (err) {
      this.platform.log.warn(`[PropaneTank] Poll failed — using cached state. Error: ${err}`);
    }
  }

  private updateCharacteristics(state: PropaneState): void {
    const { Characteristic } = this.platform.api.hap;
    this.humiditySensor.updateCharacteristic(Characteristic.CurrentRelativeHumidity, state.percentage);
    this.batteryService.updateCharacteristic(Characteristic.BatteryLevel, state.percentage);
    this.batteryService.updateCharacteristic(Characteristic.StatusLowBattery, this.getLowBatteryStatus());
    this.gallonsChar.updateValue(state.gallons);
  }
}
