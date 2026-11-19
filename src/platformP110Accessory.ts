import { PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import P110 from './utils/p110.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';
import { EnergyTotal } from './utils/energyTotal.js';

/**
 * P110 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class P110Accessory extends TPLinkPlatformAccessory<P110>{
  private readonly fakeGatoHistoryService;
  private readonly energyTotal: EnergyTotal;

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {
    super(log, platform, accessory, timeout, updateInterval);

    this.tpLinkAccessory = new P110(this.log, accessory.context.device.host, platform.config.username, platform.config.password,
      this.timeout);

    this.fakeGatoHistoryService = new this.platform.FakeGatoHistoryService('energy', accessory, {
      log: this.log,
      size:4096,
      storage:'fs',
    });
    this.energyTotal = new EnergyTotal(this.fakeGatoHistoryService, this.log);

    this.initialise(platform, updateInterval);

    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  protected init(platform: TapoPlatform, updateInterval?: number){
    this.tpLinkAccessory.getDeviceInfo(true).then((sysInfo) => {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo P110')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));

      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic)
        .onGet(this.getCurrentConsumption.bind(this));

      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic)
        .onGet(this.getTotalConsumption.bind(this));

      this.updateConsumption();

      const interval = updateInterval ? updateInterval*1000 : 10000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.log.error('Get Device Info failed');
      this.retryInitialise();
    });
  }

  private updateConsumption(){
    this.log.debug('updateConsumption called');
    this.tpLinkAccessory.getEnergyUsage().then((response) => {
      this.log.debug('Get Characteristic Power consumption ->', JSON.stringify(response));
      if (!response || typeof response.current_power !== 'number') {
        return;
      }
      const watts = response.current_power / 1000;
      this.service.updateCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic, watts);
      // fakegato averages everything added here into one Eve history point per 10 minutes
      this.fakeGatoHistoryService.addEntry({
        time: Math.round(Date.now() / 1000),
        power: watts,
      });

      const totalKWh = this.energyTotal.update(response.today_energy);
      if (totalKWh !== undefined) {
        this.service.updateCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic, totalKWh);
      }
    }).catch((error) => {
      this.log.debug('Failed to get energy usage: ' + error);
    });
  }

  async getCurrentConsumption():Promise<CharacteristicValue> {
    const consumption = this.tpLinkAccessory.getPowerConsumption();
    return consumption ? consumption.current : 0;
  }

  async getTotalConsumption():Promise<CharacteristicValue> {
    return this.energyTotal.totalKWh ?? 0;
  }

  protected updateState(interval:number){
    // Refresh consumption alongside every state poll; updateConsumption does not reschedule itself.
    this.updateConsumption();
    super.updateState(interval);
  }
}
