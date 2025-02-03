import { TrackerChangeSet } from '@dead50f7/adbkit/lib/TrackerChangeSet';
import { Device } from '../Device';
import { Service } from '../../services/Service';
import AdbKitClient from '@dead50f7/adbkit/lib/adb/client';
import { AdbExtended } from '../adb';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import Tracker from '@dead50f7/adbkit/lib/adb/tracker';
import Timeout = NodeJS.Timeout;
import { BaseControlCenter } from '../../services/BaseControlCenter';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import * as os from 'os';
import * as crypto from 'crypto';
import { DeviceState } from '../../../common/DeviceState';
import { ConfiguredDevicesManager } from './ConfiguredDevicesManager';
import { spawn } from 'child_process';

export class ControlCenter extends BaseControlCenter<GoogDeviceDescriptor> implements Service {
    private static readonly defaultWaitAfterError = 1000;
    private static instance?: ControlCenter;

    private initialized = false;
    private client: AdbKitClient = AdbExtended.createClient();
    private tracker?: Tracker;
    private waitAfterError = 1000;
    private restartTimeoutId?: Timeout;
    private deviceMap: Map<string, Device> = new Map();
    private descriptors: Map<string, GoogDeviceDescriptor> = new Map();
    private configuredDevicesManager: ConfiguredDevicesManager;
    private readonly id: string;

    protected constructor() {
        super();
        const idString = `goog|${os.hostname()}|${os.uptime()}`;
        this.id = crypto.createHash('md5').update(idString).digest('hex');
        this.configuredDevicesManager = ConfiguredDevicesManager.getInstance();
        this.configuredDevicesManager.on('configUpdate', this.onConfigUpdate);
    }

    public static getInstance(): ControlCenter {
        if (!this.instance) {
            this.instance = new ControlCenter();
        }
        return this.instance;
    }

    public static hasInstance(): boolean {
        return !!ControlCenter.instance;
    }

    private restartTracker = (): void => {
        if (this.restartTimeoutId) {
            return;
        }
        console.log(`Device tracker is down. Will try to restart in ${this.waitAfterError}ms`);
        this.restartTimeoutId = setTimeout(() => {
            this.stopTracker();
            this.waitAfterError *= 1.2;
            this.init();
        }, this.waitAfterError);
    };

    private onConfigUpdate = (): void => {
        // Update all configured devices
        const configuredDevices = this.configuredDevicesManager.getConfiguredDevices();
        configuredDevices.forEach(device => {
            const isConnected = this.deviceMap.has(device.ip);
            const descriptor = this.configuredDevicesManager.createDeviceDescriptor(device, isConnected);
            this.descriptors.set(device.ip, descriptor);
            this.emit('device', descriptor);
        });
    };

