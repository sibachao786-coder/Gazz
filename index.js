import { Client } from 'discord.js-selfbot-v13';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, StreamType, getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import prism from 'prism-media';
import fs from 'fs';
import path from 'path';
import colors from 'colors';
import readlineSync from 'readline-sync';
import axios from 'axios';

// ================= GIAO DIỆN ASCII & LOG =================
const BANNER = `
██   ██    ███    ██   ██
 ██ ██    █   █    ██ ██
  ███    █  x  █    ███
 ██ ██    █   █    ██ ██
██   ██    ███    ██   ██
`.cyan.bold;

console.clear();
console.log(BANNER);
console.log('='.repeat(50).magenta);
console.log(`-- GAZZ SELF BOT XẢ ĐA TOKEN --`.cyan.bold);
console.log('='.repeat(50).magenta + '\n');

// ================= CẤU HÌNH HỆ THỐNG =================
const TOKENS_FILE = 'tokens.txt';
const MUSIC_DIR = './music';
const MUSIC_DIR_DOWNLOAD = '/sdcard/Download/music';
const SAMPLES_FILE = 'samples.json';
const SAMPLES_URL = 'https://raw.githubusercontent.com/Shinchan0911/self-bot-assets/refs/heads/main/samples.json';

// Tạo thư mục nhạc nếu chưa có
if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
    console.log('[+] Đã Tạo Thư Mục Nhạc Chính: ' + path.resolve(MUSIC_DIR));
} else {
    console.log('[*] Thư Mục Nhạc Chính: ' + path.resolve(MUSIC_DIR));
}
// Tạo thư mục nhạc trong Download nếu chưa có
if (!fs.existsSync(MUSIC_DIR_DOWNLOAD)) {
    try {
        fs.mkdirSync(MUSIC_DIR_DOWNLOAD, { recursive: true });
        console.log('[+] Đã Tạo Thư Mục Nhạc Download: ' + MUSIC_DIR_DOWNLOAD);
    } catch(e) {}
} else {
    console.log('[*] Thư Mục Nhạc Download: ' + MUSIC_DIR_DOWNLOAD);
}
if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, '');

const prefix = ".";
const ownerId = "374742518065266691";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const tokens = fs.readFileSync(TOKENS_FILE, 'utf-8').split('\n').map(t => t.trim()).filter(t => t);

const clients = [];
let readyCount = 0;
let remoteSamples = {};

// ================= HỆ THỐNG FETCH DATA =================
async function loadSamples() {
    console.log(`[*] Đang Tải Dữ Liệu Samples Từ Máy Chủ...`.cyan);
    try {
        const response = await axios.get(SAMPLES_URL);
        let data = response.data;

        if (typeof data === 'string') {
            data = JSON.parse(data.trim());
        }

        remoteSamples = data;
        fs.writeFileSync(SAMPLES_FILE, JSON.stringify(remoteSamples, null, 2));
        console.log(`[+] Đã Tải Và Lưu Cấu Hình Samples!`.green);
    } catch (error) {
        console.log(`[-] Không thể tải samples từ máy chủ:`.red, error.message || error);
        if (fs.existsSync(SAMPLES_FILE)) {
            try {
                remoteSamples = JSON.parse(fs.readFileSync(SAMPLES_FILE, 'utf-8'));
                console.log(`[*] Sử dụng samples local nếu có`.cyan);
            } catch (err) {
                remoteSamples = {};
                console.log(`[-] Không đọc được samples local`.red);
            }
        } else {
            remoteSamples = {};
            console.log(`[-] Không có samples local, remoteSamples để trống`.red);
        }
    }
}

// ================= TRẠNG THÁI & GLOBAL PLAYER =================
let statusState = {
    volume: 100, bass: 0, mid: 0, treble: 0,
    haas: 'Tắt', wider: 'Tắt', routing: 'Stereo (L+R)',
    currentMusic: 'Không Có', voiceChannel: 'Chưa Kết Nối',
    activeSample: 'Không Có', looping: false
};

let globalVolume = 1.0;
let currentHaas = '', currentWider = '', currentRouting = '', currentMusicPath = '';
let startTime = 0;
let activeConnections = [];

const globalPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

globalPlayer.on(AudioPlayerStatus.Idle, () => {
    if (statusState.looping && currentMusicPath) {
        startTime = Date.now(); playAllWithEffects(0);
    }
});

