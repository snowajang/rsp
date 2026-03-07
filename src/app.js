import 'dotenv/config';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { prisma } from "./lib/prisma.js";

import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// const prisma = new PrismaClient();
const officeID = Number(process.env.OFFICE_ID || "0");
async function writeApiLog({
    endpoint,
    method,
    reqHeader,
    reqBody,
    resStatus,
    resBody,
    error
}) {
    try {
        await prisma.apiLog.create({
            data: {
                endpoint,
                method,
                reqHeader,
                reqBody,
                resStatus,
                resBody,
                error
            }
        });
    } catch (err) {
        console.error("LOGGING ERROR:", err);
    }
}
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true
    }
}));

app.use((req, res, next) => {
    req.prisma = prisma;     // reuse ตัวเดิม
    req.officeID = officeID;
    req.writeApiLog = writeApiLog;
    res.locals.currentUser = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    res.locals.currentPath = req.path;
    next();
    console.log(req.method, res.statusCode, `sessoin [${!!req.session.user}]`, req.originalUrl);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Use conventional layout wrapping (prevents nested-template parsing issues)
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb'}));
app.use(express.static(path.join(__dirname, '..', 'public')));

const routesPath = path.join(__dirname, 'controllers');

// ฟังก์ชันอ่านไฟล์ทุกไฟล์ในโฟลเดอร์ controllers (รวม sub-folder)
function getRouteFilesRecursive(dir, fileList = []) {
    const items = fs.readdirSync(dir);

    items.forEach((name) => {
        const fullPath = path.join(dir, name);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            getRouteFilesRecursive(fullPath, fileList);
        } else if (name.endsWith('.route.js')) {
            fileList.push(fullPath);
        }
    });

    return fileList;
}

// แทนที่โค้ดเดิม (บรรทัด 43)
const routeFiles = getRouteFilesRecursive(routesPath);

for (const filePath of routeFiles) {
    const moduleUrl = pathToFileURL(filePath).href;

    const routeModule = await import(moduleUrl);
    const router = routeModule.default || routeModule.router;

    if (!router) {
        console.warn(`Route file ${filePath} ไม่มี default export ของ express.Router()`);
        continue;
    }
    

    const baseName = path.basename(filePath).replace('.route.js', '');
    const mountName = baseName.split('.')[0];
    const mountPath = mountName === 'home' ? '/' : `/${mountName}`;

    app.use(mountPath, router);
    console.log(`Mounted route: ${mountPath} -> ${filePath}`);
}

// --- Swagger Config ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Linkage Center API',
            version: '1.0.0',
            description: 'API documentation for Linkage Center services'
        },
        servers: [
            {
                // ใช้ relative URL จะได้ไม่ต้องสน port จริง
                url: '/',
                description: 'Current server'
            }
        ]
    },
    // ให้ swagger-jsdoc ไปอ่าน JSDoc ใน controllers ทุกไฟล์ .route.js (รวม subfolder)
    apis: [
        path.join(__dirname, 'controllers', 'api/*.route.js')
    ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// เปิดหน้า Swagger UI ที่ /api-docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// --- End Swagger Config ---


app.use((req, res) => {
    console.log(req.method, res.statusCode, `sessoin [${!!req.session.user}]`, req.originalUrl);
    res.status(404).render('errors/404', { layout: 'layouts/blank', title: '404 Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err);
    console.log(req.method, res.statusCode, `sessoin [${!!req.session.user}]`, req.originalUrl);
    res.status(500).render('errors/500', { layout: 'layouts/blank', title: 'Server Error', error: err });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// ปิดแบบถูกต้องตอน process จะจบ
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
