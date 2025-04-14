export const socketService = {
  // Connect to WebSocket server
  connect: () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    return new WebSocket(wsUrl);
  }
};
