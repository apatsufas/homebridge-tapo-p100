import { Characteristic, WithUUID } from 'homebridge';

export default function totalConsumption(
  DefaultCharacteristic: typeof Characteristic,
): WithUUID<new () => Characteristic> {
  return class TotalConsumptionCharacteristic extends DefaultCharacteristic {
    static readonly UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: unable to override class constructor parameters as its a type and not a value
      super('Total Consumption', TotalConsumptionCharacteristic.UUID, {
        maxValue: 4294967295,
        minValue: 0,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: custom unit
        unit: 'kWh',
        minStep: 0.001,
      });
    }
  };
}