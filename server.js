import * as dotenv from 'dotenv';
dotenv.config();
import debug from 'debug';
const debugMain = debug('app:Server');
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import {ProductRouter} from './routes/api/product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use('/api/product',ProductRouter);
const dbUrl = process.env.DB_URL;

//register routes
app.get('/',(req,res)=>{
    console.log(dbUrl);
    debugMain('Server Route Hit!');
    res.sendFile(path.join(__dirname,'public/index.html'));
});

//error handlers
app.use((req,res)=>{
    debugMain(`Sorry couldn't find ${req.originalUrl}`);
    res.status(404).json({ error: `Sorry couldn't find ${req.originalUrl}` });
});
const port = process.env.PORT || 2024;

app.listen(port, ()=>{
    debugMain(`Listening on port http://localhost:${port}`);
    console.log(`Listening on port http://localhost:${port}`);
});