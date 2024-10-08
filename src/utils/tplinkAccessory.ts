import { ConsumptionInfo, PlugSysinfo } from '../homekit-device/types';
import { EnergyUsage } from './energyUsage';
import { PowerUsage } from './powerUsage';

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

    calculateColorTemp?(tapo_color_temp:number);

    setColor?(hue:number, saturation:number):Promise<boolean>;
}