function getMusicList() {
    let list = [];
    if (fs.existsSync(MUSIC_DIR)) {
        list = list.concat(fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3') || f.endsWith('.wav')));
    }
    if (fs.existsSync(MUSIC_DIR_DOWNLOAD)) {
        const dlList = fs.readdirSync(MUSIC_DIR_DOWNLOAD).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
        dlList.forEach(f => { if (!list.includes(f)) list.push(f); });
    }
    return list;
}

function getMusicPath(filename) {
    const p1 = path.join(MUSIC_DIR, filename);
    const p2 = path.join(MUSIC_DIR_DOWNLOAD, filename);
    if (fs.existsSync(p1)) return p1;
    if (fs.existsSync(p2)) return p2;
    return p1;
}

function playAllWithEffects(seekTime = 0) {
    if (!currentMusicPath || activeConnections.length === 0) return;

    try {
        const ffmpegArgs = [
            '-ss', seekTime.toString(),
            '-i', currentMusicPath,
            '-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'
        ];

        let filters = [];
        if (currentRouting) filters.push(currentRouting);
        if (statusState.bass !== 0) filters.push(`bass=g=${statusState.bass}`);
        if (statusState.mid !== 0) filters.push(`equalizer=f=1000:width_type=h:width=200:g=${statusState.mid}`);
        if (statusState.treble !== 0) filters.push(`treble=g=${statusState.treble}`);
        if (currentHaas) filters.push(currentHaas);
        if (currentWider) filters.push(currentWider);

        if (filters.length > 0) ffmpegArgs.push('-af', filters.join(','));

        const ffmpegStream = new prism.FFmpeg({ args: ffmpegArgs });
        const resource = createAudioResource(ffmpegStream, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(globalVolume);

        globalPlayer.play(resource);

        activeConnections.forEach(({ connection }) => {
            if (connection.state.status !== 'destroyed') {
                connection.subscribe(globalPlayer);
            }
        });
    } catch (err) { console.error(`[-] Lỗi FFmpeg:`.red, err.message); }
}

// ================= KHỞI TẠO =================
async function startTokens() {
    console.log(`[+] Đã Bỏ Qua Bước Kiểm Tra Key!`.green.bold);
    console.log(`[+] ID Quản Trị Được Thiết Lập: ${ownerId.cyan.bold}\n`);

    await loadSamples();

    console.log(`\n[*] Đang Khởi Tạo ${tokens.length} Tài Khoản...`.cyan);
    console.log('-'.repeat(50).gray);

    for (let i = 0; i < tokens.length; i++) {
        const client = new Client({ checkUpdate: false });
        clients.push(client);

        client.on('ready', () => {
            readyCount++;
            console.log(`[+] [${readyCount}/${tokens.length}] Online: ${client.user.username}`.green);
            if (readyCount === tokens.length) {
                console.log('='.repeat(50).magenta);
                console.log(`[SYSTEM] Hệ Thống Đã Trực Tuyến - Prefix: "${prefix}"`.cyan.bold);
                console.log('='.repeat(50).magenta);
            }
        });

        if (i === 0) {
            client.on('messageCreate', async (message) => {
                if (message.author.id !== ownerId) return;
                if (!message.content.startsWith(prefix)) return;

                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();

                if (command === 'help') {
                    const h = `> 🎧 **Bảng Điều Khiển Bot** (Prefix: \`${prefix}\`)\n` +
                              `>\n` +
                              `> 🔌 **Kết Nối Hệ Thống**\n` +
                              `> ├ \`${prefix}join <ID phòng>\` ── Đưa Dàn Clone Vào Phòng Thoại\n` +
                              `> ├ \`${prefix}leave\` ── Cho Toàn Bộ Clone Rời Phòng\n` +
                              `> └ \`${prefix}stop\` ── Tạm Dừng Luồng Phát Âm Thanh\n` +
                              `>\n` +
                              `> 🎵 **Điều Khiển Nhạc**\n` +
                              `> ├ \`${prefix}listnhac <trang>\` ── Xem Danh Sách Bài Nhạc\n` +
                              `> ├ \`${prefix}xa <Số ID>\` ── Phát Bài Nhạc Chọn Theo Số Thứ Tự\n` +
                              `> └ \`${prefix}loop\` ── Bật / Tắt Phát Lặp Lại Bài Hiện Tại\n` +
                              `>\n` +
                              `> 🎛️ **Hiệu Ứng Âm Thanh (DSP)**\n` +
                              `> ├ \`${prefix}vol <0-100>\` ── Chỉnh Âm Lượng Tổng (%)\n` +
                              `> ├ \`${prefix}eq <dải> <dB>\` ── Chỉnh Bass / Mid / Treble (\`clear\` Để Hủy)\n` +
                              `> ├ \`${prefix}haas <l/r> <ms>\` ── Trễ Âm Vòm Trái/Phải (Tối Đa 19ms)\n` +
                              `> ├ \`${prefix}wider <0-80>\` ── Mở Rộng Không Gian Stereo (Càng Cao Càng Rộng)\n` +
                              `> └ \`${prefix}route <kiểu>\` ── Định Tuyến Kênh (\`duall\` / \`dualr\` / \`mono\`)\n` +
                              `>\n` +
                              `> ⚙️ **Hệ Thống & Preset**\n` +
                              `> ├ \`${prefix}stats\` ── Kiểm Tra Thông Số Âm Thanh Hiện Tại\n` +
                              `> ├ \`${prefix}sample <tên>\` ── Tải Bộ Lọc Âm Sẵn (\`none\` = Tắt)\n` +
                              ` └ \`${prefix}reload\` ── Cập Nhật Dữ Liệu Từ Máy Chủ`;
                    message.reply(h).catch(() => {});
                }

                if (command === 'stats') {
                    let s = '```md\n# Thông Số Âm Thanh Hiện Tại\n' +
                            '* Âm Lượng : ' + statusState.volume + '% \n' +
                            '* Bass     : ' + statusState.bass + ' dB\n' +
                            '* Mid      : ' + statusState.mid + ' dB\n' +
                            '* Treble   : ' + statusState.treble + ' dB\n' +
                            '* Haas     : ' + statusState.haas + '\n' +
                            '* Wider    : ' + statusState.wider + '\n' +
                            '* Routing  : ' + statusState.routing + '\n' +
                            '* Lặp Nhạc : ' + (statusState.looping ? 'Đang Bật' : 'Tắt') + '\n' +
                            '* Sample   : ' + statusState.activeSample + '\n' +
                            '* Bài Nhạc : ' + statusState.currentMusic + '\n' +
                            '-------------------------------\`\`\`';
                    message.reply(s).catch(() => {});
                }

                if (command === 'join') {
                    const vId = args[0]; if (!vId) return;
                    message.reply(`[*] Đang Tiến Hành Kết Nối Token Vào Kênh: \`${vId}\``);
                    activeConnections = []; statusState.voiceChannel = vId;
                    for (let j = 0; j < clients.length; j++) {
                        const c = clients[j]; if (!c.isReady()) continue;
                        const channel = await c.channels.fetch(vId).catch(() => null);
                        if (channel) {
                            let conn = getVoiceConnection(channel.guild.id, c.user.id);
                            if (!conn) {
                                conn = joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator, group: c.user.id });
                                await delay(800);
                            }
                            conn.subscribe(globalPlayer);
                            activeConnections.push({ client: c, connection: conn, guildId: channel.guild.id });
                        }
                    }
                    message.reply('✅ Đã Kết Nối Đủ Tất Cả Tài Khoản Vào Kênh');
                }

                if (command === 'listnhac') {
                    const music = getMusicList();
                    const page = parseInt(args[0]) || 1;
                    const perPage = 10;
                    const totalPages = Math.ceil(music.length / perPage);
                    
                    if (page < 1 || page > totalPages) {
                        return message.reply(`[!] Trang không hợp lệ. Có ${totalPages} trang`);
                    }

                    const start = (page - 1) * perPage;
                    const end = start + perPage;
                    const pageMusic = music.slice(start, end);

                    let list = `\`\`\`md\n# Danh Sách Bài Nhạc [Trang ${page}/${totalPages}]\n`;
                    list += `============================================\n\n`;
                    pageMusic.forEach((m, idx) => {
                        list += `${start + idx + 1}. ${m}\n`;
                    });
                    list += `\n============================================\n`;
                    list += `Tổng: ${music.length} bài | Sử dụng: .xa <số>\n\`\`\``;

                    message.reply(list).catch(() => {});
                }

                if (command === 'xa') {
                    const mId = parseInt(args[0]); const music = getMusicList();
                    if (activeConnections.length === 0) return message.reply('[!] Yêu Cầu Sử Dụng Lệnh `.join` Trước');
                    if (!music[mId - 1]) return message.reply('[!] Không Tìm Thấy Số Thứ Tự Bài Nhạc Này');
                    currentMusicPath = getMusicPath(music[mId - 1]);
                    statusState.currentMusic = music[mId - 1];
                    startTime = Date.now(); playAllWithEffects(0);
                    message.reply(`✅ Đang Tiến Hành Phát Bài: **${music[mId - 1]}**`);
                }

                if (command === 'loop') {
                    statusState.looping = !statusState.looping;
                    message.reply(`🔁 Phát Lặp Lại Bài Hát: **${statusState.looping ? 'BẬT' : 'TẮT'}**`);
                }

                if (command === 'eq') {
                    const mode = args[0]?.toLowerCase();
                    const val = parseFloat(args[1]);
                    if (mode === 'clear') {
                        statusState.bass = 0; statusState.mid = 0; statusState.treble = 0; statusState.activeSample = "Tự Chỉnh";
                    } else if (['bass', 'mid', 'treble'].includes(mode) && !isNaN(val)) {
                        statusState[mode] = val; statusState.activeSample = "Tự Chỉnh";
                    } else return;
                    playAllWithEffects((Date.now() - startTime) / 1000);
                    message.reply(`🎸 Bộ Lọc EQ: **${mode.toUpperCase()}** Chỉnh Về **${val || 0}dB**`);
                }

                if (command === 'haas') {
                    const side = args[0]?.toLowerCase();
                    const ms = parseFloat(args[1]);
                    if (args[0] === '0' || isNaN(ms)) { currentHaas = ''; statusState.haas = 'Tắt'; }
                    else {
                        if (ms > 19) return message.reply('[!] Độ Trễ Haas Tối Đa Là 19ms');
                        currentHaas = (side === 'l' || side === 'left') ? `adelay=${ms}ms|0` : `adelay=0|${ms}ms`;
                        statusState.haas = `${side.toUpperCase()} ${ms}ms`;
                    }
                    statusState.activeSample = "Tự Chỉnh";
                    playAllWithEffects((Date.now() - startTime) / 1000);
                    message.reply(`🎧 Độ Trễ Vòm Haas: **${statusState.haas}**`);
                }

                if (command === 'wider') {
                    const p = parseFloat(args[0]);
                    if (p > 80) return message.reply('[!] Độ Mở Rộng Không Gian Stereo Tối Đa Là 80%');
                    if (isNaN(p) || p === 0) { currentWider = ''; statusState.wider = 'Tắt'; }
                    else {
                        const val = Math.min(p / 100, 0.8);
                        currentWider = `stereowiden=crossfeed=${val}:feedback=${val * 0.5}:delay=20`;
                        statusState.wider = `${p}%`;
                    }
                    statusState.activeSample = "Tự Chỉnh";
                    playAllWithEffects((Date.now() - startTime) / 1000);
                    message.reply(`🌌 Độ Rộng Stereo: **${statusState.wider}**`);
                }

                if (command === 'route') {
                    const mode = args[0]?.toLowerCase();
                    if (mode === 'duall') currentRouting = 'pan=stereo|c0=c0|c1=c0';
                    else if (mode === 'dualr') currentRouting = 'pan=stereo|c0=c1|c1=c1';
                    else if (mode === 'mono') currentRouting = 'pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1';
                    else currentRouting = '';
                    statusState.routing = mode || 'Stereo';
                    statusState.activeSample = "Tự Chỉnh";
                    playAllWithEffects((Date.now() - startTime) / 1000);
                    message.reply(`🔀 Định Tuyến Loa: **${statusState.routing.toUpperCase()}**`);
                }

                if (command === 'vol') {
                    const v = parseInt(args[0]); if (isNaN(v)) return;
                    globalVolume = v / 100; statusState.volume = v;
                    if (globalPlayer.state.status === AudioPlayerStatus.Playing && globalPlayer.state.resource) {
                        globalPlayer.state.resource.volume.setVolume(globalVolume);
                    }
                    message.reply(`🔊 Âm Lượng Hệ Thống: **${v}%**`);
                }

                if (command === 'sample') {
                    const sName = args[0];
                    const availableSamples = Object.keys(remoteSamples);

                    if (sName === 'none') {
                        statusState.bass = 0; statusState.mid = 0; statusState.treble = 0;
                        currentHaas = ''; statusState.haas = 'Tắt';
                        currentWider = ''; statusState.wider = 'Tắt';
                        currentRouting = ''; statusState.routing = 'Stereo (L+R)';
                        statusState.activeSample = 'Mặc Định (None)';

                        playAllWithEffects((Date.now() - startTime) / 1000);
                        return message.reply('♻️ **Đã Tắt Toàn Bộ Hiệu Ứng Lọc Âm Để Về Mặc Định**');
                    }

                    if (!sName || !availableSamples.includes(sName)) {
                        return message.reply(`🧪 **Preset Đang Có:** none, ${availableSamples.join(', ')}`);
                    }

                    const s = remoteSamples[sName];
                    let logChanges = [];

                    statusState.bass = s.bass ?? 0;
                    statusState.mid = s.mid ?? 0;
                    statusState.treble = s.treble ?? 0;
                    if (s.bass !== undefined || s.mid !== undefined || s.treble !== undefined) {
                        logChanges.push(`🎸 EQ [B:${statusState.bass} M:${statusState.mid} T:${statusState.treble}]`);
                    }

                    if (s.route) {
                        const mode = s.route.toLowerCase();
                        if (mode === 'duall') currentRouting = 'pan=stereo|c0=c0|c1=c0';
                        else if (mode === 'dualr') currentRouting = 'pan=stereo|c0=c1|c1=c1';
                        else if (mode === 'mono') currentRouting = 'pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1';
                        else currentRouting = '';
                        statusState.routing = s.route.toUpperCase();
                        logChanges.push(`🔀 Định Tuyến [${statusState.routing}]`);
                    } else {
                        currentRouting = '';
                        statusState.routing = 'Stereo (L+R)';
                    }

                    if (s.haas_ms) {
                        const ms = Math.min(s.haas_ms, 19);
                        const side = (s.haas_side === 'l' || s.haas_side === 'left') ? 'L' : 'R';
                        currentHaas = (side === 'L') ? `adelay=${ms}ms|0` : `adelay=0|${ms}ms`;
                        statusState.haas = `${side} ${ms}ms`;
                        logChanges.push(`🎧 Haas [${statusState.haas}]`);
                    } else {
                        currentHaas = '';
                        statusState.haas = 'Tắt';
                    }

                    if (s.wider) {
                        const val = Math.min(s.wider / 100, 0.8);
                        currentWider = `stereowiden=crossfeed=${val}:feedback=${val * 0.5}:delay=20`;
                        statusState.wider = `${s.wider}%`;
                        logChanges.push(`🌌 Loa Rộng [${statusState.wider}]`);
                    } else {
                        currentWider = '';
                        statusState.wider = 'Tắt';
                    }

                    statusState.activeSample = sName;
                    playAllWithEffects((Date.now() - startTime) / 1000);

                    let responseMsg = `✅ **Kích Hoạt Mẫu Âm: ${sName}**\n\`\`\`fix\n`;
                    responseMsg += logChanges.length > 0 ? logChanges.join('\n') : 'Không Có Thay Đổi';
                    responseMsg += `\`\`\``;

                    message.reply(responseMsg);
                }

                if (command === 'reload') {
                    await loadSamples();
                    message.reply(`✅ Cập Nhật Thành Công Các Bộ Mẫu Âm Thanh Từ Máy Chủ`);
                }

                if (command === 'stop') {
                    globalPlayer.stop();
                    message.reply('⏹️ Đã Dừng Luồng Phát Âm Thanh');
                }

                if (command === 'leave') {
                    activeConnections.forEach(conn => { try { getVoiceConnection(conn.guildId, conn.client.user.id)?.destroy(); } catch (e) {} });
                    activeConnections = [];
                    globalPlayer.stop();
                    message.reply('🚪 Toàn Bộ Tài Khoản Đã Rời Phòng');
                }
            });
        }

        client.login(tokens[i]).catch(err => {
            console.log(`[-] Lỗi Đăng Nhập Tài Khoản ${i + 1}:`.red, err.message);
        });
    }
}

startTokens();
