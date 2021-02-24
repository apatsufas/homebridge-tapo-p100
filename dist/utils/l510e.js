"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const p100_1 = __importDefault(require("./p100"));
class L510E extends p100_1.default {
    constructor(log, ipAddress, email, password) {
        super(log, ipAddress, email, password);
        this.log = log;
        this.ipAddress = ipAddress;
        this.email = email;
        this.password = password;
        this.log.debug('Constructing L510E on host: ' + ipAddress);
    }
    async getDeviceInfo() {
        return super.getDeviceInfo().then(() => {
            return this.getSysInfo();
        });
    }
    async setBrightness(brightness) {
        const URL = 'http://' + this.ip + '/app?token=' + this.token;
        const payload = '{' +
            '"method": "set_device_info",' +
            '"params": {' +
            '"brightness": ' + brightness +
            '},' +
            '"requestTimeMils": ' + Math.round(Date.now() * 1000) + '' +
            '};';
        const headers = {
            'Cookie': this.cookie,
        };
        const encryptedPayload = this.tpLinkCipher.encrypt(payload);
        const securePassthroughPayload = {
            'method': 'securePassthrough',
            'params': {
                'request': encryptedPayload,
            },
        };
        const config = {
            headers: headers,
        };
        return this.axios.post(URL, securePassthroughPayload, config)
            .then((res) => {
            if (res.data.error_code) {
                const errorCode = res.data.error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('344 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
            try {
                const response = JSON.parse(decryptedResponse);
                if (response.error_code !== 0) {
                    const errorCode = response.error_code;
                    const errorMessage = this.ERROR_CODES[errorCode];
                    this.log.error('354 Error Code: ' + errorCode + ', ' + errorMessage);
                    return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
                }
                return true;
            }
            catch (error) {
                const errorCode = JSON.parse(decryptedResponse).error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('361 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    setSysInfo(sysInfo) {
        this._lightSysInfo = sysInfo;
    }
    getSysInfo() {
        this.log.info('Sys Info Lightbulb');
        return this._lightSysInfo;
    }
}
exports.default = L510E;
//# sourceMappingURL=l510e.js.map