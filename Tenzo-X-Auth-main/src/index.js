import { Hono } from 'hono';
import { cors } from 'hono/cors';
import CryptoJS from 'crypto-js';

const app = new Hono();

app.use('*', cors());

app.get('/', async (c) => {
    return c.text('Tenzo X Auth is Active. Dashboard is loading...', 200);
});

app.get('/api-status', (c) => c.json({ status: 'Online', service: 'TXA Pages API' }));

const encrypt = (data, secret) => {
    if (!data) return data;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(str, secret).toString();
};

const decrypt = (ciphertext, secret) => {
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return ciphertext;
        try {
            return JSON.parse(decrypted);
        } catch (e) {
            return decrypted;
        }
    } catch (e) {
        return ciphertext;
    }
};

let cachedToken = null;
let tokenExpiry = 0;

async function getFirebaseToken(env) {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: env.FIREBASE_AUTH_EMAIL,
            password: env.FIREBASE_AUTH_PASSWORD,
            returnSecureToken: true
        })
    });
    const data = await resp.json();
    if (data.idToken) {
        cachedToken = data.idToken;
        tokenExpiry = Date.now() + (parseInt(data.expiresIn) * 1000) - 60000;
        return cachedToken;
    }
    throw new Error('Firebase Auth Failed');
}

