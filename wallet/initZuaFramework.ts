import { Wallet } from './wallet';

export const initZuaFramework = async () => {
  // console.log("Zua - framework: init");
  await Wallet.initRuntime();
  // console.log("Zua - framework: ready");
};

