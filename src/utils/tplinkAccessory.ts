import { ConsumptionInfo, PlugSysinfo } from '../homekit-device/types.js';
import { EnergyUsage } from './energyUsage.js';
import { PowerUsage } from './powerUsage.js';

export interface TpLinkAccessory{
    is_klap:boolean;

    handshake(): Promise<void>;

    login(): Promise<void>;

    handshake_new(): Promise<void>;

    turnOff(): Promise<boolean>;

    turnOn(): Promise<boolean>;

    setPowerState(state: boolean): Promise<boolean>;

    getDeviceInfo(force?:boolean): Promise<PlugSysinfo> ;

    getSysInfo(): PlugSysinfo;

    getEnergyUsage?():Promise<EnergyUsage | PowerUsage>;

    getPowerConsumption?():ConsumptionInfo;

    setBrightness?(brightness:number):Promise<boolean>;

    setColorTemp?(color_temp:number):Promise<boolean>;

    getColorTemp?(): Promise<number>;

    calculateColorTemp?(tapo_color_temp:number):number;

    setColor?(hue:number, saturation:number):Promise<boolean>;
}