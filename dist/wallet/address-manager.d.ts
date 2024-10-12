import * as zuacore from '@zua/core-lib';
import { Network } from 'custom-types';
import { EventTargetImpl } from './event-target-impl';
export declare class AddressManager extends EventTargetImpl {
    constructor(HDWallet: zuacore.HDPrivateKey, network: Network);
    private HDWallet;
    network: Network;
    get all(): Record<string, zuacore.PrivateKey>;
    get shouldFetch(): string[];
    /**
     * Derives a new receive address. Sets related instance properties.
     */
    receiveAddress: {
        counter: number;
        current: {
            address: string;
            privateKey: zuacore.PrivateKey;
        };
        keypairs: Record<string, zuacore.PrivateKey>;
        atIndex: Record<string, string>;
        next: () => string;
        advance: (n: number) => void;
    };
    /**
     * Derives a new change address. Sets related instance properties.
     */
    changeAddress: {
        counter: number;
        current: {
            address: string;
            privateKey: zuacore.PrivateKey;
        };
        keypairs: Record<string, zuacore.PrivateKey>;
        atIndex: Record<string, string>;
        next: () => string;
        advance: (n: number) => void;
        reverse: () => void;
    };
    private deriveAddress;
    /**
     * Derives n addresses and adds their keypairs to their deriveType-respective address object
     * @param n How many addresses to derive
     * @param deriveType receive or change address
     * @param offset Index to start at in derive path
     */
    getAddresses(n: number, deriveType: 'receive' | 'change', offset?: number): {
        index: number;
        address: string;
        privateKey: zuacore.PrivateKey;
    }[];
    isOur(address: string): boolean;
    isOurChange(address: string): boolean;
}
//# sourceMappingURL=address-manager.d.ts.map