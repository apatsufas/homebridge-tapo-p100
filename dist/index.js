"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const platform_1 = __importDefault(require("./platform"));
const settings_1 = require("./settings");
module.exports = (api) => {
    api.registerPlatform(settings_1.PLATFORM_NAME, platform_1.default);
};
//# sourceMappingURL=index.js.map