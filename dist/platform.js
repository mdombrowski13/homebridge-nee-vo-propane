"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropaneTankPlatform = exports.PLATFORM_NAME = exports.PLUGIN_NAME = void 0;
const accessory_1 = require("./accessory");
exports.PLUGIN_NAME = 'homebridge-nee-vo-propane';
exports.PLATFORM_NAME = 'PropaneTank';
class PropaneTankPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.cachedAccessories = [];
        this.api.on('didFinishLaunching', () => {
            this.discoverDevices();
        });
    }
    configureAccessory(accessory) {
        this.cachedAccessories.push(accessory);
    }
    discoverDevices() {
        const pluginConfig = this.config;
        if (!pluginConfig.shareId) {
            this.log.error('[PropaneTank] shareId is required in config — accessory not registered.');
            return;
        }
        if (!pluginConfig.tankCapacityGallons) {
            this.log.error('[PropaneTank] tankCapacityGallons is required in config — accessory not registered.');
            return;
        }
        const uuid = this.api.hap.uuid.generate(pluginConfig.shareId);
        const existing = this.cachedAccessories.find(a => a.UUID === uuid);
        if (existing) {
            this.log.info(`[PropaneTank] Restoring cached accessory: ${existing.displayName}`);
            new accessory_1.PropaneTankAccessory(this, existing, pluginConfig);
        }
        else {
            this.log.info(`[PropaneTank] Registering new accessory: ${pluginConfig.name}`);
            const accessory = new this.api.platformAccessory(pluginConfig.name, uuid);
            new accessory_1.PropaneTankAccessory(this, accessory, pluginConfig);
            this.api.registerPlatformAccessories(exports.PLUGIN_NAME, exports.PLATFORM_NAME, [accessory]);
        }
    }
}
exports.PropaneTankPlatform = PropaneTankPlatform;
