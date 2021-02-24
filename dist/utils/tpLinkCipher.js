"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TpLinkCipher {
    constructor(log, b_arr, b_arr2) {
        this.log = log;
        this.crypto = require('crypto');
        this.iv = b_arr2;
        this.key = b_arr;
    }
    static mime_encoder(to_encode) {
        const base64data = Buffer.from(to_encode).toString('base64');
        return base64data;
    }
    encrypt(data) {
        const cipher = this.crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
    decrypt(data) {
        const decipher = this.crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
        let decrypted = decipher.update(data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.default = TpLinkCipher;
//# sourceMappingURL=tpLinkCipher.js.map