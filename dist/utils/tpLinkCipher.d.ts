import { Logger } from 'homebridge';
export default class TpLinkCipher {
    readonly log: Logger;
    iv: any;
    key: any;
    private crypto;
    constructor(log: Logger, b_arr: any, b_arr2: any);
    static mime_encoder(to_encode: string): string;
    encrypt(data: string): any;
    decrypt(data: string): any;
}
//# sourceMappingURL=tpLinkCipher.d.ts.map