import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BoxSDK from 'box-node-sdk';

function loadBoxConfig() {
  const configPath = process.env.BOX_CONFIG_PATH;
  if (!configPath) {
    throw new Error('BOX_CONFIG_PATH is not set');
  }
  const raw = readFileSync(resolve(configPath), 'utf-8');
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
