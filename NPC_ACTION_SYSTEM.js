/**
 * ============================================================
 *   NPC - MASTER  |  ACTION SYSTEM
 *   Version: 1.0.0
 *   Codename: OPERATION LIVING NPC
 *   Feature: Physical Action + Sound + Gesture + Talk
 *   Author: Ulak (Code Improvement Engine)
 *   Auditor: TREVOR (GEMINI)
 *   Branding: .termaracksecter
 * ============================================================
 *
 *  WHAT THIS ADDS:
 *  ---------------
 *  ✔ 1. MOVEMENT SYSTEM   — walk, run, idle, crouch, sprint
 *  ✔ 2. SOUND SYSTEM      — breathing, footsteps, grunts, scoffs
 *  ✔ 3. GESTURE SYSTEM    — point, signal, look-around, cover-gesture
 *  ✔ 4. REACTION SYSTEM   — flinch, stumble, recover, dodge
 *  ✔ 5. TALK SYSTEM       — contextual voice lines per state + team
 *  ✔ 6. ACTION RESOLVER   — brain state → physical action pipeline
 *
 *  HOW IT CONNECTS:
 *  ----------------
 *  NPCGotBrains.tick() returns a brain result.
 *  Feed that result into NPCAction.resolve() and it
 *  returns a full ActionFrame — movement + sound + gesture
 *  + talk — ready to drive your animation and audio engine.
 *
 *  USAGE:
 *  ------
 *  const brain  = NPCGotBrains.tick(npc, target, env);
 *  const action = NPCAction.resolve(npc, brain, context);
 *  // action.movement  → what the body does
 *  // action.sound     → what audio to play
 *  // action.gesture   → what animation to trigger
 *  // action.talk      → what voice line to speak
 *  // action.reaction  → physical reaction (flinch etc.)
 * ============================================================
 */

'use strict';

