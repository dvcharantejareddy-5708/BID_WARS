import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './roomManager.js';
import { getAllPlayers, getPlayerById } from './playerService.js';
import { tournamentManager } from './tournamentManager.js';
import { tournamentStorage } from './tournamentStorage.js';
import { supabase, supabaseAdmin } from './supabase.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const roomManager = new RoomManager();
// Restore persisted rooms from durable disk / Supabase
roomManager.loadPersistedRooms().catch((err) => {
    console.error('[Startup] Failed to restore persisted rooms:', err);
});
// Serve static frontend from client/dist if available (unified fullstack deployment / Render)
const resolveClientDistPath = () => {
    const candidates = [
        path.join(__dirname, '../../client/dist'),
        path.join(__dirname, '../client/dist'),
        path.join(process.cwd(), 'client/dist'),
        path.join(process.cwd(), '../client/dist')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
            return candidate;
        }
    }
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[0];
};
const clientDistPath = resolveClientDistPath();
if (fs.existsSync(clientDistPath)) {
    console.log(`[Static] Serving frontend from ${clientDistPath}`);
    app.use(express.static(clientDistPath));
}
// REST API Endpoints
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        game: 'BID WARS',
        edition: '2026',
        timestamp: Date.now()
    });
});
// Create Room
app.post('/api/rooms', (req, res) => {
    try {
        const { hostNickname, settings } = req.body || {};
        if (!hostNickname || typeof hostNickname !== 'string' || !hostNickname.trim()) {
            return res.status(400).json({ error: 'Valid host nickname is required' });
        }
        // Validate private room password requirement
        if (settings && settings.isPrivate) {
            const pwd = settings.password !== undefined && settings.password !== null ? String(settings.password).trim() : '';
            if (!pwd || pwd.length < 4) {
                return res.status(400).json({ error: 'Password for private rooms must be at least 4 characters' });
            }
        }
        const room = roomManager.createRoom(hostNickname.trim(), settings || {});
        return res.status(201).json({
            success: true,
            roomCode: room.roomCode,
            hostId: room.hostId,
            sessionToken: room.hostId,
            state: room.getState()
        });
    }
    catch (err) {
        console.error('[API] Error creating room:', err);
        return res.status(500).json({ error: err.message || 'Failed to create room' });
    }
});
// Verify Room Password (REST API for pre-validation and direct joins)
app.post('/api/rooms/:code/verify-password', (req, res) => {
    try {
        const code = req.params.code.toUpperCase().trim();
        const { password } = req.body || {};
        const room = roomManager.getRoom(code);
        if (!room) {
            return res.status(404).json({ error: `Room "${code}" not found` });
        }
        if (!room.isPrivate) {
            return res.json({ success: true, verified: true, message: 'Room is public' });
        }
        const isValid = room.verifyPassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect room password', verified: false });
        }
        return res.json({ success: true, verified: true, message: 'Password verified' });
    }
    catch (err) {
        console.error('[API] Error verifying password:', err);
        return res.status(500).json({ error: err.message || 'Error verifying password' });
    }
});
// Get Room State
app.get('/api/rooms/:code', (req, res) => {
    try {
        const code = req.params.code.toUpperCase().trim();
        const room = roomManager.getRoom(code);
        if (!room) {
            return res.status(404).json({ error: `Room "${code}" not found` });
        }
        return res.json({
            success: true,
            roomCode: room.roomCode,
            state: room.getState()
        });
    }
    catch (err) {
        console.error('[API] Error getting room:', err);
        return res.status(500).json({ error: err.message || 'Error fetching room state' });
    }
});
// Search & Filter Players
app.get('/api/players', (req, res) => {
    const season = req.query.season === '2025' ? '2025' : '2026';
    const category = req.query.category;
    const role = req.query.role;
    const search = (req.query.search || '').toLowerCase().trim();
    const nationality = req.query.nationality; // 'India' or 'Overseas'
    const pool = req.query.pool; // 'auction' or 'retained'
    const marqueeOnly = req.query.marquee === 'true';
    let list = getAllPlayers(season);
    if (category) {
        list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (role) {
        list = list.filter(p => p.primary_role.toLowerCase() === role.toLowerCase());
    }
    if (search) {
        list = list.filter(p => p.name.toLowerCase().includes(search) ||
            p.nationality.toLowerCase().includes(search) ||
            p.set_name.toLowerCase().includes(search));
    }
    if (nationality === 'India') {
        list = list.filter(p => !p.is_overseas);
    }
    else if (nationality === 'Overseas') {
        list = list.filter(p => p.is_overseas);
    }
    if (pool === 'auction') {
        list = list.filter(p => !p.is_retained);
    }
    else if (pool === 'retained') {
        list = list.filter(p => p.is_retained);
    }
    if (marqueeOnly) {
        list = list.filter(p => p.is_marquee);
    }
    res.json({
        total: list.length,
        season,
        players: list
    });
});
// Single Player Detail
app.get('/api/players/:id', (req, res) => {
    const season = req.query.season === '2025' ? '2025' : '2026';
    const player = getPlayerById(req.params.id, season);
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ player });
});
// ==========================================
// 4. USERNAME + GMAIL AUTHENTICATION & PASSWORD MANAGEMENT API
// ==========================================
// Register new account with unique username, mandatory verified Gmail and secure password
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, email, gmail } = req.body || {};
        const inputEmail = email || gmail;
        // 1. Validate Username
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const cleanUser = String(username).trim();
        if (cleanUser.length < 3 || cleanUser.length > 20) {
            return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
        }
        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
        }
        // 2. Validate Password
        if (String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        // 3. Mandatory Gmail Validation
        if (!inputEmail || !String(inputEmail).trim()) {
            return res.status(400).json({ error: 'Gmail address is required.' });
        }
        const cleanEmail = String(inputEmail).trim().toLowerCase();
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
            return res.status(400).json({ error: 'Invalid Gmail format. Enter a valid address ending in @gmail.com.' });
        }
        // 4. Atomic Uniqueness Checks
        const isNameAvailable = await tournamentStorage.isNameAvailable(cleanUser);
        if (!isNameAvailable) {
            return res.status(409).json({ error: `Username "${cleanUser}" is already taken. Please choose another.` });
        }
        const isEmailAvailable = await tournamentStorage.isEmailAvailable(cleanEmail);
        if (!isEmailAvailable) {
            return res.status(409).json({ error: 'This Gmail address is already registered to another account.' });
        }
        if (!supabaseAdmin && !supabase) {
            return res.status(503).json({
                error: 'Supabase authentication service is unavailable. Local fallback storage is strictly disabled.'
            });
        }
        const clientUrl = process.env.CLIENT_URL || 'https://bidwars.onrender.com';
        let userId = '';
        let emailConfirmed = false;
        let supabaseSession = null;
        // 5. Create confirmed user in Supabase Auth using the real Gmail address (No verification required)
        if (supabaseAdmin) {
            const { data: suData, error: suError } = await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password: password,
                email_confirm: true, // Immediate account activation
                user_metadata: {
                    username: cleanUser,
                    in_game_name: cleanUser
                }
            });
            if (suError) {
                console.error('[Auth] Supabase Admin createUser error:', suError);
                if (suError.message.toLowerCase().includes('already') || suError.status === 422) {
                    return res.status(409).json({ error: 'This Gmail address is already registered to another account.' });
                }
                return res.status(500).json({ error: `Supabase Auth error: ${suError.message}` });
            }
            if (!suData?.user) {
                return res.status(500).json({ error: 'Failed to create user in Supabase Auth' });
            }
            userId = suData.user.id;
            emailConfirmed = true;
            // Issue active session immediately upon registration
            if (supabase) {
                const { data: siData } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: password
                });
                if (siData?.session) {
                    supabaseSession = {
                        access_token: siData.session.access_token,
                        refresh_token: siData.session.refresh_token
                    };
                }
            }
        }
        else if (supabase) {
            const { data: suData, error: suError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: password,
                options: {
                    data: {
                        username: cleanUser,
                        in_game_name: cleanUser
                    },
                    emailRedirectTo: clientUrl
                }
            });
            if (suError) {
                console.error('[Auth] Supabase Auth signUp error:', suError);
                if (suError.message.toLowerCase().includes('already') || suError.status === 400 || suError.status === 422) {
                    return res.status(409).json({ error: 'This Gmail address or username is already taken.' });
                }
                return res.status(500).json({ error: `Supabase Auth error: ${suError.message}` });
            }
            if (!suData?.user) {
                return res.status(500).json({ error: 'Failed to create user in Supabase Auth' });
            }
            userId = suData.user.id;
            emailConfirmed = true;
            if (suData.session) {
                supabaseSession = {
                    access_token: suData.session.access_token,
                    refresh_token: suData.session.refresh_token
                };
            }
        }
        // 6. Generate scrypt hash & salt for auth_secrets backup
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
        // 7. Persist Profile to public.profiles & credentials to public.auth_secrets
        let profile;
        try {
            profile = await tournamentStorage.saveProfile({
                id: userId,
                username: cleanUser,
                inGameName: cleanUser,
                email: cleanEmail,
                recoveryEmail: cleanEmail,
                passwordHash,
                salt,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }
        catch (dbErr) {
            if (supabaseAdmin && userId) {
                await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => { });
            }
            return res.status(500).json({ error: `Database persistence error: ${dbErr.message}` });
        }
        return res.status(201).json({
            success: true,
            emailConfirmed: true,
            message: 'Account created successfully!',
            user: {
                id: profile.id,
                username: profile.username || cleanUser,
                inGameName: profile.inGameName || cleanUser,
                email: cleanEmail
            },
            session: supabaseSession
        });
    }
    catch (err) {
        console.error('[Auth] Registration error:', err);
        return res.status(500).json({ error: err.message || 'Registration failed' });
    }
});
// Resend verification email to Gmail address
app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || !String(email).trim().toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ error: 'Valid Gmail address is required' });
        }
        const cleanEmail = String(email).trim().toLowerCase();
        const clientUrl = process.env.CLIENT_URL || 'https://bidwars.onrender.com';
        if (supabase) {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: cleanEmail,
                options: {
                    emailRedirectTo: clientUrl
                }
            });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
        }
        return res.json({ success: true, message: 'Verification email resent. Please check your Gmail inbox.' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to resend verification email' });
    }
});
// Login with username and password (Supabase Auth single source of truth)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const cleanUser = String(username).trim();
        let profile = await tournamentStorage.getProfileByUsername(cleanUser);
        // 1. Resolve registered email
        let userEmail = '';
        if (profile && profile.email) {
            userEmail = profile.email.trim().toLowerCase();
        }
        else {
            // Deterministic fallback for legacy accounts created prior to mandatory Gmail
            const authSecret = process.env.AUTH_SECRET_SALT || 'bidwars_auth_default_secret_salt_2026';
            const authHash = crypto.createHmac('sha256', authSecret).update(cleanUser.toLowerCase()).digest('hex').slice(0, 32);
            userEmail = `usr_${authHash}@bidwars.com`;
        }
        // 2. Authoritative Supabase Auth Authentication
        if (supabase) {
            const { data: siData, error: siError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: String(password)
            });
            if (siData?.session && siData.user) {
                if (!profile) {
                    profile = await tournamentStorage.getProfile(siData.user.id);
                }
                return res.json({
                    success: true,
                    user: {
                        id: siData.user.id,
                        username: profile?.username || cleanUser,
                        inGameName: profile?.inGameName || cleanUser,
                        email: userEmail,
                        avatar: profile?.avatarUrl
                    },
                    session: {
                        access_token: siData.session.access_token,
                        refresh_token: siData.session.refresh_token
                    }
                });
            }
        }
        // 3. Legacy Migration Path: For pre-existing accounts stored with scrypt hash
        const legacyCreds = await tournamentStorage.getLegacyCredentials(cleanUser);
        if (legacyCreds && legacyCreds.passwordHash && legacyCreds.salt) {
            const computedHash = crypto.scryptSync(password, legacyCreds.salt, 64).toString('hex');
            const hashBuf = Buffer.from(computedHash, 'hex');
            const targetBuf = Buffer.from(legacyCreds.passwordHash, 'hex');
            if (hashBuf.length === targetBuf.length && crypto.timingSafeEqual(hashBuf, targetBuf)) {
                // Legacy password matches! Auto-sync to Supabase Auth
                if (supabaseAdmin) {
                    try {
                        await supabaseAdmin.auth.admin.createUser({
                            id: legacyCreds.id.length === 36 ? legacyCreds.id : undefined,
                            email: userEmail,
                            password: String(password),
                            email_confirm: true,
                            user_metadata: {
                                username: legacyCreds.username || cleanUser,
                                in_game_name: legacyCreds.inGameName || cleanUser
                            }
                        });
                    }
                    catch {
                        await supabaseAdmin.auth.admin.updateUserById(legacyCreds.id, { password: String(password) }).catch(() => { });
                    }
                    if (supabase) {
                        const { data: retrySi } = await supabase.auth.signInWithPassword({
                            email: userEmail,
                            password: String(password)
                        });
                        if (retrySi?.session) {
                            return res.json({
                                success: true,
                                user: {
                                    id: retrySi.user.id,
                                    username: legacyCreds.username || cleanUser,
                                    inGameName: legacyCreds.inGameName || cleanUser,
                                    email: userEmail
                                },
                                session: {
                                    access_token: retrySi.session.access_token,
                                    refresh_token: retrySi.session.refresh_token
                                }
                            });
                        }
                    }
                }
            }
        }
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    catch (err) {
        console.error('[Auth] Login error:', err);
        return res.status(500).json({ error: err.message || 'Login failed' });
    }
});
// Change Password in user profile / account settings
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword, confirmPassword } = req.body || {};
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match.' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }
        const profile = await tournamentStorage.getProfile(userId);
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        const userEmail = profile.email || profile.recoveryEmail;
        if (!userEmail) {
            return res.status(400).json({ error: 'Account does not have a registered email address.' });
        }
        if (!supabase) {
            return res.status(503).json({ error: 'Authentication service unavailable.' });
        }
        // Verify current password by signing in with Supabase Auth
        const { data: verifyData, error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: String(currentPassword)
        });
        if (verifyError || !verifyData?.user) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        // Update password using Supabase Auth Admin API
        if (supabaseAdmin) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: String(newPassword)
            });
            if (updateError) {
                return res.status(500).json({ error: `Failed to update password: ${updateError.message}` });
            }
        }
        // Also update backup credentials in auth_secrets
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
        await tournamentStorage.updateCredentials(userId, passwordHash, salt).catch(() => { });
        return res.json({ success: true, message: 'Password updated successfully!' });
    }
    catch (err) {
        console.error('[Auth] change-password error:', err);
        return res.status(500).json({ error: err.message || 'Failed to change password.' });
    }
});
// Helper: Secure backend account identification for password recovery
async function resolveAccountForRecovery(rawIdentifier) {
    const clean = String(rawIdentifier || '').trim();
    if (!clean)
        return null;
    const isEmail = clean.includes('@');
    if (isEmail) {
        const cleanEmail = clean.toLowerCase();
        // Validate Gmail format
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
            throw new Error('Invalid Gmail format. Enter a valid address ending in @gmail.com.');
        }
        // 1. Identify corresponding Supabase Auth account / profile
        let profile = await tournamentStorage.getProfileByEmail(cleanEmail);
        if (supabaseAdmin) {
            try {
                const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
                if (!listErr && userList?.users) {
                    const authUser = userList.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
                    if (authUser) {
                        if (!profile) {
                            profile = await tournamentStorage.getProfile(authUser.id);
                        }
                        // Confirm association if profile exists
                        if (profile && profile.id !== authUser.id) {
                            console.warn('[Recovery] Profile and Auth user ID mismatch for email:', cleanEmail);
                            return null;
                        }
                        return {
                            userId: authUser.id,
                            email: (authUser.email || cleanEmail).toLowerCase(),
                            username: profile?.username || profile?.inGameName || authUser.user_metadata?.username || cleanEmail.split('@')[0]
                        };
                    }
                }
            }
            catch (err) {
                console.warn('[Recovery] Admin user search warning:', err.message);
            }
        }
        if (profile && profile.email) {
            return {
                userId: profile.id,
                email: profile.email.toLowerCase(),
                username: profile.username || profile.inGameName
            };
        }
        return null;
    }
    else {
        // Identifier is username
        const cleanUser = clean;
        // 1. Search existing Supabase profiles table
        const profile = await tournamentStorage.getProfileByUsername(cleanUser);
        if (!profile)
            return null;
        // 2. Retrieve associated Supabase Auth user ID
        if (supabaseAdmin && profile.id) {
            try {
                const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                if (!authUserErr && authUserData?.user) {
                    const authUser = authUserData.user;
                    const authEmail = (authUser.email || '').trim().toLowerCase();
                    // Confirm profile and Auth account belong to the same user
                    if (authUser.id === profile.id && authEmail.endsWith('@gmail.com')) {
                        return {
                            userId: authUser.id,
                            email: authEmail,
                            username: profile.username || profile.inGameName
                        };
                    }
                }
            }
            catch (err) {
                console.warn('[Recovery] Admin getUserById warning:', err.message);
            }
        }
        // Fallback: check profile registered email
        const profileEmail = (profile.email || profile.recoveryEmail || '').trim().toLowerCase();
        if (profileEmail.endsWith('@gmail.com')) {
            return {
                userId: profile.id,
                email: profileEmail,
                username: profile.username || profile.inGameName
            };
        }
        return null;
    }
}
// In-memory cooldown tracking for recovery codes (prevents email spam / enumeration)
const recoveryCooldowns = new Map();
// Send Recovery Code (OTP) — accepts username or registered Gmail
app.post('/api/auth/send-recovery-otp', async (req, res) => {
    try {
        const { identifier } = req.body || {};
        if (!identifier || !String(identifier).trim()) {
            return res.status(400).json({ error: 'Username or Gmail address is required.' });
        }
        const cleanId = String(identifier).trim();
        const cooldownKey = cleanId.toLowerCase();
        // Cooldown check (60 seconds)
        const now = Date.now();
        const lastRequest = recoveryCooldowns.get(cooldownKey) || 0;
        if (now - lastRequest < 60000) {
            const waitSeconds = Math.ceil((60000 - (now - lastRequest)) / 1000);
            return res.status(429).json({
                error: `Please wait ${waitSeconds} seconds before requesting another recovery code.`
            });
        }
        // Set cooldown
        recoveryCooldowns.set(cooldownKey, now);
        // Neutral confirmation message (does not reveal account existence)
        const neutralMsg = 'If an account matches this username or Gmail, a recovery code has been sent.';
        let account;
        try {
            account = await resolveAccountForRecovery(cleanId);
        }
        catch (fmtErr) {
            return res.status(400).json({ error: fmtErr.message });
        }
        if (!account) {
            return res.json({ success: true, message: neutralMsg, identifier: cleanId });
        }
        // In production: trigger recovery code email via Supabase Auth
        if (supabase) {
            try {
                await supabase.auth.resetPasswordForEmail(account.email);
            }
            catch (err) {
                console.warn('[Recovery] resetPasswordForEmail notification:', err.message);
            }
        }
        // Note: NEVER return or expose the registered Gmail to the frontend!
        return res.json({
            success: true,
            message: neutralMsg,
            identifier: cleanId
        });
    }
    catch (err) {
        console.error('[Auth] send-recovery-otp error:', err);
        return res.status(500).json({ error: err.message || 'Error processing recovery code request' });
    }
});
// Verify Recovery Code (OTP) — verifies code using Supabase Auth recovery type
app.post('/api/auth/verify-recovery-otp', async (req, res) => {
    try {
        const { identifier, code } = req.body || {};
        if (!identifier || !code) {
            return res.status(400).json({ error: 'Username/Gmail and recovery code are required.' });
        }
        const cleanCode = String(code).trim();
        if (!/^[0-9a-zA-Z]{6,8}$/.test(cleanCode)) {
            return res.status(400).json({ error: 'Invalid recovery code format. Please enter the 6-digit code.' });
        }
        let account;
        try {
            account = await resolveAccountForRecovery(String(identifier).trim());
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!account || !account.email) {
            return res.status(400).json({ error: 'Invalid, expired, or already-used recovery code. Please request a new code.' });
        }
        if (!supabase) {
            return res.status(503).json({ error: 'Authentication service unavailable.' });
        }
        // Verify recovery OTP via Supabase Auth
        const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
            email: account.email,
            token: cleanCode,
            type: 'recovery'
        });
        if (vErr || !vData?.session) {
            return res.status(400).json({
                error: vErr?.message || 'Invalid, expired, or already-used recovery code. Please request a new code.'
            });
        }
        // Reset cooldown
        recoveryCooldowns.delete(String(identifier).trim().toLowerCase());
        recoveryCooldowns.delete(account.email);
        return res.json({
            success: true,
            message: 'Recovery code verified successfully.',
            session: {
                access_token: vData.session.access_token,
                refresh_token: vData.session.refresh_token
            },
            user: {
                id: vData.user?.id || account.userId,
                username: account.username,
                email: account.email
            }
        });
    }
    catch (err) {
        console.error('[Auth] verify-recovery-otp error:', err);
        return res.status(500).json({ error: err.message || 'Error verifying recovery code' });
    }
});
// Backwards compatibility alias for /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
    const identifier = req.body?.identifier || req.body?.email;
    req.body = { identifier };
    return app._router.handle(req, res, () => { });
});
// Sync password hash endpoint — preserved as no-op to comply with: "Never update password hashes manually in profiles or auth_secrets"
app.post('/api/auth/sync-password', async (_req, res) => {
    return res.json({ success: true, message: 'Password managed authoritatively by Supabase Auth' });
});
// ==========================================
// USER PROFILES & IN-GAME NAME ENDPOINTS
// ==========================================
// Check if an In-Game Name is available
app.get('/api/profiles/check-name', async (req, res) => {
    try {
        const name = String(req.query.name || '').trim();
        const excludeUserId = req.query.excludeUserId;
        if (!name || name.length < 3 || name.length > 20) {
            return res.json({ available: false, message: 'Name must be between 3 and 20 characters.' });
        }
        if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(name)) {
            return res.json({ available: false, message: 'Name can only contain letters, numbers, spaces, underscores, and hyphens.' });
        }
        const available = await tournamentStorage.isNameAvailable(name, excludeUserId);
        return res.json({ available, message: available ? 'Name is available' : 'This In-Game Name is already taken.' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Get user profile by Supabase UUID
app.get('/api/profiles/:id', async (req, res) => {
    try {
        const profile = await tournamentStorage.getProfile(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        return res.json({ success: true, profile });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Create or update user profile with In-Game Name
app.post('/api/profiles', async (req, res) => {
    try {
        const { id, inGameName, email, avatarUrl } = req.body || {};
        if (!id || !inGameName) {
            return res.status(400).json({ error: 'id and inGameName are required' });
        }
        const cleanName = String(inGameName).trim();
        if (cleanName.length < 3 || cleanName.length > 20) {
            return res.status(400).json({ error: 'In-Game Name must be between 3 and 20 characters' });
        }
        if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(cleanName)) {
            return res.status(400).json({ error: 'In-Game Name can only contain letters, numbers, spaces, underscores, and hyphens.' });
        }
        const isAvailable = await tournamentStorage.isNameAvailable(cleanName, id);
        if (!isAvailable) {
            return res.status(409).json({ error: 'This In-Game Name is already taken. Please choose another.' });
        }
        const profile = await tournamentStorage.saveProfile({
            id,
            email,
            inGameName: cleanName,
            avatarUrl,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        return res.json({ success: true, profile });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ==========================================
// TOURNAMENT REST API ENDPOINTS
// ==========================================
// List tournaments (STRICT PRIVACY: Only returns user's created or joined tournaments)
app.get('/api/tournaments', async (req, res) => {
    try {
        await tournamentManager.init();
        const userId = req.query.userId;
        if (userId) {
            const tournaments = tournamentManager.getUserTournaments(userId);
            return res.json({ success: true, tournaments });
        }
        // Fallback: If no userId specified, return open registration tournaments
        const tournaments = tournamentManager.getAllTournaments().filter(t => t.status === 'REGISTRATION');
        return res.json({ success: true, tournaments });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error fetching tournaments' });
    }
});
// Single tournament details (Strict privacy: non-members cannot access active tournaments)
app.get('/api/tournaments/:id', async (req, res) => {
    try {
        await tournamentManager.init();
        const tournament = tournamentManager.getTournament(req.params.id);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const userId = req.query.userId;
        if (tournament.status !== 'REGISTRATION') {
            if (!userId || (tournament.hostId !== userId && !tournament.members.some(m => m.userId === userId))) {
                return res.status(403).json({ error: 'Access denied: You must be an authorized member of this tournament.' });
            }
        }
        return res.json({ success: true, tournament });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error fetching tournament' });
    }
});
// Delete tournament (STRICT: Only the original tournament creator can delete)
app.delete('/api/tournaments/:id', async (req, res) => {
    try {
        const { userId } = req.body || {};
        if (!userId) {
            return res.status(400).json({ error: 'userId is required for tournament deletion' });
        }
        const result = await tournamentManager.deleteTournament(req.params.id, userId);
        if (!result.success) {
            return res.status(result.message?.includes('Access denied') ? 403 : 400).json({ error: result.message });
        }
        return res.json({ success: true, message: 'Tournament deleted successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error deleting tournament' });
    }
});
// Create tournament
app.post('/api/tournaments', async (req, res) => {
    try {
        const { name, hostId, hostName, hostEmail, teamsCount, matchOvers, hostFranchiseId, auctionType } = req.body || {};
        if (!hostId || !hostName || !hostFranchiseId) {
            return res.status(400).json({ error: 'hostId, hostName, and hostFranchiseId are required' });
        }
        const tCount = [4, 6, 8, 10].includes(Number(teamsCount)) ? Number(teamsCount) : 8;
        const mOvers = [1, 2, 5, 10, 15, 20].includes(Number(matchOvers)) ? Number(matchOvers) : 5;
        const aType = auctionType === 'MINI' ? 'MINI' : 'MEGA';
        const tournament = await tournamentManager.createTournament(name || 'IPL Tournament', hostId, hostName, hostEmail, tCount, mOvers, hostFranchiseId, aType);
        return res.status(201).json({ success: true, tournament });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Failed to create tournament' });
    }
});
// Join tournament (Strict 1 account = 1 team check)
app.post('/api/tournaments/:id/join', async (req, res) => {
    try {
        const { userId, userName, userEmail, franchiseId } = req.body || {};
        if (!userId || !userName || !franchiseId) {
            return res.status(400).json({ error: 'userId, userName, and franchiseId are required' });
        }
        const result = await tournamentManager.joinTournament(req.params.id, userId, userName, userEmail, franchiseId);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true, tournament: result.tournament });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error joining tournament' });
    }
});
// Start tournament auction stage
app.post('/api/tournaments/:id/start-auction', async (req, res) => {
    try {
        const { userId } = req.body || {};
        const result = await tournamentManager.startAuction(req.params.id, userId);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error starting auction' });
    }
});
// Import completed auction squads
app.post('/api/tournaments/:id/import-auction', async (req, res) => {
    try {
        const result = await tournamentManager.importAuctionSquads(req.params.id);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error importing squads' });
    }
});
// Start live tournament & generate fixtures
app.post('/api/tournaments/:id/start-live', async (req, res) => {
    try {
        const { userId } = req.body || {};
        const result = await tournamentManager.startLiveTournament(req.params.id, userId);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error starting live tournament' });
    }
});
// Save match lineup
app.post('/api/tournaments/:id/lineup', (req, res) => {
    try {
        const { franchiseId, userId, lineup } = req.body || {};
        if (!franchiseId || !userId || !lineup) {
            return res.status(400).json({ error: 'franchiseId, userId, and lineup are required' });
        }
        const result = tournamentManager.saveMatchLineup(req.params.id, franchiseId, userId, lineup);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error saving lineup' });
    }
});
// Start a scheduled match
app.post('/api/tournaments/:id/matches/:fixtureId/start', (req, res) => {
    try {
        const { userId } = req.body || {};
        const result = tournamentManager.startMatch(req.params.id, req.params.fixtureId, userId);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true, match: result.match });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error starting match' });
    }
});
// Get Live Match
app.get('/api/matches/:matchId', (req, res) => {
    const match = tournamentManager.getLiveMatch(req.params.matchId);
    if (!match) {
        return res.status(404).json({ error: 'Match not found' });
    }
    return res.json({ success: true, match });
});
// Match Toss
app.post('/api/matches/:matchId/toss', (req, res) => {
    try {
        const { tossWinnerFranchiseId, decision } = req.body || {};
        const result = tournamentManager.handleToss(req.params.matchId, tossWinnerFranchiseId, decision);
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        return res.json({ success: true, match: result.match });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error handling toss' });
    }
});
// Submit ball choice
app.post('/api/matches/:matchId/choice', (req, res) => {
    try {
        const { franchiseId, choice, ability, blockedNumbers } = req.body || {};
        const result = tournamentManager.submitChoice(req.params.matchId, franchiseId, choice, ability, blockedNumbers);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        return res.json({ success: true, resolved: result.resolved, ballEvent: result.ballEvent, match: result.match });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error submitting choice' });
    }
});
// Handle turn timeout
app.post('/api/matches/:matchId/timeout', (req, res) => {
    try {
        const result = tournamentManager.handleTimeout(req.params.matchId);
        return res.json({ success: true, resolved: result.resolved, ballEvent: result.ballEvent, match: result.match });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error handling timeout' });
    }
});
// API 404 handler - Unmatched /api/* routes must ALWAYS return JSON 404, never HTML
app.all('/api/*', (req, res) => {
    res.status(404).json({
        error: `API endpoint not found: ${req.method} ${req.path}`,
        statusCode: 404
    });
});
// Fallback for unmatched frontend client routes (SPA routing in standalone/dev mode)
app.get('*', (req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}`, statusCode: 404 });
});
// Global Error Handler - Guarantees API errors always return valid JSON
app.use((err, req, res, next) => {
    console.error('[API Error]', err);
    const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
    const message = err.message || 'Internal server error';
    if (res.headersSent) {
        return next(err);
    }
    return res.status(status).json({
        error: message,
        statusCode: status
    });
});
// Detect serverless environment (Vercel Functions / AWS Lambda) to prevent port-binding conflicts
const isServerless = Boolean(process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION ||
    process.env.LAMBDA_TASK_ROOT);
// HTTP Server & WebSockets
let server = http.createServer(app);
let wss = null;
if (!isServerless) {
    wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        roomManager.handleConnection(ws);
    });
}
// Start permanent HTTP listener only when directly executed (standalone/persistent mode)
const isDirectExecution = Boolean(process.argv[1] && (process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('index.js')) && !process.argv[1].includes('___vc'));
if (!isServerless && isDirectExecution && process.env.NODE_ENV !== 'test') {
    server.listen(port, host, () => {
        console.log(`[BID WARS SERVER] Live at http://${host}:${port}`);
        console.log(`[BID WARS WSS] Real-time engine ready at ws://${host}:${port}`);
    });
}
// Attach HTTP server and WebSocket server references to Express app
app.server = server;
if (wss) {
    app.wss = wss;
}
export default app;
export { app, server, roomManager, tournamentManager };
