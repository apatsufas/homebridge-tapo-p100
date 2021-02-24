"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfig = exports.defaultConfig = void 0;
const lodash_defaults_1 = __importDefault(require("lodash.defaults"));
exports.defaultConfig = {
    name: 'Tapo Smart Platform',
    username: '',
    password: '',
    pollingInterval: 10,
    devices: undefined,
    timeout: 15,
    waitTimeUpdate: 100,
};
function parseConfig(config) {
    const c = lodash_defaults_1.default(config, exports.defaultConfig);
    const defaultSendOptions = {
        timeout: c.timeout * 1000,
    };
    return {
        name: c.name,
        username: c.username,
        password: c.password,
        waitTimeUpdate: c.waitTimeUpdate,
        defaultSendOptions,
        discoveryOptions: {
            discoveryInterval: c.pollingInterval * 1000,
            deviceOptions: {
                defaultSendOptions,
            },
            devices: c.devices,
        },
    };
}
exports.parseConfig = parseConfig;
//# sourceMappingURL=config.js.map