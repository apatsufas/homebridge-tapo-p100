import { Logger } from 'homebridge';
import { LightSysinfo } from '../homekit-device/types';
import P100 from './p100';
export default class L510E extends P100 {
    readonly log: Logger;
    readonly ipAddress: string;
    readonly email: string;
    readonly password: string;
    private _lightSysInfo;
    constructor(log: Logger, ipAddress: string, email: string, password: string);
    getDeviceInfo(): Promise<LightSysinfo>;
    setBrightness(brightness: number): Promise<any>;
    protected setSysInfo(sysInfo: LightSysinfo): void;
    getSysInfo(): LightSysinfo;
}
//# sourceMappingURL=l510e.d.ts.map