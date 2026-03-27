import { registerPlugin } from '@capacitor/core';

export interface ScrollControlPlugin {
    disableBounce(): Promise<{ success: boolean }>;
    enableBounce(): Promise<{ success: boolean }>;
}

const ScrollControl = registerPlugin<ScrollControlPlugin>('ScrollControl');

export default ScrollControl;
