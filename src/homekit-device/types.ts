export type CommonSysinfo = {
    nickname: string;
    device_id: string;
    model: string;
    fw_ver: string;
    hw_ver: string;
  };

export type PlugSysinfo = CommonSysinfo &{ 
    type: 'SMART.TAPOPLUG';
    mac: string;
    hw_id: string;
    fw_id: string;
    device_on: boolean;
    last_update:number;
  };

export type LightSysinfo = PlugSysinfo &{ 
    brightness: number;
  };

export type ColorLightSysinfo = LightSysinfo &{ 
    color_temp: number;
    hue: number;
    saturation: number;
  };

export type ConsumptionInfo = {
    total?: number;
    current: number;
};