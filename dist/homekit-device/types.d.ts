export declare type CommonSysinfo = {
    nickname: string;
    device_id: string;
    model: string;
    fw_ver: string;
    hw_ver: string;
};
export declare type PlugSysinfo = CommonSysinfo & {
    type: 'SMART.TAPOPLUG';
    mac: string;
    hw_id: string;
    fw_id: string;
    device_on: boolean;
};
export declare type LightSysinfo = PlugSysinfo & {
    brightness: number;
};
//# sourceMappingURL=types.d.ts.map