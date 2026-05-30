import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initBoxFolderStructure } from './lib/box.js';
import authRoutes from './routes/auth.js';
import spotsRoutes from './routes/spots.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/spots', spotsRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;

await initBoxFolderStructure();
app.listen(port, () => console.log(`Neesh API listening on :${port}`));