const NPCAction = (function () {

  // ============================================================
  // SECTION 1: MOVEMENT STATES
  // Physical locomotion types the NPC body can perform.
  // ============================================================

  const MOVEMENT = Object.freeze({
    IDLE:        'IDLE',         // Standing still, weight shifting
    WALK:        'WALK',         // Normal patrol walk
    WALK_COMBAT: 'WALK_COMBAT',  // Slow tactical walk, weapon raised
    RUN:         'RUN',          // Standard pursuit run
    SPRINT:      'SPRINT',       // Full speed chase
    CROUCH:      'CROUCH',       // Crouched, searching
    CROUCH_MOVE: 'CROUCH_MOVE',  // Moving while crouched
    COVER_ENTER: 'COVER_ENTER',  // Moving into cover position
    COVER_HOLD:  'COVER_HOLD',   // Holding cover position
    COVER_PEEK:  'COVER_PEEK',   // Peeking from cover
    FLEE:        'FLEE',         // Civilian panic run
    STUMBLE:     'STUMBLE',      // Fatigue stumble
    RECOVER:     'RECOVER',      // Recovering from stumble
    REST_STAND:  'REST_STAND',   // Standing still — resting
  });

  // ============================================================
  // SECTION 2: SOUND LIBRARY
  // Every sound the NPC body makes — breathing, steps, voice.
  // In your engine: map these keys to your audio file paths.
  // ============================================================

  const SOUND = Object.freeze({

    // ── BREATHING ──
    BREATH_CALM:     'breath_calm',       // Slow steady breathing — patrol
    BREATH_ALERT:    'breath_alert',      // Slightly elevated — investigate
    BREATH_HEAVY:    'breath_heavy',      // Hard breathing — engage
    BREATH_EXHAUST:  'breath_exhausted',  // Gasping — high fatigue
    BREATH_RECOVER:  'breath_recover',    // Catching breath — post rest

    // ── FOOTSTEPS (engine maps to surface type) ──
    STEP_WALK:       'footstep_walk',     // Normal walk cadence
    STEP_RUN:        'footstep_run',      // Running cadence
    STEP_SPRINT:     'footstep_sprint',   // Sprint cadence
    STEP_CROUCH:     'footstep_crouch',   // Soft crouch steps
    STEP_STUMBLE:    'footstep_stumble',  // Irregular stumble steps

    // ── BODY SOUNDS ──
    GEAR_RUSTLE:     'gear_rustle',       // Equipment shift on movement
    GRUNT_EFFORT:    'grunt_effort',      // Physical exertion grunt
    GRUNT_PAIN:      'grunt_pain',        // Pain reaction
    SCOFF:           'scoff',             // Dismissive exhale
    DEEP_BREATH_IN:  'deep_breath_in',    // Composing self
    SHARP_INHALE:    'sharp_inhale',      // Surprise / spot player
    EXHALE_RELIEF:   'exhale_relief',     // Tension release

    // ── VOICE LINES — mapped per TEAM + STATE ──
    // Hero team
    HERO_PATROL_1:   'hero_patrol_01',    // "Sector clear."
    HERO_PATROL_2:   'hero_patrol_02',    // "Staying sharp."
    HERO_INVEST_1:   'hero_invest_01',    // "Something's off."
    HERO_INVEST_2:   'hero_invest_02',    // "Checking it out."
    HERO_ENGAGE_1:   'hero_engage_01',    // "Contact! Moving up!"
    HERO_ENGAGE_2:   'hero_engage_02',    // "Cover me!"
    HERO_ALERT_1:    'hero_alert_01',     // "All units, target spotted!"
    HERO_REST_1:     'hero_rest_01',      // "Give me a second..."

    // Gang team
    GANG_PATROL_1:   'gang_patrol_01',    // "Nobody here..."
    GANG_PATROL_2:   'gang_patrol_02',    // *scoff*
    GANG_INVEST_1:   'gang_invest_01',    // "Who's there?"
    GANG_INVEST_2:   'gang_invest_02',    // "Show yourself."
    GANG_ENGAGE_1:   'gang_engage_01',    // "Get them!"
    GANG_ENGAGE_2:   'gang_engage_02',    // "Don't let them run!"
    GANG_ALERT_1:    'gang_alert_01',     // "Spread out! Find them!"
    GANG_REST_1:     'gang_rest_01',      // *heavy exhale*

    // Civilian team
    CIV_PATROL_1:    'civ_patrol_01',     // *humming*
    CIV_INVEST_1:    'civ_invest_01',     // "Hello? Anyone there?"
    CIV_FLEE_1:      'civ_flee_01',       // "Help! Help me!"
    CIV_FLEE_2:      'civ_flee_02',       // *screaming*
    CIV_REST_1:      'civ_rest_01',       // *catching breath*

    // Villain team
    VILL_PATROL_1:   'villain_patrol_01', // *slow deliberate footsteps*
    VILL_INVEST_1:   'villain_invest_01', // "I can smell you..."
    VILL_ENGAGE_1:   'villain_engage_01', // "There is nowhere to run."
    VILL_ENGAGE_2:   'villain_engage_02', // "I will find you."
    VILL_TAUNT_1:    'villain_taunt_01',  // "Is that all you have?"

    // Custom / Interceptor team
    CUS_PATROL_1:    'custom_patrol_01',  // "Unit 7, maintaining position."
    CUS_INVEST_1:    'custom_invest_01',  // "Suspect last seen heading north."
    CUS_ENGAGE_1:    'custom_engage_01',  // "Pursuit engaged. All units converge."
    CUS_ENGAGE_2:    'custom_engage_02',  // "Subject is running. Cut them off!"
    CUS_REST_1:      'custom_rest_01',    // "Catching breath. Stand by."

    SILENCE:         null,                // No sound this frame
  });

  // ============================================================
  // SECTION 3: GESTURE LIBRARY
  // Body language and animation triggers.
  // Map these keys to your animation controller.
  // ============================================================

  const GESTURE = Object.freeze({
    NONE:              'none',
    IDLE_WEIGHT_SHIFT: 'idle_weight_shift',  // Natural idle sway
    IDLE_LOOK_AROUND:  'idle_look_around',   // Head scan left/right
    IDLE_CHECK_WEAPON: 'idle_check_weapon',  // Glance at weapon
    IDLE_SCRATCH:      'idle_scratch',       // Scratch head / fidget
    POINT_FORWARD:     'point_forward',      // Point at target direction
    POINT_FLANK:       'point_flank',        // Signal to flank
    SIGNAL_ADVANCE:    'signal_advance',     // Wave forward
    SIGNAL_HOLD:       'signal_hold',        // Fist up — stop
    SIGNAL_COVER:      'signal_cover',       // Point to cover position
    LOOK_SUSPICIOUS:   'look_suspicious',    // Narrow eyes, scan area
    CROUCH_SIGNAL:     'crouch_signal',      // Crouch + gesture allies
    PEEK_LEFT:         'peek_left',          // Lean peek from cover left
    PEEK_RIGHT:        'peek_right',         // Lean peek from cover right
    FLINCH:            'flinch',             // Recoil from nearby threat
    STUMBLE_FORWARD:   'stumble_forward',    // Fatigue stumble
    RECOVER_STANCE:    'recover_stance',     // Straighten up after stumble
    CIVILIAN_PANIC:    'civilian_panic',     // Arms flailing run
    VILLAIN_SLOW_TURN: 'villain_slow_turn',  // Slow menacing turn
    VILLAIN_TAUNT:     'villain_taunt',      // Intimidation gesture
    HEAD_TILT:         'head_tilt',          // Curious tilt — investigate
    DEEP_BREATH_ANIM:  'deep_breath_anim',   // Visible chest rise — rest
    RADIO_CALL:        'radio_call',         // Hand to ear — comms
  });

  // ============================================================
  // SECTION 4: REACTION TYPES
  // Instant physical reactions to game events.
  // ============================================================

  const REACTION = Object.freeze({
    NONE:          'none',
    FLINCH_LIGHT:  'flinch_light',    // Nearby bullet — slight flinch
    FLINCH_HEAVY:  'flinch_heavy',    // Direct hit — strong flinch
    STUMBLE:       'stumble',         // Fatigue threshold crossed
    DODGE_LEFT:    'dodge_left',      // Evade incoming
    DODGE_RIGHT:   'dodge_right',     // Evade incoming
    SPOT_PLAYER:   'spot_player',     // Sharp turn toward player
    LOSE_PLAYER:   'lose_player',     // Confused look around
    ALERTED:       'alerted',         // Snap to attention
    EXHAUST_DROP:  'exhaust_drop',    // Drop to knee — exhausted
    RECOVER_STAND: 'recover_stand',   // Stand back up
  });

  // ============================================================
  // SECTION 5: VOICE LINE SELECTOR
  // Picks the right voice line based on team + brain state.
  // Uses cooldown so NPC doesn't talk every single tick.
  // ============================================================

  // Voice cooldown tracker — prevents spam
  const _voiceCooldowns = new WeakMap();

  /**
   * Gets the cooldown duration (ticks) per state.
   * ENGAGE = talks more. PATROL = rarely talks.
   */
  function _getVoiceCooldown(state) {
    const cooldowns = {
      PATROL:      120,  // Every ~4 seconds at 30fps
      INVESTIGATE:  60,  // Every ~2 seconds
      ENGAGE:       45,  // Every ~1.5 seconds
      REST:         90,  // Every ~3 seconds
    };
    return cooldowns[state] || 120;
  }

  /**
   * Determines if NPC should speak this tick.
   * Returns voice line key or null.
   *
   * @param {object} npc
   * @param {string} state   - Current brain state
   * @param {string} team    - NPC team
   * @param {object} context - Extra context (alerted, playerVisible etc.)
   * @returns {string|null}  - SOUND key or null
   */
  function selectVoiceLine(npc, state, team, context = {}) {
    // Check cooldown
    const now      = Date.now();
    const lastSpoke= _voiceCooldowns.get(npc) || 0;
    const cooldown = _getVoiceCooldown(state) * (1000/30); // convert ticks to ms

    if (now - lastSpoke < cooldown) return null;

    // Random chance — NPC doesn't always speak
    const speakChance = {
      PATROL:      0.15,  // 15% chance
      INVESTIGATE: 0.35,  // 35% chance
      ENGAGE:      0.55,  // 55% chance
      REST:        0.25,  // 25% chance
    }[state] || 0.15;

    if (Math.random() > speakChance) return null;

    // Update cooldown
    _voiceCooldowns.set(npc, now);

    // Select line based on team + state
    const lines = _getVoiceLines(team, state, context);
    if (!lines || lines.length === 0) return null;

    return lines[Math.floor(Math.random() * lines.length)];
  }

  /**
   * Returns available voice lines for team + state combo.
   */
  function _getVoiceLines(team, state, context) {
    const map = {
      HERO: {
        PATROL:      [SOUND.HERO_PATROL_1, SOUND.HERO_PATROL_2],
        INVESTIGATE: [SOUND.HERO_INVEST_1, SOUND.HERO_INVEST_2],
        ENGAGE:      context.alerted
                       ? [SOUND.HERO_ALERT_1, SOUND.HERO_ENGAGE_1, SOUND.HERO_ENGAGE_2]
                       : [SOUND.HERO_ENGAGE_1, SOUND.HERO_ENGAGE_2],
        REST:        [SOUND.HERO_REST_1],
      },
      GANG: {
        PATROL:      [SOUND.GANG_PATROL_1, SOUND.GANG_PATROL_2, SOUND.SCOFF],
        INVESTIGATE: [SOUND.GANG_INVEST_1, SOUND.GANG_INVEST_2],
        ENGAGE:      context.alerted
                       ? [SOUND.GANG_ALERT_1, SOUND.GANG_ENGAGE_1, SOUND.GANG_ENGAGE_2]
                       : [SOUND.GANG_ENGAGE_1, SOUND.GANG_ENGAGE_2],
        REST:        [SOUND.GANG_REST_1, SOUND.BREATH_EXHAUST],
      },
      CIVILIAN: {
        PATROL:      [SOUND.CIV_PATROL_1, SOUND.BREATH_CALM],
        INVESTIGATE: [SOUND.CIV_INVEST_1],
        ENGAGE:      [SOUND.CIV_FLEE_1, SOUND.CIV_FLEE_2],
        REST:        [SOUND.CIV_REST_1, SOUND.BREATH_RECOVER],
      },
      VILLAIN: {
        PATROL:      [SOUND.VILL_PATROL_1, SOUND.BREATH_CALM],
        INVESTIGATE: [SOUND.VILL_INVEST_1],
        ENGAGE:      [SOUND.VILL_ENGAGE_1, SOUND.VILL_ENGAGE_2, SOUND.VILL_TAUNT_1],
        REST:        [SOUND.VILL_PATROL_1],
      },
      CUSTOM: {
        PATROL:      [SOUND.CUS_PATROL_1],
        INVESTIGATE: [SOUND.CUS_INVEST_1],
        ENGAGE:      [SOUND.CUS_ENGAGE_1, SOUND.CUS_ENGAGE_2],
        REST:        [SOUND.CUS_REST_1],
      },
    };
    return map[team]?.[state] || null;
  }

  // ============================================================
  // SECTION 6: MOVEMENT RESOLVER
  // Maps brain state + context → physical movement type.
  // ============================================================

  /**
   * Resolves the correct movement state for this tick.
   *
   * @param {string} brainState   - PATROL/INVESTIGATE/ENGAGE/REST
   * @param {string} team
   * @param {object} context
   *   context.threatLevel   {number}  0-100
   *   context.fatigue       {number}  0-100
   *   context.usingCover    {boolean}
   *   context.usingAmbush   {boolean}
   *   context.fleeingDanger {boolean}
   *   context.isResting     {boolean}
   *   context.playerVisible {boolean}
   *   context.hasPath       {boolean}
   * @returns {string} MOVEMENT key
   */
  function resolveMovement(brainState, team, context) {
    const thr  = context.threatLevel  || 0;
    const fat  = context.fatigue      || 0;
    const hasp = context.hasPath;

    // CIVILIAN: always flee when engaged
    if (team === 'CIVILIAN') {
      if (context.fleeingDanger) return MOVEMENT.FLEE;
      if (brainState === 'PATROL') return MOVEMENT.WALK;
      return MOVEMENT.FLEE;
    }

    // VILLAIN: slow deliberate movement
    if (team === 'VILLAIN') {
      if (brainState === 'PATROL')      return MOVEMENT.WALK;
      if (brainState === 'INVESTIGATE') return MOVEMENT.WALK_COMBAT;
      if (brainState === 'ENGAGE')      return thr > 70 ? MOVEMENT.SPRINT : MOVEMENT.RUN;
      return MOVEMENT.IDLE;
    }

    // REST state
    if (context.isResting) {
      return fat > 80 ? MOVEMENT.STUMBLE : MOVEMENT.REST_STAND;
    }

    // COVER states
    if (context.usingCover || context.usingAmbush) {
      return hasp ? MOVEMENT.COVER_ENTER : MOVEMENT.COVER_PEEK;
    }

    // Standard state mapping
    switch (brainState) {
      case 'PATROL':
        return MOVEMENT.WALK;

      case 'INVESTIGATE':
        return thr > 40
          ? MOVEMENT.WALK_COMBAT
          : MOVEMENT.CROUCH_MOVE;

      case 'ENGAGE':
        if (fat > 70)      return MOVEMENT.STUMBLE;
        if (thr > 80)      return MOVEMENT.SPRINT;
        if (thr > 50)      return MOVEMENT.RUN;
        return MOVEMENT.WALK_COMBAT;

      case 'REST':
        return MOVEMENT.REST_STAND;

      default:
        return MOVEMENT.IDLE;
    }
  }

  // ============================================================
  // SECTION 7: SOUND RESOLVER
  // Maps movement + brain state → ambient body sounds.
  // ============================================================

  /**
   * Resolves ambient body sounds for this tick.
   * Returns array of sounds — engine plays them layered.
   *
   * @param {string} movement   - From resolveMovement()
   * @param {string} brainState
   * @param {object} context
   * @returns {Array<string>} array of SOUND keys
   */
  function resolveSounds(movement, brainState, context) {
    const sounds = [];
    const thr    = context.threatLevel || 0;
    const fat    = context.fatigue     || 0;

    // ── BREATHING ──
    if      (fat > 80)  sounds.push(SOUND.BREATH_EXHAUST);
    else if (thr > 70)  sounds.push(SOUND.BREATH_HEAVY);
    else if (thr > 30)  sounds.push(SOUND.BREATH_ALERT);
    else                sounds.push(SOUND.BREATH_CALM);

    // ── FOOTSTEPS ──
    switch (movement) {
      case MOVEMENT.WALK:
      case MOVEMENT.WALK_COMBAT:
        sounds.push(SOUND.STEP_WALK); break;
      case MOVEMENT.RUN:
        sounds.push(SOUND.STEP_RUN);  break;
      case MOVEMENT.SPRINT:
        sounds.push(SOUND.STEP_SPRINT);
        if (Math.random() < 0.3) sounds.push(SOUND.GRUNT_EFFORT);
        break;
      case MOVEMENT.CROUCH_MOVE:
        sounds.push(SOUND.STEP_CROUCH); break;
      case MOVEMENT.STUMBLE:
        sounds.push(SOUND.STEP_STUMBLE);
        sounds.push(SOUND.GRUNT_PAIN);
        break;
      case MOVEMENT.FLEE:
        sounds.push(SOUND.STEP_SPRINT); break;
      case MOVEMENT.COVER_ENTER:
      case MOVEMENT.COVER_HOLD:
        sounds.push(SOUND.GEAR_RUSTLE); break;
      default:
        break;
    }

    // ── CONTEXTUAL SOUNDS ──

    // Player spotted — sharp inhale
    if (context.justSpottedPlayer) {
      sounds.push(SOUND.SHARP_INHALE);
    }

    // Just alerted by ally
    if (context.justAlerted) {
      sounds.push(SOUND.SHARP_INHALE);
    }

    // Lost player — scoff / exhale
    if (context.justLostPlayer) {
      sounds.push(Math.random() < 0.5 ? SOUND.SCOFF : SOUND.EXHALE_RELIEF);
    }

    // Rest recovery
    if (movement === MOVEMENT.RECOVER || movement === MOVEMENT.REST_STAND) {
      sounds.push(SOUND.BREATH_RECOVER);
      if (Math.random() < 0.4) sounds.push(SOUND.DEEP_BREATH_IN);
    }

    return sounds;
  }

  // ============================================================
  // SECTION 8: GESTURE RESOLVER
  // Maps brain state + team + context → body language.
  // ============================================================

  /**
   * Resolves body gesture / animation for this tick.
   * Returns ONE primary gesture — engine plays it.
   *
   * @param {string} brainState
   * @param {string} team
   * @param {object} context
   * @returns {string} GESTURE key
   */
  function resolveGesture(brainState, team, context) {

    // Priority: context events override state gestures

    // Just spotted player
    if (context.justSpottedPlayer) return GESTURE.SPOT_PLAYER
      ? GESTURE.POINT_FORWARD : GESTURE.LOOK_SUSPICIOUS;

    // Just got alerted by ally
    if (context.justAlerted)       return GESTURE.ALERTED
      ? GESTURE.RADIO_CALL : GESTURE.LOOK_SUSPICIOUS;

    // Cover gestures
    if (context.usingCover)        return GESTURE.SIGNAL_COVER;
    if (context.usingAmbush)       return GESTURE.PEEK_LEFT;

    // Fleeing civilian
    if (context.fleeingDanger)     return GESTURE.CIVILIAN_PANIC;

    // Fatigue stumble
    if ((context.fatigue||0) > 80) return GESTURE.STUMBLE_FORWARD;

    // State-based gestures
    switch (brainState) {

      case 'PATROL':
        if (team === 'VILLAIN') return GESTURE.VILLAIN_SLOW_TURN;
        // Rotate through idle gestures
        const idleGestures = [
          GESTURE.IDLE_WEIGHT_SHIFT,
          GESTURE.IDLE_LOOK_AROUND,
          GESTURE.IDLE_CHECK_WEAPON,
          GESTURE.IDLE_SCRATCH,
        ];
        return idleGestures[Math.floor(Date.now() / 4000) % idleGestures.length];

      case 'INVESTIGATE':
        if (team === 'VILLAIN')   return GESTURE.VILLAIN_SLOW_TURN;
        if (team === 'CIVILIAN')  return GESTURE.HEAD_TILT;
        return Math.random() < 0.5
          ? GESTURE.LOOK_SUSPICIOUS
          : GESTURE.HEAD_TILT;

      case 'ENGAGE':
        if (team === 'VILLAIN')   return GESTURE.VILLAIN_TAUNT;
        if (team === 'CIVILIAN')  return GESTURE.CIVILIAN_PANIC;
        if (team === 'HERO')      return GESTURE.SIGNAL_ADVANCE;
        if (team === 'GANG')      return GESTURE.POINT_FORWARD;
        if (team === 'CUSTOM')    return GESTURE.RADIO_CALL;
        return GESTURE.POINT_FORWARD;

      case 'REST':
        return GESTURE.DEEP_BREATH_ANIM;

      default:
        return GESTURE.NONE;
    }
  }

  // ============================================================
  // SECTION 9: REACTION RESOLVER
  // Instantaneous physical reactions to sudden events.
  // ============================================================

  /**
   * Resolves instant physical reactions.
   *
   * @param {object} context
   * @returns {string} REACTION key
   */
  function resolveReaction(context) {
    // Priority order — most urgent first

    if (context.hitByBullet) {
      return context.hitSeverity > 0.6
        ? REACTION.FLINCH_HEAVY
        : REACTION.FLINCH_LIGHT;
    }

    if (context.justSpottedPlayer)  return REACTION.SPOT_PLAYER;
    if (context.justLostPlayer)     return REACTION.LOSE_PLAYER;
    if (context.justAlerted)        return REACTION.ALERTED;
    if ((context.fatigue||0) > 90)  return REACTION.EXHAUST_DROP;
    if ((context.fatigue||0) > 75)  return REACTION.STUMBLE;

    if (context.incomingThreat) {
      return Math.random() < 0.5
        ? REACTION.DODGE_LEFT
        : REACTION.DODGE_RIGHT;
    }

    return REACTION.NONE;
  }

  // ============================================================
  // SECTION 10: SPEED RESOLVER
  // Returns actual movement speed multiplier per movement type.
  // Multiply your base NPC speed by this value.
  // ============================================================

  const SPEED_MULTIPLIERS = Object.freeze({
    [MOVEMENT.IDLE]:        0.0,
    [MOVEMENT.WALK]:        0.4,
    [MOVEMENT.WALK_COMBAT]: 0.3,
    [MOVEMENT.RUN]:         0.75,
    [MOVEMENT.SPRINT]:      1.0,
    [MOVEMENT.CROUCH]:      0.0,
    [MOVEMENT.CROUCH_MOVE]: 0.2,
    [MOVEMENT.COVER_ENTER]: 0.35,
    [MOVEMENT.COVER_HOLD]:  0.0,
    [MOVEMENT.COVER_PEEK]:  0.0,
    [MOVEMENT.FLEE]:        0.9,
    [MOVEMENT.STUMBLE]:     0.15,
    [MOVEMENT.RECOVER]:     0.0,
    [MOVEMENT.REST_STAND]:  0.0,
  });

  function resolveSpeed(movement, team, threatLevel) {
    const base  = SPEED_MULTIPLIERS[movement] ?? 0.4;
    // Gang and Villain get +10% speed when engaging
    const bonus = (team === 'GANG' || team === 'VILLAIN') && threatLevel > 60 ? 0.1 : 0;
    return Math.min(1.0, base + bonus);
  }

  // ============================================================
  // SECTION 11: MAIN ACTION RESOLVER
  // The single function that processes brain output into
  // a full ActionFrame ready for your game engine.
  // ============================================================

  /**
   * Resolves a full ActionFrame from brain tick result.
   * Call this EVERY FRAME after NPCGotBrains.tick().
   *
   * @param {object} npc         - NPC object from createNPC()
   * @param {object} brainResult - From NPCGotBrains.tick()
   * @param {object} [context]   - Extra game context
   *   context.justSpottedPlayer {boolean} - First frame player seen
   *   context.justLostPlayer    {boolean} - First frame player lost
   *   context.justAlerted       {boolean} - Just received ally alert
   *   context.hitByBullet       {boolean} - Got hit this frame
   *   context.hitSeverity       {number}  - 0.0–1.0 hit strength
   *   context.incomingThreat    {boolean} - Bullet nearby
   *
   * @returns {object} ActionFrame
   *   .movement    {string}   MOVEMENT key
   *   .speed       {number}   0.0–1.0 speed multiplier
   *   .sounds      {Array}    Array of SOUND keys to play
   *   .voiceLine   {string}   SOUND key for voice or null
   *   .gesture     {string}   GESTURE key for animator
   *   .reaction    {string}   REACTION key (instant event)
   *   .facingTarget{boolean}  Should NPC face target this frame
   *   .timestamp   {number}
   *
   * @example
   * const brain  = NPCGotBrains.tick(guard, player, env);
   * const action = NPCAction.resolve(guard, brain, {
   *   justSpottedPlayer: wasHidden && brain.playerVisible,
   *   justLostPlayer:    wasVisible && !brain.playerVisible,
   * });
   * myAnimator.play(action.gesture);
   * myAudio.play(action.sounds);
   * mySpeech.say(action.voiceLine);
   * myEngine.setSpeed(action.speed);
   */
  function resolve(npc, brainResult, context = {}) {

    // Safety check
    if (!brainResult) return null;

    const state  = brainResult.state;
    const team   = brainResult.team || 'GANG';
    const thr    = brainResult.threatLevel || 0;
    const fat    = brainResult.fatigue     || 0;

    // Build full context for all resolvers
    const fullCtx = {
      threatLevel:       thr,
      fatigue:           fat,
      usingCover:        brainResult.usingCover    || false,
      usingAmbush:       brainResult.usingAmbush   || false,
      fleeingDanger:     brainResult.fleeingDanger || false,
      isResting:         brainResult.isResting     || false,
      playerVisible:     brainResult.playerVisible || false,
      hasPath:           !!(brainResult.path && brainResult.path.length > 0),
      alerted:           npc.alerted               || false,
      justSpottedPlayer: context.justSpottedPlayer || false,
      justLostPlayer:    context.justLostPlayer    || false,
      justAlerted:       context.justAlerted       || false,
      hitByBullet:       context.hitByBullet       || false,
      hitSeverity:       context.hitSeverity       || 0,
      incomingThreat:    context.incomingThreat    || false,
    };

    // ── RESOLVE ALL SYSTEMS ──
    const movement  = resolveMovement(state,    team, fullCtx);
    const speed     = resolveSpeed(movement,    team, thr);
    const sounds    = resolveSounds(movement,   state, fullCtx);
    const voiceLine = selectVoiceLine(npc,      state, team, fullCtx);
    const gesture   = resolveGesture(state,     team, fullCtx);
    const reaction  = resolveReaction(fullCtx);

    // NPC should face target when engaging or investigating
    const facingTarget = ['ENGAGE','INVESTIGATE'].includes(state);

    return Object.freeze({
      movement,
      speed,
      sounds,
      voiceLine,
      gesture,
      reaction,
      facingTarget,
      state,
      team,
      threatLevel: thr,
      fatigue:     fat,
      timestamp:   Date.now(),
    });
  }

  // ============================================================
  // SECTION 12: PUBLIC API
  // ============================================================

  return Object.freeze({

    // Main resolver — use every frame
    resolve,

    // Constants — for engine integration
    MOVEMENT,
    SOUND,
    GESTURE,
    REACTION,

    // Individual resolvers — if you need them separately
    resolveMovement,
    resolveSounds,
    resolveGesture,
    resolveReaction,
    resolveSpeed,
    selectVoiceLine,

  });

})();

// ============================================================
// MODULE EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NPCAction };
}

/*
 * ============================================================
 *   NPC - MASTER | ACTION SYSTEM v1.0.0
 *   Feature: Physical Action + Sound + Gesture + Talk
 *   Delivered by: Ulak (Code Improvement Engine)
 *   Auditor: TREVOR (GEMINI)
 *   Branding: .termaracksecter
 * ============================================================
 */
