import * as THREE from 'three';
import { Peer } from 'peerjs';
import { buildMicroKart } from '../scene/MicroKartBuilder.js';

const PLAYER_PALETTE = [
  { name: 'CYAN', hex: '#00f0ff', num: 0x00f0ff },
  { name: 'PINK', hex: '#ff2a85', num: 0xff2a85 },
  { name: 'GOLD', hex: '#ffca28', num: 0xffca28 },
  { name: 'LIME', hex: '#00e676', num: 0x00e676 },
  { name: 'VIOLET', hex: '#b388ff', num: 0xb388ff },
  { name: 'ORANGE', hex: '#ff6e40', num: 0xff6e40 },
];

/**
 * Creates a floating CanvasTexture nametag / role sprite for a remote friend's kart.
 */
function createPlayerTagSprite(label, colorHex = '#00f0ff', role = 'free') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const drawTag = (nameText, colHex, roleStr) => {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(8, 14, 26, 0.82)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 14);
    ctx.fill();

    const borderCol =
      roleStr === 'seeker'
        ? '#ff3b30'
        : roleStr === 'hider'
          ? '#00e676'
          : roleStr === 'caught'
            ? '#8e9aaf'
            : colHex;
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    const badgePrefix =
      roleStr === 'seeker'
        ? '🚨 POLICE · '
        : roleStr === 'hider'
          ? '🕵️ CHOR · '
          : roleStr === 'caught'
            ? '🔒 CAUGHT · '
            : '';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${badgePrefix}${nameText}`.slice(0, 18), 128, 33);
  };

  drawTag(label, colorHex, role);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.32, 0.08, 1.0);
  sprite.position.set(0, 0.055, 0);
  sprite.userData.updateTag = (newName, newCol, newRole) => {
    drawTag(newName, newCol, newRole);
    tex.needsUpdate = true;
  };
  return sprite;
}

/**
 * Shortest signed angular difference between two angles in radians.
 */
function shortestAngleDelta(fromRad, toRad) {
  let diff = ((toRad - fromRad + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Friends-Only Multiplayer Manager (2 to 6 Players via 4-Digit Room Code)
 * - Uses PeerJS WebRTC DataChannels + BroadcastChannel same-device multi-tab bridge
 * - Sends compact numeric arrays [x, y, z, rotY] at 60ms intervals (16.6 Hz)
 * - Smoothly interpolates (lerp) remote karts inside requestAnimationFrame at 60 FPS
 * - Supports 3 Modes:
 *   1. 'freeroam'  — Giant House Open World Free Roam
 *   2. 'track'     — Neon Coaster Track Racing
 *   3. 'hideseek'  — Hide & Seek ("Chor-Police" Mode) with 20s head start, blindfold, and collision tagging
 */
export function createFriendsMultiplayerManager({
  scene,
  onModeSync,
  onStatusUpdate,
  onHideSeekUpdate,
}) {
  const remoteKartsGroup = new THREE.Group();
  remoteKartsGroup.name = 'MultiplayerRemoteKartsGroup';
  scene.add(remoteKartsGroup);

  let peer = null;
  let bcastChannel = null;
  let isHost = false;
  let roomCode = '';
  let maxPlayers = 4;
  let mpGameMode = 'freeroam'; // 'freeroam' | 'track' | 'hideseek'
  let localPlayerId = `p_${Math.random().toString(36).slice(2, 8)}`;
  let localPlayerName = 'PLAYER 1';
  let localColorIdx = 0;

  // Map of playerId -> { id, name, colorIdx, colorHex, role, caught, conn, kart, tagSprite, targetPos, currentPos, targetYaw, currentYaw, speed, lastSeen }
  const players = new Map();

  // Hide & Seek ("Chor-Police") state
  const hideSeek = {
    active: false,
    phase: 'lobby', // 'lobby' | 'hiding' | 'seeking' | 'ended'
    timer: 0.0,
    hidingDuration: 20.0,
    seekingDuration: 120.0,
    winnerText: '',
    localRole: 'free', // 'free' | 'seeker' | 'hider' | 'caught'
    caughtCount: 0,
    totalHiders: 0,
  };

  let lastNetworkSendMs = 0;
  const NETWORK_SEND_INTERVAL_MS = 60; // 60ms compact array [x, y, z, rotY] broadcast

  function getRemainingHidersCount() {
    if (!hideSeek.active) return 0;
    let count = hideSeek.localRole === 'hider' ? 1 : 0;
    for (const p of players.values()) {
      if (p.role === 'hider') count += 1;
    }
    return Math.max(0, count);
  }

  function getPlayersSummaryList() {
    const list = [];
    if (roomCode) {
      const pal = PLAYER_PALETTE[localColorIdx % PLAYER_PALETTE.length];
      list.push({
        id: localPlayerId,
        name: localPlayerName,
        color: pal.hex,
        colorHex: pal.hex,
        role: hideSeek.localRole,
        caught: hideSeek.localRole === 'caught',
        isSelf: true,
        isLocal: true,
        isHost,
      });
    }
    for (const p of players.values()) {
      list.push({
        id: p.id,
        name: p.name,
        color: p.colorHex,
        colorHex: p.colorHex,
        role: p.role || 'free',
        caught: p.role === 'caught',
        isSelf: false,
        isLocal: false,
        isHost: Boolean(p.isHost),
      });
    }
    return list;
  }

  function isSeekerBlindfolded() {
    return Boolean(
      hideSeek.active &&
        hideSeek.phase === 'hiding' &&
        hideSeek.localRole === 'seeker'
    );
  }

  function buildState(message = '', isError = false) {
    const isActive = Boolean(roomCode);
    const remHiders = getRemainingHidersCount();
    const hideSeekPhase = hideSeek.active ? hideSeek.phase : 'idle';
    let statusText = '';
    if (hideSeek.active) {
      if (hideSeek.phase === 'hiding') {
        statusText =
          hideSeek.localRole === 'seeker'
            ? 'BLINDFOLDED — WAIT FOR CHOR TO HIDE'
            : 'HIDE QUICKLY IN ANY ROOM!';
      } else if (hideSeek.phase === 'seeking') {
        statusText = `${remHiders} CHOR (HIDER${remHiders === 1 ? '' : 'S'}) LEFT`;
      } else if (hideSeek.phase === 'ended') {
        statusText = hideSeek.winnerText || 'ROUND ENDED!';
      }
    }

    return {
      isActive,
      connected: isActive,
      isHost,
      roomCode,
      maxPlayers,
      mpMode: mpGameMode,
      mpGameMode,
      localPlayerId,
      localPlayerName,
      playerCount: players.size + (isActive ? 1 : 0),
      players: getPlayersSummaryList(),
      playersList: getPlayersSummaryList(),
      hideSeekPhase,
      isBlindfolded: isSeekerBlindfolded(),
      hideSeekTimer: hideSeek.timer,
      myRole: hideSeek.localRole,
      remainingHiders: remHiders,
      RemainingHiders: remHiders,
      statusText,
      message,
      isError,
      hideSeek: { ...hideSeek },
    };
  }

  function notifyStatus(message = '', isError = false) {
    const st = buildState(message, isError);
    if (onStatusUpdate) {
      onStatusUpdate(st);
    }
    if (onHideSeekUpdate) {
      onHideSeekUpdate(st);
    }
  }

  function notifyHideSeek() {
    if (onHideSeekUpdate) {
      onHideSeekUpdate(buildState());
    }
  }

  function setPlayerName(name) {
    const clean = String(name || '')
      .trim()
      .toUpperCase()
      .slice(0, 12);
    if (clean) {
      localPlayerName = clean;
    }
  }

  function worldModeForMpMode(modeStr) {
    return modeStr === 'race' || modeStr === 'track' ? 'track' : 'house';
  }

  function ensureRemotePlayerKart(playerId, name, colorIdx = 1, role = 'free') {
    let p = players.get(playerId);
    const pal = PLAYER_PALETTE[colorIdx % PLAYER_PALETTE.length];
    if (!p) {
      const kart = buildMicroKart();
      // Tint remote kart body & helmet accent so friends are visually distinct
      kart.kartRoot.traverse((child) => {
        if (child.isMesh && child.material && child.material.color) {
          const matName = (child.material.name || '').toLowerCase();
          if (matName.includes('body') || child.material.color.r > 0.7) {
            child.material = child.material.clone();
            child.material.color.setHex(pal.num);
          }
        }
      });

      const scale = mpGameMode === 'track' || mpGameMode === 'race' ? 0.38 : 3.6;
      kart.kartRoot.scale.setScalar(scale);

      const tagSprite = createPlayerTagSprite(name || 'FRIEND', pal.hex, role);
      kart.kartRoot.add(tagSprite);
      remoteKartsGroup.add(kart.kartRoot);

      p = {
        id: playerId,
        name: name || 'FRIEND',
        colorIdx,
        colorHex: pal.hex,
        role,
        isHost: false,
        conn: null,
        kart,
        tagSprite,
        targetPos: new THREE.Vector3(-0.65, 0.001, 0.0),
        currentPos: new THREE.Vector3(-0.65, 0.001, 0.0),
        targetYaw: 0.0,
        currentYaw: 0.0,
        speed: 0.0,
        lastSeen: performance.now(),
      };
      players.set(playerId, p);
    } else {
      p.name = name || p.name;
      p.colorIdx = colorIdx;
      p.colorHex = pal.hex;
      p.role = role || p.role;
      if (p.tagSprite && p.tagSprite.userData.updateTag) {
        p.tagSprite.userData.updateTag(p.name, p.colorHex, p.role);
      }
    }
    return p;
  }

  function removeRemotePlayer(playerId) {
    const p = players.get(playerId);
    if (!p) return;
    if (p.kart && p.kart.kartRoot) {
      remoteKartsGroup.remove(p.kart.kartRoot);
    }
    players.delete(playerId);
    notifyStatus(`${p.name} left the room.`);
  }

  function clearAllRemotePlayers() {
    for (const id of Array.from(players.keys())) {
      const p = players.get(id);
      if (p && p.kart && p.kart.kartRoot) {
        remoteKartsGroup.remove(p.kart.kartRoot);
      }
      players.delete(id);
    }
  }

  function sendPacketToAll(packet) {
    for (const p of players.values()) {
      if (p.conn && p.conn.open) {
        try {
          p.conn.send(packet);
        } catch (_e) {
          // Ignore transient data channel buffer warnings
        }
      }
    }
    if (bcastChannel) {
      try {
        bcastChannel.postMessage({ ...packet, _from: localPlayerId });
      } catch (_e) {
        // Ignore broadcast channel errors
      }
    }
  }

  function handleIncomingPacket(packet, sourceConn = null) {
    if (!packet || typeof packet !== 'object') return;

    // 1. Compact high-frequency pose packet: { p: [x, y, z, rotY], i: playerId }
    if (Array.isArray(packet.p) && packet.p.length >= 4 && packet.i) {
      if (packet.i === localPlayerId) return;
      const isNew = !players.has(packet.i);
      const p =
        players.get(packet.i) ||
        ensureRemotePlayerKart(packet.i, packet.n || 'FRIEND', packet.c || 1, 'free');
      if (sourceConn && !p.conn) p.conn = sourceConn;

      const [nx, ny, nz, nYaw] = packet.p;
      if (
        Number.isFinite(nx) &&
        Number.isFinite(ny) &&
        Number.isFinite(nz) &&
        Number.isFinite(nYaw)
      ) {
        const distSq = p.currentPos.distanceToSquared(p.targetPos);
        p.targetPos.set(nx, ny, nz);
        if (distSq > 12.0 || isNew) {
          p.currentPos.copy(p.targetPos);
        }
        p.targetYaw = nYaw;
        p.lastSeen = performance.now();
      }

      if (isNew) {
        notifyStatus(`${p.name} connected!`);
      }

      // If Host, relay compact pose to other connected peers in the room
      if (isHost) {
        for (const other of players.values()) {
          if (other.id !== packet.i && other.conn && other.conn.open) {
            try {
              other.conn.send(packet);
            } catch (_e) {
              // Ignore relay error
            }
          }
        }
      }
      return;
    }

    // 2. Join Request (Client -> Host)
    if (packet.t === 'join_req') {
      if (!isHost) return;
      const totalCurrent = players.size + 1;
      if (totalCurrent >= maxPlayers && !players.has(packet.id)) {
        if (sourceConn && sourceConn.open) {
          sourceConn.send({
            t: 'join_reject',
            reason: `Room ${roomCode} is full (${maxPlayers}/${maxPlayers})`,
          });
        }
        return;
      }
      const assignedColor = (players.size + 1) % PLAYER_PALETTE.length;
      const rp = ensureRemotePlayerKart(packet.id, packet.name, assignedColor, 'free');
      if (sourceConn) rp.conn = sourceConn;

      broadcastRoomRoster();
      notifyStatus(`${rp.name} joined Room ${roomCode}!`);
      return;
    }

    // 3. Room Roster & Mode Sync (Host -> Clients)
    if (packet.t === 'roster_sync') {
      if (isHost) return;
      maxPlayers = packet.maxPlayers || maxPlayers;
      if (packet.mpGameMode && packet.mpGameMode !== mpGameMode) {
        mpGameMode = packet.mpGameMode;
        syncRemoteKartScales();
        if (onModeSync) onModeSync(worldModeForMpMode(mpGameMode), mpGameMode);
      }
      if (Array.isArray(packet.roster)) {
        const activeIds = new Set();
        for (const item of packet.roster) {
          if (item.id === localPlayerId) {
            localColorIdx = item.colorIdx ?? localColorIdx;
            hideSeek.localRole = item.role || hideSeek.localRole;
          } else {
            activeIds.add(item.id);
            const rp = ensureRemotePlayerKart(
              item.id,
              item.name,
              item.colorIdx,
              item.role || 'free'
            );
            rp.isHost = Boolean(item.isHost);
          }
        }
        for (const existingId of Array.from(players.keys())) {
          if (!activeIds.has(existingId)) {
            removeRemotePlayer(existingId);
          }
        }
      }
      notifyStatus(`Synced with Room ${roomCode} (${players.size + 1}/${maxPlayers} players)`);
      return;
    }

    // 4. Hide & Seek ("Chor-Police") State Broadcast
    if (packet.t === 'hideseek_state') {
      hideSeek.active = Boolean(packet.active);
      hideSeek.phase = packet.phase || 'lobby';
      hideSeek.timer = packet.timer ?? 0;
      hideSeek.winnerText = packet.winnerText || '';
      hideSeek.caughtCount = packet.caughtCount || 0;
      hideSeek.totalHiders = packet.totalHiders || 0;

      if (packet.roles && typeof packet.roles === 'object') {
        if (packet.roles[localPlayerId]) {
          hideSeek.localRole = packet.roles[localPlayerId];
        }
        for (const [pid, rRole] of Object.entries(packet.roles)) {
          const rp = players.get(pid);
          if (rp) {
            rp.role = rRole;
            if (rp.tagSprite && rp.tagSprite.userData.updateTag) {
              rp.tagSprite.userData.updateTag(rp.name, rp.colorHex, rp.role);
            }
          }
        }
      }
      if (hideSeek.active && onModeSync) {
        onModeSync('house', 'hideseek');
      }
      notifyStatus(packet.msg || 'Hide & Seek updated');
      return;
    }

    // 5. Tag Event (Seeker caught a Hider)
    if (packet.t === 'hideseek_tag') {
      if (isHost && hideSeek.active && hideSeek.phase === 'seeking') {
        markHiderCaught(packet.hiderId, packet.seekerName);
      }
    }
  }

  function broadcastRoomRoster() {
    if (!isHost) return;
    const roster = [
      {
        id: localPlayerId,
        name: localPlayerName,
        colorIdx: localColorIdx,
        role: hideSeek.localRole,
        isHost: true,
      },
    ];
    for (const p of players.values()) {
      roster.push({
        id: p.id,
        name: p.name,
        colorIdx: p.colorIdx,
        role: p.role,
        isHost: false,
      });
    }
    sendPacketToAll({
      t: 'roster_sync',
      roomCode,
      maxPlayers,
      mpGameMode,
      roster,
    });
  }

  function syncRemoteKartScales() {
    const targetScale = mpGameMode === 'track' || mpGameMode === 'race' ? 0.38 : 3.6;
    for (const p of players.values()) {
      if (p.kart && p.kart.kartRoot) {
        p.kart.kartRoot.scale.setScalar(targetScale);
      }
    }
  }

  function setupBroadcastChannelBridge(code) {
    if (bcastChannel) {
      bcastChannel.close();
      bcastChannel = null;
    }
    if (typeof BroadcastChannel !== 'undefined') {
      bcastChannel = new BroadcastChannel(`deskracer_mp_room_${code}`);
      bcastChannel.onmessage = (ev) => {
        const data = ev.data;
        if (!data || data._from === localPlayerId) return;
        handleIncomingPacket(data, null);
      };
    }
  }

  /**
   * Host creates a Friends-Only Room with a 4-digit Room Code, maxPlayers (2..6), and mode.
   */
  async function hostRoom(opts = {}) {
    disconnectRoom();
    isHost = true;
    if (opts.playerName) {
      setPlayerName(opts.playerName);
    }
    const requestedMax = opts.maxPlayers ?? opts.maxCount ?? 4;
    maxPlayers = THREE.MathUtils.clamp(Number(requestedMax) || 4, 2, 6);
    mpGameMode = opts.mpMode || opts.mode || 'freeroam';
    localColorIdx = 0;
    roomCode =
      opts.customCode && /^\d{4}$/.test(opts.customCode)
        ? opts.customCode
        : String(Math.floor(1000 + Math.random() * 9000));

    setupBroadcastChannelBridge(roomCode);
    if (onModeSync) onModeSync(worldModeForMpMode(mpGameMode), mpGameMode);

    if (mpGameMode === 'hideseek') {
      startHideAndSeekRound();
    } else {
      hideSeek.active = false;
      hideSeek.phase = 'lobby';
      hideSeek.localRole = 'free';
      notifyHideSeek();
    }

    const peerId = `deskracer-room-${roomCode}`;
    try {
      peer = new Peer(peerId);
      peer.on('open', () => {
        notifyStatus(`ROOM ${roomCode} CREATED • SHARE CODE WITH FRIENDS`);
      });
      peer.on('connection', (conn) => {
        conn.on('data', (data) => handleIncomingPacket(data, conn));
        conn.on('close', () => {
          for (const [pid, p] of players.entries()) {
            if (p.conn === conn) {
              removeRemotePlayer(pid);
              broadcastRoomRoster();
              break;
            }
          }
        });
      });
      peer.on('error', (err) => {
        console.warn('PeerJS Host notice:', err);
        notifyStatus(`ROOM ${roomCode} ACTIVE (LOCAL / P2P READY)`);
      });
    } catch (_err) {
      notifyStatus(`ROOM ${roomCode} ACTIVE`);
    }

    notifyStatus(`CREATE ROOM ${roomCode} (${maxPlayers} PLAYERS MAX)`);
    return { ok: true, code: roomCode };
  }

  /**
   * Friend joins an existing Room using a 4-digit Room Code.
   */
  async function joinRoom(codeOrOpts) {
    const rawCode =
      typeof codeOrOpts === 'string' || typeof codeOrOpts === 'number'
        ? String(codeOrOpts)
        : codeOrOpts?.code || '';
    if (typeof codeOrOpts === 'object' && codeOrOpts?.playerName) {
      setPlayerName(codeOrOpts.playerName);
    }
    const cleanCode = String(rawCode || '').trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      notifyStatus('Please enter a valid 4-digit Room Code (e.g. 4829).', true);
      return { ok: false, error: 'Enter a valid 4-digit Room Code (e.g. 4829).' };
    }

    disconnectRoom();
    isHost = false;
    roomCode = cleanCode;
    localColorIdx = Math.floor(1 + Math.random() * (PLAYER_PALETTE.length - 1));

    setupBroadcastChannelBridge(roomCode);

    // Send join request over BroadcastChannel immediately for instant same-device tab linking
    if (bcastChannel) {
      bcastChannel.postMessage({
        t: 'join_req',
        id: localPlayerId,
        name: localPlayerName,
        _from: localPlayerId,
      });
    }

    const hostPeerId = `deskracer-room-${roomCode}`;
    try {
      peer = new Peer();
      peer.on('open', () => {
        const conn = peer.connect(hostPeerId, { reliable: false });
        conn.on('open', () => {
          const hostEntry = ensureRemotePlayerKart('host_peer', 'HOST', 0, 'free');
          hostEntry.isHost = true;
          hostEntry.conn = conn;
          conn.send({
            t: 'join_req',
            id: localPlayerId,
            name: localPlayerName,
          });
          notifyStatus(`CONNECTED TO ROOM ${roomCode}!`);
        });
        conn.on('data', (data) => {
          if (data && data.t === 'join_reject') {
            notifyStatus(data.reason || 'Room rejected connection', true);
            disconnectRoom();
            return;
          }
          handleIncomingPacket(data, conn);
        });
        conn.on('close', () => {
          notifyStatus(`Disconnected from Room ${roomCode}.`, true);
        });
      });
      peer.on('error', (err) => {
        console.warn('PeerJS Join notice:', err);
        notifyStatus(`JOINED ROOM ${roomCode}`);
      });
    } catch (_err) {
      notifyStatus(`JOINED ROOM ${roomCode}`);
    }

    notifyStatus(`CONNECTING TO ROOM ${roomCode}...`);
    return { ok: true, code: roomCode };
  }

  function disconnectRoom() {
    if (peer) {
      try {
        peer.destroy();
      } catch (_e) {
        // Ignore peer destroy error
      }
      peer = null;
    }
    if (bcastChannel) {
      bcastChannel.close();
      bcastChannel = null;
    }
    clearAllRemotePlayers();
    roomCode = '';
    isHost = false;
    hideSeek.active = false;
    hideSeek.phase = 'lobby';
    hideSeek.localRole = 'free';
    hideSeek.timer = 0;
    notifyStatus('Offline (Single Player)');
  }

  const leaveRoom = disconnectRoom;

  /**
   * Starts a Hide & Seek ("Chor-Police") round:
   * - Automatically assigns Seeker ("Police/Hunter") and Hiders ("Chor") based on player count:
   *   For 2–5 players: 1 Seeker; For 6 players: 2 Seekers and 4 Hiders.
   * - Gives Hiders a 20-second head start while Seekers have a blindfold countdown timer.
   */
  function startHideAndSeekRound() {
    mpGameMode = 'hideseek';
    if (onModeSync) onModeSync('house', 'hideseek');
    syncRemoteKartScales();

    const allIds = [localPlayerId, ...Array.from(players.keys())];
    const totalCount = allIds.length;
    const seekerCount = totalCount >= 6 ? 2 : 1;

    // Shuffle player IDs for fair role assignment
    const shuffled = allIds.slice().sort(() => Math.random() - 0.5);
    const rolesMap = {};
    let hidersCount = 0;

    shuffled.forEach((pid, idx) => {
      if (idx < seekerCount) {
        rolesMap[pid] = 'seeker';
      } else {
        rolesMap[pid] = 'hider';
        hidersCount++;
      }
    });

    // If solo testing Hide & Seek before friends join, make player Seeker
    if (totalCount === 1) {
      rolesMap[localPlayerId] = 'seeker';
      hidersCount = 1;
    }

    hideSeek.active = true;
    hideSeek.phase = 'hiding';
    hideSeek.timer = hideSeek.hidingDuration;
    hideSeek.winnerText = '';
    hideSeek.caughtCount = 0;
    hideSeek.totalHiders = hidersCount;
    hideSeek.localRole = rolesMap[localPlayerId] || 'hider';

    for (const [pid, rp] of players.entries()) {
      rp.role = rolesMap[pid] || 'hider';
      if (rp.tagSprite && rp.tagSprite.userData.updateTag) {
        rp.tagSprite.userData.updateTag(rp.name, rp.colorHex, rp.role);
      }
    }

    sendPacketToAll({
      t: 'hideseek_state',
      active: true,
      phase: 'hiding',
      timer: hideSeek.timer,
      caughtCount: 0,
      totalHiders: hidersCount,
      roles: rolesMap,
      msg: 'CHOR-POLICE STARTED! HIDERS HAVE 20s TO HIDE!',
    });

    notifyStatus('CHOR-POLICE ROUND STARTED! 20s HEAD START!');
  }

  function markHiderCaught(hiderId, seekerName = 'POLICE') {
    const rolesMap = { [localPlayerId]: hideSeek.localRole };
    for (const [pid, rp] of players.entries()) {
      rolesMap[pid] = rp.role;
    }
    if (rolesMap[hiderId] !== 'hider') return;
    rolesMap[hiderId] = 'caught';

    if (hiderId === localPlayerId) {
      hideSeek.localRole = 'caught';
    } else {
      const rp = players.get(hiderId);
      if (rp) {
        rp.role = 'caught';
        if (rp.tagSprite && rp.tagSprite.userData.updateTag) {
          rp.tagSprite.userData.updateTag(rp.name, rp.colorHex, 'caught');
        }
      }
    }

    const remainingHiders = Object.values(rolesMap).filter((r) => r === 'hider').length;
    hideSeek.caughtCount += 1;

    if (remainingHiders === 0) {
      hideSeek.phase = 'ended';
      hideSeek.winnerText = '🚨 SEEKERS (POLICE) WIN! ALL HIDERS CAUGHT!';
    }

    sendPacketToAll({
      t: 'hideseek_state',
      active: true,
      phase: hideSeek.phase,
      timer: hideSeek.timer,
      caughtCount: hideSeek.caughtCount,
      totalHiders: hideSeek.totalHiders,
      winnerText: hideSeek.winnerText,
      roles: rolesMap,
      msg: `${seekerName} TAGGED A HIDER!`,
    });

    notifyStatus(`${seekerName} TAGGED A HIDER!`);
  }

  function setMultiplayerGameMode(nextMode) {
    mpGameMode = nextMode;
    syncRemoteKartScales();
    if (onModeSync) onModeSync(worldModeForMpMode(mpGameMode), mpGameMode);
    if (isHost) {
      if (mpGameMode === 'hideseek') {
        startHideAndSeekRound();
      } else {
        hideSeek.active = false;
        hideSeek.phase = 'lobby';
        hideSeek.localRole = 'free';
        sendPacketToAll({
          t: 'hideseek_state',
          active: false,
          phase: 'lobby',
          timer: 0,
          roles: {},
        });
        broadcastRoomRoster();
        notifyStatus(`Mode switched to ${mpGameMode}`);
      }
    }
  }

  /**
   * Called every frame inside requestAnimationFrame:
   * 1. Throttles outgoing compact [x, y, z, rotY] array packets to 60ms intervals.
   * 2. Smoothly lerps remote players' 3D car positions & rotations at 60 FPS.
   * 3. Steps Hide & Seek ("Chor-Police") timers & collision tagging.
   */
  const _yAxis = new THREE.Vector3(0, 1, 0);

  function update(dt, localPhysicsState) {
    if (!roomCode) return;

    const nowMs = performance.now();
    const pos = localPhysicsState.position;
    const fwd = localPhysicsState.tangent;
    const localRotY = Math.atan2(fwd.z, fwd.x);

    // 1. Send compact [x, y, z, rotY] array every 60ms (~16.6 Hz) for zero network lag
    if (nowMs - lastNetworkSendMs >= NETWORK_SEND_INTERVAL_MS) {
      lastNetworkSendMs = nowMs;
      const compactPose = [
        Number(pos.x.toFixed(4)),
        Number((pos.y + (localPhysicsState.hopHeight || 0)).toFixed(4)),
        Number(pos.z.toFixed(4)),
        Number(localRotY.toFixed(4)),
      ];
      sendPacketToAll({
        p: compactPose,
        i: localPlayerId,
        n: localPlayerName,
        c: localColorIdx,
      });
    }

    // 2. Smoothly interpolate (lerp) all remote friends' karts at 60 FPS
    const lerpAlpha = 1.0 - Math.exp(-15.0 * dt);
    for (const rp of players.values()) {
      const prevX = rp.currentPos.x;
      const prevZ = rp.currentPos.z;
      rp.currentPos.lerp(rp.targetPos, lerpAlpha);
      const dYaw = shortestAngleDelta(rp.currentYaw, rp.targetYaw);
      rp.currentYaw += dYaw * lerpAlpha;

      const moveSpeed =
        Math.hypot(rp.currentPos.x - prevX, rp.currentPos.z - prevZ) /
        Math.max(0.001, dt);
      rp.speed = THREE.MathUtils.lerp(rp.speed, moveSpeed * 0.25, 0.2);

      if (rp.kart && rp.kart.kartRoot) {
        rp.kart.kartRoot.position.copy(rp.currentPos);
        rp.kart.kartRoot.quaternion.setFromAxisAngle(
          _yAxis,
          -rp.currentYaw + Math.PI * 0.5
        );
        if (rp.kart.updateWheels) {
          rp.kart.updateWheels(dt, rp.speed, dYaw * 2.0);
        }
      }

      // Check collision tagging in Hide & Seek ("Chor-Police") Mode!
      if (
        hideSeek.active &&
        hideSeek.phase === 'seeking' &&
        hideSeek.localRole === 'seeker' &&
        rp.role === 'hider'
      ) {
        const dx = pos.x - rp.currentPos.x;
        const dz = pos.z - rp.currentPos.z;
        if (dx * dx + dz * dz < 0.24 * 0.24) {
          if (isHost) {
            markHiderCaught(rp.id, localPlayerName);
          } else {
            sendPacketToAll({
              t: 'hideseek_tag',
              hiderId: rp.id,
              seekerName: localPlayerName,
            });
          }
        }
      }
    }

    // 3. Step Hide & Seek ("Chor-Police") Countdown & Round Timer
    if (hideSeek.active && (hideSeek.phase === 'hiding' || hideSeek.phase === 'seeking')) {
      const prevSec = Math.ceil(hideSeek.timer);
      hideSeek.timer = Math.max(0.0, hideSeek.timer - dt);
      const currSec = Math.ceil(hideSeek.timer);

      if (hideSeek.timer <= 0.0) {
        if (hideSeek.phase === 'hiding') {
          hideSeek.phase = 'seeking';
          hideSeek.timer = hideSeek.seekingDuration;
          if (isHost) {
            sendPacketToAll({
              t: 'hideseek_state',
              active: true,
              phase: 'seeking',
              timer: hideSeek.timer,
              caughtCount: hideSeek.caughtCount,
              totalHiders: hideSeek.totalHiders,
              msg: '🚨 SEEKERS RELEASED! HUNT & TAG THE HIDERS!',
            });
          }
          notifyHideSeek();
        } else if (hideSeek.phase === 'seeking') {
          hideSeek.phase = 'ended';
          hideSeek.winnerText = '🕵️ HIDERS (CHOR) WIN! TIME EXPIRED!';
          if (isHost) {
            sendPacketToAll({
              t: 'hideseek_state',
              active: true,
              phase: 'ended',
              timer: 0,
              caughtCount: hideSeek.caughtCount,
              totalHiders: hideSeek.totalHiders,
              winnerText: hideSeek.winnerText,
              msg: hideSeek.winnerText,
            });
          }
          notifyHideSeek();
        }
      } else if (currSec !== prevSec) {
        notifyHideSeek();
      }
    }
  }

  /**
   * Returns remote players visible on the 2D Mini-Map:
   * - In Hide & Seek ("Chor-Police") mode, if the local player is a Seeker ("Police"),
   *   active Hiders ("Chor") are HIDDEN on the mini-map so the Seeker must search rooms!
   */
  function getMinimapMarkers() {
    const out = [];
    for (const rp of players.values()) {
      if (
        hideSeek.active &&
        hideSeek.localRole === 'seeker' &&
        rp.role === 'hider' &&
        (hideSeek.phase === 'hiding' || hideSeek.phase === 'seeking')
      ) {
        // Hide Hider's dot on Seeker's mini-map!
        continue;
      }
      out.push({
        id: rp.id,
        name: rp.name,
        x: rp.currentPos.x,
        y: rp.currentPos.y,
        z: rp.currentPos.z,
        rotY: rp.currentYaw,
        yaw: rp.currentYaw,
        color: rp.colorHex,
        colorHex: rp.colorHex,
        role: rp.role,
      });
    }
    return out;
  }

  return {
    setPlayerName,
    hostRoom,
    joinRoom,
    leaveRoom,
    disconnectRoom,
    setMultiplayerGameMode,
    startHideAndSeekRound,
    update,
    getMinimapMarkers,
    getMinimapRemotePlayers: getMinimapMarkers,
    isSeekerBlindfolded,
    getState: () => buildState(),
  };
}
