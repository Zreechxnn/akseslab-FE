import { HubConnectionBuilder, LogLevel, HttpTransportType } from "@microsoft/signalr";
import { CONFIG } from "./config";

export const createSignalRConnection = (token) => {
  return new HubConnectionBuilder()
    .withUrl(`${CONFIG.BASE_URL}/hubs/log`, {
      accessTokenFactory: () => token,
      // ⚠️ HANYA gunakan Long Polling. Jangan pakai WebSockets dulu.
      transport: HttpTransportType.LongPolling,
      // Skip negosiasi tidak bisa dilakukan di Long Polling, jadi biarkan false (default)
      skipNegotiation: false 
    })
    // Konfigurasi Reconnect agar lebih agresif mencoba ulang
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000]) 
    .configureLogging(LogLevel.Information)
    .build();
};