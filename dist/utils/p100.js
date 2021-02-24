"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tpLinkCipher_1 = __importDefault(require("./tpLinkCipher"));
class P100 {
    constructor(log, ipAddress, email, password) {
        this.log = log;
        this.ipAddress = ipAddress;
        this.email = email;
        this.password = password;
        this.crypto = require('crypto');
        this.axios = require('axios');
        this.ERROR_CODES = {
            '0': 'Success',
            '-1010': 'Invalid Public Key Length',
            '-1501': 'Invalid Request or Credentials',
            '1002': 'Incorrect Request',
            '-1003': 'JSON formatting error ',
        };
        this.log.debug('Constructing P100 on host: ' + ipAddress);
        this.ip = ipAddress;
        this.encryptCredentials(email, password);
        this.createKeyPair();
    }
    encryptCredentials(email, password) {
        //Password Encoding
        this.encodedPassword = tpLinkCipher_1.default.mime_encoder(password);
        //Email Encoding
        this.encodedEmail = this.sha_digest_username(email);
        this.encodedEmail = tpLinkCipher_1.default.mime_encoder(this.encodedEmail);
    }
    sha_digest_username(data) {
        const digest = this.crypto.createHash('sha1').update(data).digest('hex');
        return digest;
    }
    createKeyPair() {
        // Including publicKey and  privateKey from  
        // generateKeyPairSync() method with its  
        // parameters 
        const { publicKey, privateKey } = this.crypto.generateKeyPairSync('rsa', {
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem',
            },
            modulusLength: 1024,
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey.toString('utf8');
    }
    async handshake() {
        const URL = 'http://' + this.ip + '/app';
        const payload = {
            'method': 'handshake',
            'params': {
                'key': this.publicKey,
                'requestTimeMils': Math.round(Date.now() * 1000),
            },
        };
        this.log.debug('Handshake P100 on host: ' + this.ip);
        await this.axios.post(URL, payload)
            .then((res) => {
            this.log.debug('Received Handshake P100 on host response: ' + this.ip);
            if (res.data.error_code) {
                const errorCode = res.data.error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('99 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            try {
                const encryptedKey = res.data.result.key.toString('utf8');
                this.decode_handshake_key(encryptedKey);
                this.cookie = res.headers['set-cookie'][0].split(';')[0];
                return;
            }
            catch (error) {
                const errorCode = res.data.error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('106 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    async login() {
        const URL = 'http://' + this.ip + '/app';
        const payload = '{' +
            '"method": "login_device",' +
            '"params": {' +
            '"username": "' + this.encodedEmail + '",' +
            '"password": "' + this.encodedPassword + '"' +
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
        await this.axios.post(URL, securePassthroughPayload, config)
            .then((res) => {
            if (res.data.error_code) {
                const errorCode = res.data.error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('149 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
            try {
                const response = JSON.parse(decryptedResponse);
                if (response.error_code !== 0) {
                    const errorCode = response.error_code;
                    const errorMessage = this.ERROR_CODES[errorCode];
                    this.log.error('158 Error Code: ' + errorCode + ', ' + errorMessage);
                    return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
                }
                this.token = response.result.token;
                return;
            }
            catch (error) {
                const errorCode = JSON.parse(decryptedResponse).error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('166 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    decode_handshake_key(key) {
        const buff = Buffer.from(key, 'base64');
        const decoded = this.crypto.privateDecrypt({
            key: this.privateKey,
            padding: this.crypto.constants.RSA_PKCS1_PADDING,
        }, buff);
        const b_arr = decoded.slice(0, 16);
        const b_arr2 = decoded.slice(16, 32);
        this.tpLinkCipher = new tpLinkCipher_1.default(this.log, b_arr, b_arr2);
    }
    async turnOff() {
        const URL = 'http://' + this.ip + '/app?token=' + this.token;
        const payload = '{' +
            '"method": "set_device_info",' +
            '"params": {' +
            '"device_on": false' +
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
            //console.log(res);
            if (res.data.error_code) {
                const errorCode = res.data.error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('225 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
            try {
                const response = JSON.parse(decryptedResponse);
                if (response.error_code !== 0) {
                    const errorCode = response.error_code;
                    const errorMessage = this.ERROR_CODES[errorCode];
                    this.log.error('235 Error Code: ' + errorCode + ', ' + errorMessage);
                    return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
                }
                return true;
            }
            catch (error) {
                const errorCode = JSON.parse(decryptedResponse).error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('242 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    async turnOn() {
        const URL = 'http://' + this.ip + '/app?token=' + this.token;
        const payload = '{' +
            '"method": "set_device_info",' +
            '"params": {' +
            '"device_on": true' +
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
                this.log.error('284 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
            try {
                const response = JSON.parse(decryptedResponse);
                if (response.error_code !== 0) {
                    const errorCode = response.error_code;
                    const errorMessage = this.ERROR_CODES[errorCode];
                    this.log.error('294 Error Code: ' + errorCode + ', ' + errorMessage);
                    return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
                }
                return true;
            }
            catch (error) {
                const errorCode = JSON.parse(decryptedResponse).error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('301 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    async setPowerState(state) {
        if (state) {
            return this.turnOn();
        }
        else {
            return this.turnOff();
        }
    }
    async getDeviceInfo() {
        const URL = 'http://' + this.ip + '/app?token=' + this.token;
        const payload = '{' +
            '"method": "get_device_info",' +
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
                this.log.error('348 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
            try {
                const response = JSON.parse(decryptedResponse);
                if (response.error_code !== 0) {
                    const errorCode = response.error_code;
                    const errorMessage = this.ERROR_CODES[errorCode];
                    this.log.error('358 Error Code: ' + errorCode + ', ' + errorMessage);
                    return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
                }
                this.setSysInfo(response.result);
                return this.getSysInfo();
            }
            catch (error) {
                const errorCode = JSON.parse(decryptedResponse).error_code;
                const errorMessage = this.ERROR_CODES[errorCode];
                this.log.error('366 Error Code: ' + errorCode + ', ' + errorMessage);
                return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
        })
            .catch((error) => {
            this.log.error('Error: ' + error.message);
            return new Error(error);
        });
    }
    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get id() {
        if (this.getSysInfo()) {
            return this.getSysInfo().device_id;
        }
        return '';
    }
    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get name() {
        if (this.getSysInfo()) {
            return Buffer.from(this.getSysInfo().nickname, 'base64').toString('utf8');
        }
        return '';
    }
    get model() {
        if (this.getSysInfo()) {
            return this.getSysInfo().model;
        }
        return '';
    }
    get serialNumber() {
        if (this.getSysInfo()) {
            this.getSysInfo().hw_id;
        }
        return '';
    }
    get firmwareRevision() {
        if (this.getSysInfo()) {
            return this.getSysInfo().fw_ver;
        }
        return '';
    }
    get hardwareRevision() {
        if (this.getSysInfo()) {
            return this.getSysInfo().hw_ver;
        }
        return '';
    }
    setSysInfo(sysInfo) {
        this._plugSysInfo = sysInfo;
    }
    getSysInfo() {
        return this._plugSysInfo;
    }
}
exports.default = P100;
//# sourceMappingURL=p100.js.map