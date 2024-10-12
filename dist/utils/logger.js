"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateLogger = exports.FlowLogger = exports.log = void 0;
const flow_logger_1 = require("@aspectron/flow-logger");
Object.defineProperty(exports, "FlowLogger", { enumerable: true, get: function () { return flow_logger_1.FlowLogger; } });
let custom = ['utxo:cyan', 'utxodebug:cyan', 'tx:green', 'txdebug:green'];
const logger = new flow_logger_1.FlowLogger('Zua Wallet', {
    display: ['name', 'level', 'time'],
    custom,
    color: ['level']
});
logger.enable('all');
exports.log = logger;
const CreateLogger = (name = "ZuaWallet") => {
    let logger = new flow_logger_1.FlowLogger(name, {
        display: ['name', 'level', 'time'],
        custom,
        color: ['level']
    });
    return logger;
};
exports.CreateLogger = CreateLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdEQUFrRDtBQWExQywyRkFiQSx3QkFBVSxPQWFBO0FBWGxCLElBQUksTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQTtBQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUFVLENBQUMsY0FBYyxFQUFFO0lBQzdDLE9BQU8sRUFBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO0lBQ25DLE1BQU07SUFDTixLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUM7Q0FDaEIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUdSLFFBQUEsR0FBRyxHQUFHLE1BQU0sQ0FBQztBQUVuQixNQUFNLFlBQVksR0FBRyxDQUFDLE9BQVksYUFBYSxFQUFVLEVBQUU7SUFDakUsSUFBSSxNQUFNLEdBQUcsSUFBSSx3QkFBVSxDQUFDLElBQUksRUFBRTtRQUNqQyxPQUFPLEVBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztRQUNuQyxNQUFNO1FBQ04sS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDO0tBQ2hCLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFBO0FBUFksUUFBQSxZQUFZLGdCQU94QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Rmxvd0xvZ2dlcn0gZnJvbSAnQGFzcGVjdHJvbi9mbG93LWxvZ2dlcic7XHJcblxyXG5sZXQgY3VzdG9tID0gWyd1dHhvOmN5YW4nLCAndXR4b2RlYnVnOmN5YW4nLCAndHg6Z3JlZW4nLCAndHhkZWJ1ZzpncmVlbiddXHJcbmNvbnN0IGxvZ2dlciA9IG5ldyBGbG93TG9nZ2VyKCdLYXNwYSBXYWxsZXQnLCB7IFxyXG5cdGRpc3BsYXkgOiBbJ25hbWUnLCAnbGV2ZWwnLCAndGltZSddLCBcclxuXHRjdXN0b20sIFxyXG5cdGNvbG9yOiBbJ2xldmVsJ11cclxufSk7XHJcblxyXG5sb2dnZXIuZW5hYmxlKCdhbGwnKTtcclxuXHJcbmV4cG9ydCB0eXBlIExvZ2dlciA9IHR5cGVvZiBsb2dnZXI7IC8vVE9ETyBmaW5kIGhvdyB0byBleHBvcnQgdHlwZSBmcm9tIG1vZHVsZVxyXG5leHBvcnQgY29uc3QgbG9nID0gbG9nZ2VyO1xyXG5leHBvcnQge0Zsb3dMb2dnZXJ9O1xyXG5leHBvcnQgY29uc3QgQ3JlYXRlTG9nZ2VyID0gKG5hbWU6c3RyaW5nPVwiS2FzcGFXYWxsZXRcIikgOiBMb2dnZXI9PntcclxuXHRsZXQgbG9nZ2VyID0gbmV3IEZsb3dMb2dnZXIobmFtZSwgeyBcclxuXHRcdGRpc3BsYXkgOiBbJ25hbWUnLCAnbGV2ZWwnLCAndGltZSddLCBcclxuXHRcdGN1c3RvbSwgXHJcblx0XHRjb2xvcjogWydsZXZlbCddXHJcblx0fSk7XHJcblx0cmV0dXJuIGxvZ2dlcjtcclxufVxyXG4iXX0=