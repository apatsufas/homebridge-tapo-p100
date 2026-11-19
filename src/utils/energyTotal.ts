import { Logger } from 'homebridge';

/** The parts of a fakegato-history service this helper uses (the package ships no types). */
export interface FakeGatoHistory {
  isHistoryLoaded(): boolean;
  getExtraPersistedData(): unknown;
  setExtraPersistedData(extra: unknown): void;
}

type PersistedTotal = {
  /** Lifetime energy in Wh, as shown by Eve's "Total Consumption". */
  totalWh: number;
  /** Device-reported energy-so-far-today (Wh) at the previous sample. */
  lastTodayWh?: number;
  /** When the previous sample was taken (ms since epoch). */
  lastSampleAt?: number;
};

/** A gap this long across a date change means the device's daily counter has reset. */
const RESET_GAP_MS = 60 * 60 * 1000;

/**
 * Turns the "energy used today" counter that Tapo devices report into the ever-increasing
 * total that Eve's Total Consumption characteristic expects. The total is stored alongside
 * the Eve history (fakegato extra persisted data), so it survives Homebridge restarts.
 */
export class EnergyTotal {
  private state?: PersistedTotal;

  constructor(
    private readonly history: FakeGatoHistory,
    private readonly log: Logger,
  ) {}

  /** Lifetime total in kWh, or undefined until the stored history has been loaded. */
  get totalKWh(): number | undefined {
    return this.load() ? this.state!.totalWh / 1000 : undefined;
  }

  /**
   * Feeds the device's current energy-used-today value (Wh).
   * Returns the new lifetime total in kWh, or undefined if the stored history isn't loaded yet.
   */
  update(todayWh: number, now = Date.now()): number | undefined {
    if (!this.load() || !Number.isFinite(todayWh) || todayWh < 0) {
      return this.totalKWh;
    }
    const state = this.state!;

    if (state.lastTodayWh !== undefined && state.lastSampleAt !== undefined) {
      const dayChanged = new Date(state.lastSampleAt).toDateString() !== new Date(now).toDateString();
      const counterReset = todayWh < state.lastTodayWh || (dayChanged && now - state.lastSampleAt > RESET_GAP_MS);
      // After a reset everything reported today is new; otherwise only the increase is.
      state.totalWh += counterReset ? todayWh : todayWh - state.lastTodayWh;
    }
    // The very first sample only sets the baseline: energy from before we started
    // watching this device is not counted.

    state.lastTodayWh = todayWh;
    state.lastSampleAt = now;
    this.history.setExtraPersistedData({ ...this.history.getExtraPersistedData() as object, energyTotal: state });
    return state.totalWh / 1000;
  }

  private load(): boolean {
    if (this.state) {
      return true;
    }
    // fakegato reads its file asynchronously and replaces the extra data when it does,
    // so neither read nor write it before that has happened.
    if (!this.history.isHistoryLoaded()) {
      return false;
    }
    const extra = this.history.getExtraPersistedData() as { energyTotal?: PersistedTotal } | undefined;
    const stored = extra && extra.energyTotal;
    this.state = stored && typeof stored.totalWh === 'number' ? stored : { totalWh: 0 };
    this.log.debug('Energy total loaded: ' + (this.state.totalWh / 1000).toFixed(3) + ' kWh');
    return true;
  }
}