async function dbRequest(env, path, method = 'GET', body = null) {
    const token = await getFirebaseToken(env);
    const url = `${env.FIREBASE_DB_URL}/${path}.json?auth=${token}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const resp = await fetch(url, options);
    return await resp.json();
}

const sendResponse = (success, message, extraData = {}) => ({ success, message, ...extraData });

const SDK_MAX_REQUEST_AGE_MS = 2 * 60 * 1000;
const sdkNonceCache = new Map();
const textEncoder = new TextEncoder();
let cachedSigningKey = null;
let cachedSigningPem = null;

const pruneSdkNonceCache = () => {
    const now = Date.now();
    for (const [key, expiresAt] of sdkNonceCache.entries()) {
        if (expiresAt <= now) sdkNonceCache.delete(key);
    }
};

const normalizeSdkString = (value) => typeof value === 'string' ? value : '';

const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

const sha256Hex = async (value) => {
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(normalizeSdkString(value)));
    return bytesToHex(new Uint8Array(digest));
};

const pemToArrayBuffer = (pem) => {
    const base64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
};

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

async function getResponseSigningKey(env) {
    const pem = env.TXA_RESPONSE_SIGNING_PRIVATE_KEY_PEM?.trim();
    if (!pem) throw new Error('Missing TXA_RESPONSE_SIGNING_PRIVATE_KEY_PEM');

    if (cachedSigningKey && cachedSigningPem === pem) return cachedSigningKey;

    cachedSigningKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(pem),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
    cachedSigningPem = pem;
    return cachedSigningKey;
}

async function buildSdkSignaturePayload(endpoint, responseBody) {
    const variableLines = Object.keys(responseBody.variables || {})
        .sort()
        .map((key) => `${key}=${normalizeSdkString(responseBody.variables[key])}`)
        .join('\n');

    return [
        `endpoint=${await sha256Hex(endpoint)}`,
        `requestNonce=${await sha256Hex(responseBody.requestNonce)}`,
        `serverTimestamp=${await sha256Hex(responseBody.serverTimestamp)}`,
        `success=${responseBody.success ? '1' : '0'}`,
        `message=${await sha256Hex(responseBody.message)}`,
        `username=${await sha256Hex(responseBody.username)}`,
        `subscription=${await sha256Hex(responseBody.subscription)}`,
        `expiry=${await sha256Hex(responseBody.expiry)}`,
        `serverVersion=${await sha256Hex(responseBody.serverVersion)}`,
        `value=${await sha256Hex(responseBody.value)}`,
        `variables=${await sha256Hex(variableLines ? `${variableLines}\n` : '')}`
    ].join('\n') + '\n';
}

async function signSdkResponse(env, endpoint, responseBody) {
    const privateKey = await getResponseSigningKey(env);
    const payload = await buildSdkSignaturePayload(endpoint, responseBody);
    const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        privateKey,
        textEncoder.encode(payload)
    );
    return arrayBufferToBase64(signature);
}

function validateSdkRequest(body, endpoint) {
    const clientNonce = normalizeSdkString(body?.clientNonce).trim();
    const clientTimestampRaw = normalizeSdkString(body?.clientTimestamp).trim();

    if (!clientNonce || !clientTimestampRaw) return { ok: false, message: 'MISSING_SECURITY_FIELDS' };
    if (clientNonce.length < 16 || clientNonce.length > 128) return { ok: false, message: 'INVALID_CLIENT_NONCE' };

    const clientTimestamp = Number(clientTimestampRaw);
    if (!Number.isFinite(clientTimestamp)) return { ok: false, message: 'INVALID_CLIENT_TIMESTAMP' };
    if (Math.abs(Date.now() - clientTimestamp * 1000) > SDK_MAX_REQUEST_AGE_MS) return { ok: false, message: 'STALE_REQUEST' };

    pruneSdkNonceCache();
    const replayKey = `${endpoint}:${clientNonce}`;
    if (sdkNonceCache.has(replayKey)) return { ok: false, message: 'REPLAY_BLOCKED' };

    sdkNonceCache.set(replayKey, Date.now() + SDK_MAX_REQUEST_AGE_MS);
    return { ok: true, clientNonce };
}

async function sdkJson(c, endpoint, requestBody, success, message, extraData = {}, status = 200) {
    return c.json(sendResponse(success, message, extraData), status);
}

async function getAppMetadata(c, secret, appName) {
    const metaRaw = await dbRequest(c.env, `applications/${secret}/${appName}/metadata`);
    if (metaRaw) {
        let meta = decrypt(metaRaw, c.env.DB_SECRET);
        return typeof meta === 'object' ? meta : { version: 'UNKNOWN', applicationPaused: false };
    }
    const appDataRaw = await dbRequest(c.env, `applications/${secret}/${appName}`);
    if (!appDataRaw) return null;
    let appData = appDataRaw;
    if (typeof appData === 'string') return decrypt(appData, c.env.DB_SECRET);
    if (appData && appData.metadata) return decrypt(appData.metadata, c.env.DB_SECRET);
    return appData;
}


app.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        let { username, password, secret, appName, appVersion, hwid } = body;
        username = username?.trim(); password = password?.trim(); secret = secret?.trim();
        appName = appName?.trim(); appVersion = appVersion?.trim(); hwid = hwid?.trim();
        if (!username || !password || !secret || !appName || !appVersion) return sdkJson(c, 'login', body, false, 'Missing required fields', {}, 400);
        
        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return sdkJson(c, 'login', body, false, 'Application not found', {}, 404);
        if (appData.applicationPaused) return sdkJson(c, 'login', body, false, 'APPLICATION_PAUSED', {}, 403);
        if ((appData.version || 'UNKNOWN') !== appVersion) return sdkJson(c, 'login', body, false, 'VERSION_MISMATCH', { serverVersion: appData.version || 'UNKNOWN' }, 409);
        const userDataRaw = await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`);
        if (!userDataRaw) return sdkJson(c, 'login', body, false, 'Invalid credentials', {}, 401);
        let userData = userDataRaw;
        if (typeof userData === 'string') userData = decrypt(userData, c.env.DB_SECRET);
        if (userData.password !== password) return sdkJson(c, 'login', body, false, 'Invalid credentials', {}, 401);
        if (userData.isBanned) return sdkJson(c, 'login', body, false, 'USER_BANNED', {}, 403);
        if (userData.hwidLock) {
            if (!userData.sid) {
                if (hwid) {
                    userData.sid = hwid;
                    await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'PUT', encrypt(userData, c.env.DB_SECRET));
                }
            } else if (userData.sid !== hwid) return sdkJson(c, 'login', body, false, 'HWID_MISMATCH', {}, 403);
        }
        if (userData.expiry && userData.expiry !== 'lifetime') {
            if (new Date(userData.expiry) < new Date()) return sdkJson(c, 'login', body, false, 'LICENSE_EXPIRED', {}, 403);
        }
        if (userData.oneTime === true) await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'DELETE');
        return sdkJson(c, 'login', body, true, 'LOGIN_SUCCESS', {
            username: username, subscription: userData.subscription || 'default', expiry: userData.expiry || 'lifetime'
        });
    } catch (error) { return c.json(sendResponse(false, 'Internal Server Error'), 500); }
});

