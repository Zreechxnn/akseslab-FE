import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";
import { CONFIG } from "./config";

export const createSignalRConnection = (token) => {
  return new HubConnectionBuilder()
    .withUrl(`${CONFIG.BASE_URL}/hubs/log`, {
      accessTokenFactory: () => token,
      transport: HttpTransportType.LongPolling,
      skipNegotiation: false 
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000]) 
    .configureLogging(LogLevel.Information)
    .build();
};