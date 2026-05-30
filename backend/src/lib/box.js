import { getBoxClient } from './boxClient.js';
import { withLock } from './fileLock.js';

const BOX_ROOT = '0';
const folderIds = { root: null, spots: null, photos: null, userData: null };
const fileIdByKey = new Map();

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}

async function listAllItems(folderId) {
  const client = getBoxClient();
  const items = [];
  let offset = 0;
  while (true) {
    const page = await client.folders.getItems(folderId, {
      fields: 'id,name,type',
      limit: 1000,
      offset,
    });
    items.push(...page.entries);
    offset += page.entries.length;
    if (page.entries.length === 0 || offset >= page.total_count) break;
  }
  return items;
}

async function findChild(parentId, name, type) {
  const items = await listAllItems(parentId);
  const match = items.find((item) => item.type === type && item.name === name);
  return match ? match.id : null;
}

async function getOrCreateFolder(parentId, name) {
  const existing = await findChild(parentId, name, 'folder');
  if (existing) return existing;
  try {
    const created = await getBoxClient().folders.create(parentId, name);
    return created.id;
  } catch (err) {
    if (err.statusCode === 409) {
      return findChild(parentId, name, 'folder');
    }
    throw err;
  }
}

async function resolveParentFolderId(segments) {
  if (segments.length === 1) return folderIds.root;
  if (segments[0] === 'spots') return folderIds.spots;
  if (segments[0] === 'photos') return folderIds.photos;
  if (segments[0] === 'user_data') {
    return getOrCreateFolder(folderIds.userData, segments[1]);
  }
  throw new Error(`Cannot resolve Box folder for key: ${segments.join('/')}`);
}

async function getFileId(key) {
  if (fileIdByKey.has(key)) return fileIdByKey.get(key);
  const segments = key.split('/');
  const fileName = segments[segments.length - 1];
  const parentId = await resolveParentFolderId(segments);
  const id = await findChild(parentId, fileName, 'file');
  if (id) fileIdByKey.set(key, id);
  return id;
}

export async function readJsonFile(key) {
  const fileId = await getFileId(key);
  if (!fileId) throw new Error(`File not found in Box: ${key}`);
  const stream = await getBoxClient().files.getReadStream(fileId);
  return JSON.parse(await streamToString(stream));
}

export async function writeJsonFile(key, data) {
  const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  const segments = key.split('/');
  const fileName = segments[segments.length - 1];
  const existingId = await getFileId(key);
  if (existingId) {
    await getBoxClient().files.uploadNewFileVersion(existingId, buffer);
    return;
  }
  const parentId = await resolveParentFolderId(segments);
  const result = await getBoxClient().files.uploadFile(parentId, fileName, buffer);
  fileIdByKey.set(key, result.entries[0].id);
}

export function updateJsonFile(key, updater) {
  return withLock(key, async () => {
    const current = await readJsonFile(key);
    const updated = await updater(current);
    await writeJsonFile(key, updated);
    return updated;
  });
}

export async function deleteFile(key) {
  const fileId = await getFileId(key);
  if (!fileId) return;
  await getBoxClient().files.delete(fileId);
  fileIdByKey.delete(key);
}

async function ensureJsonFile(key, defaultValue) {
  const existingId = await getFileId(key);
  if (existingId) return;
  await writeJsonFile(key, defaultValue);
}

export async function uploadPhoto(photoId, buffer, extension = 'jpg') {
  const result = await getBoxClient().files.uploadFile(
    folderIds.photos,
    `${photoId}.${extension}`,
    buffer,
  );
  const fileId = result.entries[0].id;
  const shared = await getBoxClient().files.update(fileId, {
    shared_link: { access: 'open', permissions: { can_download: true } },
  });
  return { boxFileId: fileId, url: shared.shared_link.download_url };
}

export async function createUserFolder(userId) {
  await getOrCreateFolder(folderIds.userData, userId);
  await ensureJsonFile(`user_data/${userId}/saved.json`, []);
  await ensureJsonFile(`user_data/${userId}/friends.json`, []);
}

async function cacheSpotFiles() {
  const items = await listAllItems(folderIds.spots);
  for (const item of items) {
    if (item.type === 'file') fileIdByKey.set(`spots/${item.name}`, item.id);
  }
}

export async function initBoxFolderStructure() {
  folderIds.root =
    process.env.NEESH_ROOT_FOLDER_ID || (await getOrCreateFolder(BOX_ROOT, 'neesh'));
  folderIds.spots = await getOrCreateFolder(folderIds.root, 'spots');
  folderIds.photos = await getOrCreateFolder(folderIds.root, 'photos');
  folderIds.userData = await getOrCreateFolder(folderIds.root, 'user_data');
  await ensureJsonFile('users.json', []);
  await ensureJsonFile('spots_index.json', []);
  await cacheSpotFiles();
  return { ...folderIds };
}