app.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        let { username, password, licenseKey, secret, appName, appVersion, hwid } = body;
        if (!username || !password || !licenseKey || !secret || !appName || !appVersion) return sdkJson(c, 'register', body, false, 'Missing required fields', {}, 400);
        
        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return sdkJson(c, 'register', body, false, 'App not found', {}, 404);
        if (appData.applicationPaused) return sdkJson(c, 'register', body, false, 'APPLICATION_PAUSED', {}, 403);
        if ((appData.version || 'UNKNOWN') !== appVersion) return sdkJson(c, 'register', body, false, 'VERSION_MISMATCH', { serverVersion: appData.version || 'UNKNOWN' }, 409);
        const userSnapshot = await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`);
        if (userSnapshot) return sdkJson(c, 'register', body, false, 'Username taken', {}, 409);
        const licenseDataRaw = await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`);
        if (!licenseDataRaw) return sdkJson(c, 'register', body, false, 'Invalid or used License', {}, 404);
        let licenseData = licenseDataRaw;
        if (typeof licenseData === 'string') licenseData = decrypt(licenseData, c.env.DB_SECRET);
        if (licenseData.used) return sdkJson(c, 'register', body, false, 'Invalid or used License', {}, 409);
        const newUser = {
            password, hwidLock: true, sid: hwid || "", isBanned: false, license: licenseKey,
            expiry: licenseData.expiry || 'lifetime', subscription: licenseData.rank || 'default',
            created: new Date().toISOString()
        };
        await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'PUT', encrypt(newUser, c.env.DB_SECRET));
        licenseData.used = true;
        licenseData.associatedUser = username;
        await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`, 'PUT', encrypt(licenseData, c.env.DB_SECRET));
        return sdkJson(c, 'register', body, true, 'REGISTER_SUCCESS');
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/isapplicationpaused', async (c) => {
    try {
        const body = await c.req.json();
        let { secret, appName } = body;
        secret = secret?.trim();
        appName = appName?.trim();

        if (!secret || !appName) return sdkJson(c, 'isapplicationpaused', body, false, 'Missing required fields', {}, 400);

        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return sdkJson(c, 'isapplicationpaused', body, false, 'App not found', {}, 404);

        return sdkJson(c, 'isapplicationpaused', body, !!appData.applicationPaused, appData.applicationPaused ? 'APPLICATION_PAUSED' : 'APPLICATION_ACTIVE');
    } catch (error) {
        return c.json(sendResponse(false, 'Server error'), 500);
    }
});

app.post('/create_user', async (c) => {
    try {
        const body = await c.req.json();
        let { username, password, secret, appName, appVersion, hwid, expiry, subscription } = body;
        if (!username || !password || !secret || !appName || !appVersion) return c.json(sendResponse(false, 'Missing required fields'));
        
        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return c.json(sendResponse(false, 'App not found'));
        if (appData.applicationPaused) return c.json(sendResponse(false, 'APPLICATION_PAUSED'));
        if ((appData.version || 'UNKNOWN') !== appVersion) return c.json(sendResponse(false, 'VERSION_MISMATCH'));
        
        const userSnapshot = await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`);
        if (userSnapshot) return c.json(sendResponse(false, 'Username taken'));
        
        const newUser = {
            password, 
            hwidLock: true, 
            sid: hwid || "", 
            isBanned: false, 
            license: 'direct',
            expiry: expiry || 'lifetime', 
            subscription: subscription || 'default',
            created: new Date().toISOString()
        };
        await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'PUT', encrypt(newUser, c.env.DB_SECRET));
        return c.json(sendResponse(true, 'USER_CREATED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/versioncheck', async (c) => {
    try {
        const body = await c.req.json();
        const { secret, appName, appVersion } = body;
        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return sdkJson(c, 'versioncheck', body, false, 'App not found', {}, 404);
        
        const currentVersion = appData.version || 'UNKNOWN';
        if (currentVersion === appVersion) return sdkJson(c, 'versioncheck', body, true, 'VERSION_OK', { serverVersion: currentVersion });
        return sdkJson(c, 'versioncheck', body, false, 'VERSION_MISMATCH', { serverVersion: currentVersion }, 409);
    } catch (e) { return c.json(sendResponse(false, 'Error'), 500); }
});

app.post('/getvariable', async (c) => {
    try {
        const body = await c.req.json();
        let { secret, appName, appVersion, varName } = body;
        const appData = await getAppMetadata(c, secret, appName);
        if (!appData) return sdkJson(c, 'getvariable', body, false, 'App not found', {}, 404);
        if (appData.applicationPaused) return sdkJson(c, 'getvariable', body, false, 'APPLICATION_PAUSED', {}, 403);
        if ((appData.version || 'UNKNOWN') !== appVersion) return sdkJson(c, 'getvariable', body, false, 'VERSION_MISMATCH', { serverVersion: appData.version || 'UNKNOWN' }, 409);
        const varValueRaw = await dbRequest(c.env, `applications/${secret}/${appName}/variables/${varName}`);
        if (varValueRaw) return sdkJson(c, 'getvariable', body, true, 'VARIABLE_FOUND', { value: decrypt(varValueRaw, c.env.DB_SECRET) });
        return sdkJson(c, 'getvariable', body, false, 'VARIABLE_NOT_FOUND', {}, 404);
    } catch (e) { return c.json(sendResponse(false, 'Server Error'), 500); }
});

app.post('/getvariables', async (c) => {
    try {
        const body = await c.req.json();
        let { secret, appName } = body;
        const rawVars = await dbRequest(c.env, `applications/${secret}/${appName}/variables`);
        let vars = {};
        if (rawVars) for (const key in rawVars) vars[key] = decrypt(rawVars[key], c.env.DB_SECRET);
        return sdkJson(c, 'getvariables', body, true, rawVars ? 'VARIABLES_FOUND' : 'NO_VARIABLES', { variables: vars });
    } catch (e) { return c.json(sendResponse(false, 'Error'), 500); }
});

app.post('/create_app', async (c) => {
    try {
        const { secret, appName } = await c.req.json();
        if (!secret || !appName) return c.json(sendResponse(false, 'Missing required fields'));
        const metaRaw = await dbRequest(c.env, `applications/${secret}/${appName}/metadata`);
        if (metaRaw) return c.json(sendResponse(false, 'App already exists'));
        const meta = { created: new Date().toISOString(), version: "1.0", applicationPaused: false };
        await dbRequest(c.env, `applications/${secret}/${appName}/metadata`, 'PUT', encrypt(meta, c.env.DB_SECRET));
        return c.json(sendResponse(true, 'APP_CREATED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/delete_app', async (c) => {
    try {
        const { secret, appName } = await c.req.json();
        if (!secret || !appName) return c.json(sendResponse(false, 'Missing required fields'));
        await dbRequest(c.env, `applications/${secret}/${appName}`, 'DELETE');
        return c.json(sendResponse(true, 'APP_DELETED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/delete_user', async (c) => {
    try {
        const { secret, appName, username } = await c.req.json();
        if (!secret || !appName || !username) return c.json(sendResponse(false, 'Missing required fields'));
        
        const userSnapshot = await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`);
        if (userSnapshot) {
            let user = userSnapshot;
            if (typeof user === 'string') user = decrypt(user, c.env.DB_SECRET);
            if (user && user.license && user.license !== 'direct') {
                await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${user.license}`, 'DELETE');
            }
        }
        await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'DELETE');
        return c.json(sendResponse(true, 'USER_DELETED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/reset_hwid', async (c) => {
    try {
        const { secret, appName, username } = await c.req.json();
        if (!secret || !appName || !username) return c.json(sendResponse(false, 'Missing required fields'));
        
        const userSnapshot = await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`);
        if (!userSnapshot) return c.json(sendResponse(false, 'User not found'));
        
        let user = userSnapshot;
        if (typeof user === 'string') user = decrypt(user, c.env.DB_SECRET);
        user.sid = "";
        
        await dbRequest(c.env, `applications/${secret}/${appName}/users/${username}`, 'PUT', encrypt(user, c.env.DB_SECRET));
        return c.json(sendResponse(true, 'HWID_RESET'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/create_license', async (c) => {
    try {
        const { secret, appName, licenseKey, rank, expiry, note } = await c.req.json();
        if (!secret || !appName || !licenseKey) return c.json(sendResponse(false, 'Missing required fields'));
        
        const licenseDataRaw = await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`);
        if (licenseDataRaw) return c.json(sendResponse(false, 'License already exists'));
        
        const licenseData = {
            used: false,
            rank: rank || 'default',
            expiry: expiry || 'lifetime',
            createdBy: 'api',
            note: note || '',
            created: new Date().toISOString()
        };
        
        await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`, 'PUT', encrypt(licenseData, c.env.DB_SECRET));
        return c.json(sendResponse(true, 'LICENSE_CREATED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});

app.post('/delete_license', async (c) => {
    try {
        const { secret, appName, licenseKey } = await c.req.json();
        if (!secret || !appName || !licenseKey) return c.json(sendResponse(false, 'Missing required fields'));
        
        const licenseDataRaw = await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`);
        if (licenseDataRaw) {
            let license = licenseDataRaw;
            if (typeof license === 'string') license = decrypt(license, c.env.DB_SECRET);
            if (license && license.associatedUser) {
                await dbRequest(c.env, `applications/${secret}/${appName}/users/${license.associatedUser}`, 'DELETE');
            }
        }
        await dbRequest(c.env, `applications/${secret}/${appName}/licenses/${licenseKey}`, 'DELETE');
        return c.json(sendResponse(true, 'LICENSE_DELETED'));
    } catch (error) { return c.json(sendResponse(false, 'Server error'), 500); }
});


app.get('*', async (c) => {
    return await c.env.ASSETS.fetch(c.req.raw);
});

export default app;
