'use strict';

/**
 * T E R M A R A C K S E C T E R
 * Gold Build v3.3.0
 *
 * Internal-only module:
 * - Layer 1: Raw Kernel
 * - Layer 2: Binary Lock Exporter
 */

const GOLD_BUILD_VERSION = 'v3.3.0';
const FOUNDER_KEY = 'TERMARACKSECTER-FOUNDER-2025';

// ============================================================
// LAYER 1: RAW KERNEL (INTERNAL ONLY)
// ============================================================
const _TBK_RAW = Object.freeze({
  version: GOLD_BUILD_VERSION,
  kernels: Object.freeze({
    distance2d: 'Math.hypot(b.x - a.x, b.y - a.y)',
    clamp01: 'v < 0 ? 0 : (v > 1 ? 1 : v)',
    utilityEngage: '(1 - distanceFactor) * threatFactor * (1 - fatigueFactor)',
    utilityInvestigate: 'hasMemory * memoryStrength * distanceFactor',
    utilityPatrol: '(1 - threatFactor) * (1 - hasMemory)',
    utilityRest: 'fatigueFactor',
  }),
  constants: Object.freeze({
    THREAT_MAX: 100,
    THREAT_BUILD_RATE: 5,
    THREAT_DECAY_RATE: 2,
    FATIGUE_MAX: 60,
    FATIGUE_BUILD_RATE: 1,
    FATIGUE_REST_DURATION: 20,
    MEMORY_DURATION_TICKS: 80,
    DETECT_RANGE: 400,
    ENGAGE_RANGE: 150,
    FOV_ANGLE_DEGREES: 120,
  }),
});

function _xorUtf8(input, key) {
  const inBuf = Buffer.from(input, 'utf8');
  const keyBuf = Buffer.from(key, 'utf8');
  const out = Buffer.alloc(inBuf.length);
  for (let i = 0; i < inBuf.length; i++) {
    out[i] = inBuf[i] ^ keyBuf[i % keyBuf.length];
  }
  return out;
}

function _decodeBlob(blob, key) {
  if (typeof blob !== 'string' || !blob.startsWith('TRMK3::')) {
    throw new Error('Invalid .termaracksecter blob format.');
  }
  const packed = Buffer.from(blob.slice('TRMK3::'.length), 'base64').toString('utf8');
  const unpacked = JSON.parse(packed);
  const plain = _xorUtf8(Buffer.from(unpacked.payload, 'base64').toString('utf8'), key).toString('utf8');
  return JSON.parse(plain);
}

function _buildRuntime(rawPayload) {
  const c = rawPayload.constants;
  const k = rawPayload.kernels;
  return Object.freeze({
    version: rawPayload.version,
    constants: Object.freeze({ ...c }),
    math: Object.freeze({
      distance2d: new Function('a', 'b', `return ${k.distance2d};`),
      clamp01: new Function('v', `return ${k.clamp01};`),
    }),
    utility: Object.freeze({
      engage: new Function('distanceFactor', 'threatFactor', 'fatigueFactor', `return ${k.utilityEngage};`),
      investigate: new Function('hasMemory', 'memoryStrength', 'distanceFactor', `return ${k.utilityInvestigate};`),
      patrol: new Function('threatFactor', 'hasMemory', `return ${k.utilityPatrol};`),
      rest: new Function('fatigueFactor', `return ${k.utilityRest};`),
    }),
  });
}

function createRuntimeFromRaw() {
  return _buildRuntime(_TBK_RAW);
}

function createRuntimeFromBlob(blobString, founderKey) {
  const parsed = _decodeBlob(blobString, founderKey);
  return _buildRuntime(parsed);
}

// ============================================================
// LAYER 2: BINARY LOCK EXPORTER
// ============================================================
const TermarackExporter = Object.freeze({
  exportBlob(founderKey) {
    if (founderKey !== FOUNDER_KEY) {
      throw new Error('Founder key rejected.');
    }

    const source = JSON.stringify(_TBK_RAW);
    const encrypted = _xorUtf8(source, founderKey).toString('utf8');
    const packed = JSON.stringify({
      version: GOLD_BUILD_VERSION,
      createdAt: new Date().toISOString(),
      payload: Buffer.from(encrypted, 'utf8').toString('base64'),
    });
    return `TRMK3::${Buffer.from(packed, 'utf8').toString('base64')}`;
  },
});

module.exports = Object.freeze({
  GOLD_BUILD_VERSION,
  TermarackExporter,
  createRuntimeFromRaw,
  createRuntimeFromBlob,
});
