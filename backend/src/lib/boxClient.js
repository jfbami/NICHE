import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BoxSDK from 'box-node-sdk';

function readConfigFromEnv() {
  const base64 = process.env.BOX_CONFIG_JSON_BASE64;
  if (base64) return Buffer.from(base64, 'base64').toString('utf-8');
  return process.env.BOX_CONFIG_JSON ?? null;
}

function readConfigFromFile() {
  const configPath = process.env.BOX_CONFIG_PATH;
  if (!configPath) return null;
  return readFileSync(resolve(configPath), 'utf-8');
}

function loadBoxConfig() {
  const raw = readConfigFromEnv() ?? readConfigFromFile();
  if (!raw) {
    throw new Error(
      'No Box config found. Set BOX_CONFIG_JSON_BASE64 (preferred for hosted envs) or BOX_CONFIG_PATH.',
    );
  }
  const config = JSON.parse(raw);
  const { clientID, clientSecret } = config.boxAppSettings;
  if (!clientID || !clientSecret || !config.enterpriseID) {
    throw new Error('Box config is missing clientID, clientSecret, or enterpriseID');
  }
  return config;
}

function usesJwt(config) {
  return Boolean(config.boxAppSettings.appAuth?.privateKey);
}

let cachedClient = null;

export function getBoxClient() {
  if (cachedClient) {
    return cachedClient;
  }
  const config = loadBoxConfig();
  if (usesJwt(config)) {
    const sdk = BoxSDK.getPreconfiguredInstance(config);
    cachedClient = sdk.getAppAuthClient('enterprise', config.enterpriseID);
  } else {
    const { clientID, clientSecret } = config.boxAppSettings;
    const sdk = new BoxSDK({ clientID, clientSecret, enterpriseID: config.enterpriseID });
    cachedClient = sdk.getAnonymousClient();
  }
  return cachedClient;
}
