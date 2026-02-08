import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL_KEY = 'backendUrl';
const GITHUB_TOKEN_KEY = 'githubToken';
const DEFAULT_BACKEND_URL = 'https://localhost:5002';

export async function getBackendUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(BACKEND_URL_KEY);
  return url || DEFAULT_BACKEND_URL;
}

export async function setBackendUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
}

export async function getGitHubToken(): Promise<string | null> {
  return AsyncStorage.getItem(GITHUB_TOKEN_KEY);
}

export async function setGitHubToken(token: string): Promise<void> {
  await AsyncStorage.setItem(GITHUB_TOKEN_KEY, token);
}

export async function clearGitHubToken(): Promise<void> {
  await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(BACKEND_URL_KEY);
  await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
}