    private onChangeSet = (changes: TrackerChangeSet): void => {
        this.waitAfterError = ControlCenter.defaultWaitAfterError;
        if (changes.added.length) {
            for (const item of changes.added) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
        if (changes.removed.length) {
            for (const item of changes.removed) {
                const { id } = item;
                this.handleConnected(id, DeviceState.DISCONNECTED);
            }
        }
        if (changes.changed.length) {
            for (const item of changes.changed) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
    };

    private onDeviceUpdate = (device: Device): void => {
        const { udid, descriptor } = device;
        // Check if this is a configured device and ensure we keep the configured name
        const configuredDevices = this.configuredDevicesManager.getConfiguredDevices();
        const configuredDevice = configuredDevices.find(d => d.ip === udid);
        if (configuredDevice) {
            descriptor['ro.product.model'] = configuredDevice.name;
        }
        this.descriptors.set(udid, descriptor);
        this.emit('device', descriptor);
    };

    private handleConnected(udid: string, state: string): void {
        let device = this.deviceMap.get(udid);
        if (device) {
            device.setState(state);
        } else {
            device = new Device(udid, state);
            device.on('update', this.onDeviceUpdate);
            this.deviceMap.set(udid, device);
        }

        // Check if this is a configured device and update its status
        const configuredDevices = this.configuredDevicesManager.getConfiguredDevices();
        const configuredDevice = configuredDevices.find(d => d.ip === udid);
        if (configuredDevice) {
            const descriptor = this.configuredDevicesManager.createDeviceDescriptor(configuredDevice, state === DeviceState.DEVICE);
            this.descriptors.set(udid, descriptor);
            this.emit('device', descriptor);
        }
    }

    public async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.tracker = await this.startTracker();
        const list = await this.client.listDevices();
        list.forEach((device) => {
            const { id, type } = device;
            this.handleConnected(id, type);
        });

        // Initialize configured devices
        const configuredDevices = this.configuredDevicesManager.getConfiguredDevices();
        configuredDevices.forEach(device => {
            const isConnected = this.deviceMap.has(device.ip);
            const descriptor = this.configuredDevicesManager.createDeviceDescriptor(device, isConnected);
            this.descriptors.set(device.ip, descriptor);
            this.emit('device', descriptor);
        });

        this.initialized = true;
    }

    private async startTracker(): Promise<Tracker> {
        if (this.tracker) {
            return this.tracker;
        }
        const tracker = await this.client.trackDevices();
        tracker.on('changeSet', this.onChangeSet);
        tracker.on('end', this.restartTracker);
        tracker.on('error', this.restartTracker);
        return tracker;
    }

    private stopTracker(): void {
        if (this.tracker) {
            this.tracker.off('changeSet', this.onChangeSet);
            this.tracker.off('end', this.restartTracker);
            this.tracker.off('error', this.restartTracker);
            this.tracker.end();
            this.tracker = undefined;
        }
        this.tracker = undefined;
        this.initialized = false;
    }

    public getDevices(): GoogDeviceDescriptor[] {
        return Array.from(this.descriptors.values());
    }

    public getDevice(udid: string): Device | undefined {
        return this.deviceMap.get(udid);
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return `Android Debug Bridge Interface [${os.hostname()}]`;
    }

    public start(): Promise<void> {
        return this.init().catch((e) => {
            console.error(`Error: Failed to init "${this.getName()}". ${e.message}`);
        });
    }

    public release(): void {
        this.stopTracker();
        this.configuredDevicesManager.off('configUpdate', this.onConfigUpdate);
    }

    public async runCommand(command: ControlCenterCommand): Promise<void> {
        const udid = command.getUdid();
        
        console.log(`Running command for device ${udid}:`, command.getType());

        if (command.getType() === ControlCenterCommand.RECONNECT_DEVICE) {
            console.log(`Attempting to reconnect device ${udid}`);
            return new Promise<void>((resolve, reject) => {
                const adb = spawn('adb', ['connect', udid], { stdio: ['ignore', 'pipe', 'pipe'] });
                
                adb.stdout.on('data', (data) => {
                    console.log(`[${udid}] stdout: ${data.toString().trim()}`);
                });

                adb.stderr.on('data', (data) => {
                    console.error(`[${udid}] stderr: ${data.toString().trim()}`);
                });

                adb.on('error', (error: Error) => {
                    console.error(`[${udid}] Failed to spawn adb process.\n${error.stack}`);
                    reject(error);
                });

                adb.on('close', (code) => {
                    console.log(`[${udid}] adb connect process exited with code ${code}`);
                    resolve();
                });
            });
        }

        const device = this.getDevice(udid);
        if (!device) {
            console.error(`Device with udid:"${udid}" not found`);
            return;
        }
        
        const type = command.getType();
        switch (type) {
            case ControlCenterCommand.KILL_SERVER:
                await device.killServer(command.getPid());
                return;
            case ControlCenterCommand.START_SERVER:
                await device.startServer();
                return;
            case ControlCenterCommand.UPDATE_INTERFACES:
                await device.updateInterfaces();
                return;
            case ControlCenterCommand.RUN_COMMAND:
                const cmd = command.getCommand();
                console.log(`Running command for device ${udid}:`, cmd);
                try {
                    await device.runShellCommandAdbKit(cmd);
                } catch (error) {
                    console.error(`Failed to run command for device ${udid}:`, error);
                }
                return;
            default:
                throw new Error(`Unsupported command: "${type}"`);
        }
    }
}
