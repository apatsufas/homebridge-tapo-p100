import { Logger } from 'homebridge';
import { PlugSysinfo } from '../homekit-device/types';
import TpLinkCipher from './tpLinkCipher';
export default class P100 {
    readonly log: Logger;
    readonly ipAddress: string;
    readonly email: string;
    readonly password: string;
    private crypto;
    protected axios: any;
    private encodedPassword;
    private encodedEmail;
    private privateKey;
    private publicKey;
    protected ip: string;
    protected cookie: string;
    protected token: string;
    private _plugSysInfo;
    protected tpLinkCipher: TpLinkCipher;
    protected ERROR_CODES: {
        '0': string;
        '-1010': string;
        '-1501': string;
        '1002': string;
        '-1003': string;
    };
    constructor(log: Logger, ipAddress: string, email: string, password: string);
    private encryptCredentials;
    private sha_digest_username;
    private createKeyPair;
    handshake(): Promise<void>;
    login(): Promise<void>;
    private decode_handshake_key;
    turnOff(): Promise<true>;
    turnOn(): Promise<true>;
    setPowerState(state: boolean): Promise<true>;
    getDeviceInfo(): Promise<PlugSysinfo>;
    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get id(): string;
    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get name(): string;
    get model(): string;
    get serialNumber(): string;
    get firmwareRevision(): string;
    get hardwareRevision(): string;
    protected setSysInfo(sysInfo: PlugSysinfo): void;
    getSysInfo(): PlugSysinfo;
}
//# sourceMappingURL=p100.d.ts.map