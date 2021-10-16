import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger } from 'homebridge';
import TapoPlatform from './platform';
import P110 from './utils/p110';

/**
 * P110 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class P110Accessory {
  private service: Service;
  private readonly fakeGatoHistoryService?;
  private p110: P110;

  constructor(
    public readonly log: Logger,
    private readonly platform: TapoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
    this.p110 = new P110(this.log, accessory.context.device.host, platform.config.username, platform.config.password);

    this.fakeGatoHistoryService = new this.platform.FakeGatoHistoryService('energy', accessory, {
      log: this.log,
      size:4096, 
      storage:'fs',
    });

    this.p110.handshake().then(() => {
      this.p110.login().then(() => {
        this.p110.getDeviceInfo().then((sysInfo) => {
          // set accessory information
          this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
            .setCharacteristic(this.platform.Characteristic.Model, 'Tapo P110')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

          // each service must implement at-minimum the "required characteristics" for the given service type
          // see https://developers.homebridge.io/#/service/Outlet

          // register handlers for the On/Off Characteristic
          this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
            .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

          this.service.getCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic)
            .on('get', this.getCurrentConsumption.bind(this));

          this.service.getCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic)
            .on('get', this.getTotalConsumption.bind(this));

          this.updateConsumption();
        }).catch(() => {
          this.log.error('Get Device Info failed');
        });
      }).catch(() => {
        this.log.error('Login failed');
      });
    }).catch(() => {
      this.log.error('Handshake failed');
    });
    
    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.p110.setPowerState(value as boolean).then(() => {
      this.platform.log.debug('Set Characteristic On ->', value);
      this.p110.getSysInfo().device_on = value as boolean;
      // you must call the callback function
      callback(null);
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getOn(callback: CharacteristicGetCallback) {
    // implement your own code to check if the device is on
    this.p110.getDeviceInfo().then((response) => {
      const isOn = response.device_on;

      this.platform.log.debug('Get Characteristic On ->', isOn);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      // you must call the callback function
      callback(null, isOn);
    });
  }

  private updateConsumption(){
    this.p110.getEnergyUsage().then((response) => {
      this.platform.log.debug('Get Characteristic Power consumption ->', response.current_power);
      if (this.fakeGatoHistoryService && response && response.current_power) {
        this.fakeGatoHistoryService.addEntry({
          time: new Date().getTime() / 1000,
          power: response.current_power,
        });
      }
    });

    setTimeout(()=>{
      this.updateConsumption();
    }, 300000);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getCurrentConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.p110.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null, consumption.current);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getTotalConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.p110.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null, consumption.total);
  }
}
