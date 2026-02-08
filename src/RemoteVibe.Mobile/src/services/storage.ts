import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL_KEY = 'backendUrl';
const DEFAULT_BACKEND_URL = 'https://localhost:5002';

export async function getBackendUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(BACKEND_URL_KEY);
  return url || DEFAULT_BACKEND_URL;
}

export async function setBackendUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(BACKEND_URL_KEY);
}
