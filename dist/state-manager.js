"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
class StateManager {
    constructor() {
        this.state = null;
    }
    hasChanged(response) {
        if (this.state === null)
            return true;
        return this.state.lastRead !== response.lastRead;
    }
    update(response, config) {
        const gallons = (response.lastLevel / 100) * config.tankCapacityGallons;
        this.state = {
            percentage: response.lastLevel,
            gallons,
            lastRead: response.lastRead,
        };
        return this.state;
    }
    getCurrent() {
        return this.state;
    }
}
exports.StateManager = StateManager;
