import { Characteristic, Units, Formats, WithUUID, Perms } from 'homebridge';

export default function resetConsumption(
  DefaultCharacteristic: typeof Characteristic,
): WithUUID<new () => Characteristic> {
  return class ResetConsumptionCharacteristic extends DefaultCharacteristic {
    static readonly UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: unable to override class constructor parameters as its a type and not a value
      super('Reset Total', ResetConsumptionCharacteristic.UUID, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: custom unit
        format: Formats.UINT32,
        unit: Units.SECONDS,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY, Perms.PAIRED_WRITE],
      });
    }
  };
}