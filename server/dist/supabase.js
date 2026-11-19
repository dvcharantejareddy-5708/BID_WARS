"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from both server/.env and root .env
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'server/.env') });
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
exports.supabase = null;
exports.supabaseAdmin = null;
if (supabaseUrl && !supabaseUrl.includes('your-project')) {
    // 1. Standard Anon Client (for public requests and token validation)
    const clientKey = anonKey || serviceRoleKey;
    if (clientKey) {
        try {
            exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, clientKey);
            console.log('[Supabase] Initialized database client successfully');
        }
        catch (err) {
            console.warn('[Supabase] Failed to initialize Supabase client:', err);
        }
    }
    // 2. Admin Client (for direct auth.users creation, bypassing email verification rate limits)
    if (serviceRoleKey && !serviceRoleKey.includes('your-service')) {
        try {
            exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            console.log('[Supabase] Initialized Admin Service Role client successfully');
        }
        catch (err) {
            console.warn('[Supabase] Failed to initialize Admin client:', err);
        }
    }
}
else {
    console.log('[Engine] Running in high-performance server-authoritative in-memory mode (Zero-config ready)');
}
