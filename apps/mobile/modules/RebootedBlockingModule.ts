import { NativeModules, Platform } from 'react-native';

interface BlockingStatus {
  enabled: boolean;
  sleepTime: string;
  blockedPackages: string[];
  hasIncompleteTasks: boolean;
}

interface RebootedBlockingModuleInterface {
  updateBlockingStatus(status: BlockingStatus): Promise<void>;
  getBlockingStatus(): Promise<BlockingStatus>;
}

// Native module bridge
const { RebootedBlockingModule: NativeRebootedBlockingModule } = NativeModules;

export const RebootedBlockingModule: RebootedBlockingModuleInterface | null = 
  Platform.OS === 'android' && NativeRebootedBlockingModule
    ? NativeRebootedBlockingModule
    : null;
