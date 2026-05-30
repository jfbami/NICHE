import 'dotenv/config';
import { initBoxFolderStructure } from '../lib/box.js';

try {
  const folders = await initBoxFolderStructure();
  console.log('Box folder structure ready:');
  console.log(`  /neesh           -> ${folders.root}`);
  console.log(`  /neesh/spots     -> ${folders.spots}`);
  console.log(`  /neesh/photos    -> ${folders.photos}`);
  console.log(`  /neesh/user_data -> ${folders.userData}`);
  console.log('\nSet NEESH_ROOT_FOLDER_ID in backend/.env to:', folders.root);
} catch (err) {
  console.error('Box init failed:', err.message);
  if (err.response?.body) console.error(JSON.stringify(err.response.body, null, 2));
  process.exit(1);
}
