import { Characteristic, WithUUID } from 'homebridge';

export default function currentConsumption(
  DefaultCharacteristic: typeof Characteristic,
): WithUUID<new () => Characteristic> {
  return class CurrentConsumptionCharacteristic extends DefaultCharacteristic {
    static readonly UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: unable to override class constructor parameters as its a type and not a value
      super('Current Consumption', CurrentConsumptionCharacteristic.UUID, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: custom unit
        unit: 'Watt',
        maxValue: 65535,
        minValue: 0,
        minStep: 1,
      });
    }
  };
}