import * as fs from 'fs';
import * as path from 'path';
import { TypedEmitter } from '../../../common/TypedEmitter';
import { DeviceState } from '../../../common/DeviceState';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';

interface ConfiguredDevice {
    id: string;
    ip: string;
    name: string;
}

interface DevicesConfig {
    devices: ConfiguredDevice[];
}

interface ConfiguredDevicesEvents {
    configUpdate: undefined;
}

export class ConfiguredDevicesManager extends TypedEmitter<ConfiguredDevicesEvents> {
    private static instance?: ConfiguredDevicesManager;
    private configPath: string;
    private devices: Map<string, ConfiguredDevice> = new Map();
    private configWatcher?: fs.FSWatcher;

    private constructor() {
        super();
        this.configPath = path.join(process.cwd(), 'devices_config.json');
        this.ensureConfigExists();
        this.loadConfig();
        this.watchConfig();
    }

    public static getInstance(): ConfiguredDevicesManager {
        if (!this.instance) {
            this.instance = new ConfiguredDevicesManager();
        }
        return this.instance;
    }

    private ensureConfigExists(): void {
        if (!fs.existsSync(this.configPath)) {
            // Create default config if it doesn't exist
            const defaultConfig: DevicesConfig = {
                devices: []
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 4));
            console.log('Created default devices_config.json');
        }
    }

    private loadConfig(): void {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log('Config file not found, using empty device list');
                this.devices.clear();
                return;
            }

            const configContent = fs.readFileSync(this.configPath, 'utf-8');
            const config: DevicesConfig = JSON.parse(configContent);
            this.devices.clear();
            config.devices.forEach(device => {
                this.devices.set(device.id, device);
            });
            this.emit('configUpdate', undefined);
        } catch (error) {
            console.error('Failed to load devices config:', error);
            // On error, clear devices to ensure we're in a known state
            this.devices.clear();
        }
    }

    private watchConfig(): void {
        if (this.configWatcher) {
            this.configWatcher.close();
        }

        if (!fs.existsSync(this.configPath)) {
            return;
        }

        try {
            this.configWatcher = fs.watch(this.configPath, (eventType, _filename) => {
                if (eventType === 'change') {
                    this.loadConfig();
                }
            });
        } catch (error) {
            console.error('Failed to watch config file:', error);
        }
    }

    public getConfiguredDevices(): ConfiguredDevice[] {
        return Array.from(this.devices.values());
    }

    public getDeviceById(id: string): ConfiguredDevice | undefined {
        return this.devices.get(id);
    }

    public createDeviceDescriptor(device: ConfiguredDevice, isConnected: boolean): GoogDeviceDescriptor {
        return {
            udid: device.ip,
            state: isConnected ? DeviceState.DEVICE : DeviceState.DISCONNECTED,
            'ro.product.manufacturer': '',
            'ro.product.model': device.name,
            'ro.build.version.release': 'N/A',
            'ro.build.version.sdk': 'N/A',
            'ro.product.cpu.abi': 'N/A',
            'wifi.interface': '',
            interfaces: [],
            pid: -1,
            'last.update.timestamp': Date.now()
        };
    }

    public release(): void {
        if (this.configWatcher) {
            this.configWatcher.close();
            this.configWatcher = undefined;
        }
    }
} 