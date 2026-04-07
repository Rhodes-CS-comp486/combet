//export const API_BASE = "http://combet.live/api";


import Constants from "expo-constants";

// In development, use the machine's local IP (Expo provides this automatically)
// In production, use your deployed API URL
const getApiUrl = () => {
  if (__DEV__) {
    // Expo gives us the host machine's IP via the debugger host
    const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0];
    if (debuggerHost) return `http://${debuggerHost}:3001`;
    // Fallback for web browser
    return "http://localhost:3001";
  }
  // Production URL — replace with your deployed backend
  return "https://combet.live/api";
};

export const API_BASE = getApiUrl();

