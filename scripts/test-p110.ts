import P110 from '../src/utils/p110.js';
import { Logging, LogLevel } from 'homebridge';

function createTestLogger(prefix = '[Test]'): Logging {
  const formatMessage = (level: string, message: string) =>
    `[${new Date().toISOString()}] ${level} ${prefix} ${message}`;

  const logger = Object.assign(
    (message: string, ...parameters: unknown[]) => {
      console.log(formatMessage('INFO', message), ...parameters);
    },
    {
      prefix,
      info: (message: string, ...parameters: unknown[]) => {
        console.log(formatMessage('INFO', message), ...parameters);
      },
      warn: (message: string, ...parameters: unknown[]) => {
        console.log(formatMessage('WARN', message), ...parameters);
      },
      error: (message: string, ...parameters: unknown[]) => {
        console.log(formatMessage('ERROR', message), ...parameters);
      },
      debug: (message: string, ...parameters: unknown[]) => {
        console.log(formatMessage('DEBUG', message), ...parameters);
      },
      success: (message: string, ...parameters: unknown[]) => {
        console.log(formatMessage('SUCCESS', message), ...parameters);
      },
      log: (level: LogLevel, message: string, ...parameters: unknown[]) => {
        console.log(formatMessage(level.toUpperCase(), message), ...parameters);
      },
    },
  );

  return logger as Logging;
}

async function testP110(ip: string, email: string, password: string) {
  const log = createTestLogger('[Tapo P110]');

  console.log('========================================');
  console.log('P110 Standalone Test');
  console.log(`Target: ${ip}`);
  console.log(`Email: ${email}`);
  console.log('========================================\n');

  const p110 = new P110(log, ip, email, password, 5);

  console.log('Initializing (KLAP handshake)...');
  try {
    await p110.handshake_new();
    console.log('✓ KLAP handshake successful');
  } catch (error) {
    console.log('✗ KLAP handshake failed:', error);
    console.log('Trying old handshake protocol...');
    try {
      await p110.handshake();
      console.log('✓ Old handshake successful');
    } catch (error2) {
      console.log('✗ Old handshake also failed:', error2);
      return;
    }
  }

  console.log('\nStep 1: Testing initial device info request...');
  try {
    const deviceInfo = await p110.getDeviceInfo(true);
    console.log('✓ Initial device info received:');
    console.log('  - Model:', deviceInfo.model);
    console.log('  - Device ID:', deviceInfo.device_id);
    console.log('  - Firmware:', deviceInfo.fw_ver);
    console.log('  - Hardware:', deviceInfo.hw_ver);
    console.log('  - Device On:', deviceInfo.device_on);
  } catch (error: unknown) {
    console.log('✗ Initial device info failed:', error);
    if (error instanceof Error) {
      console.log('  Error message:', error.message);
      console.log('  Error stack:', error.stack);
    }
  }

  console.log('\nStep 2: Testing power state control...');
  try {
    const currentInfo = await p110.getDeviceInfo(true);
    console.log('Current power state:', currentInfo.device_on);
  } catch (error: unknown) {
    console.log('✗ Power state control failed:', error);
    if (error instanceof Error) {
      console.log('  Error message:', error.message);
    }
  }

  console.log('\nStep 3: Testing energy usage (P110 specific)...');
  try {
    const energyUsage = await p110.getEnergyUsage();
    console.log('✓ Energy usage received:');
    console.log('  - Current power:', energyUsage.current_power, 'mW');
  } catch (error: unknown) {
    console.log('✗ Energy usage request failed:', error);
    if (error instanceof Error) {
      console.log('  Error message:', error.message);
    }
  }

  console.log('\nStep 4: Multiple rapid requests (stress test)...');
  console.log('Sending 5 rapid device info requests...');

  for (let i = 0; i < 5; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const info = await p110.getDeviceInfo(true);
      console.log(`  Request ${i + 1}: ✓ Success (device_on=${info.device_on})`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  Request ${i + 1}: ✗ Failed - ${errorMessage}`);
    }
  }

  console.log('\n========================================');
  console.log('Test complete. Check for 403 errors above.');
  console.log('========================================');
}

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node dist/test-p110.js <ip> <email> <password>');
  console.log('');
  console.log('Environment variables:');
  console.log('  DEBUG=1    Enable verbose debug logging');
  console.log('');
  console.log('Example:');
  console.log('  DEBUG=1 node dist/test-p110.js 192.168.1.45 user@example.com password123');
  process.exit(1);
}

const [ip, email, password] = args;

testP110(ip, email, password).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
