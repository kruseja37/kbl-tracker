import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error('Usage: node scripts/build-historical-legends-app-data.mjs <source profiles.json> <output json>');
  process.exit(2);
}

const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const raw = await readFile(sourcePath);
const sourceSha256 = createHash('sha256').update(raw).digest('hex');
const source = JSON.parse(raw.toString('utf8'));

const fail = (message) => {
  throw new Error(`[historical-legends-app-data] ${message}`);
};
const profileTypes = ['Career', 'Peak', 'Draft Pool'];
const typeSlug = { Career: 'career', Peak: 'peak', 'Draft Pool': 'draft' };
const profiles = Array.isArray(source.profiles) ? source.profiles : fail('source profiles[] is missing');
if (!source.editionId || !source.contentHash) fail('source editionId/contentHash is missing');
if (source.profileCount !== profiles.length) fail('source profileCount does not match profiles[]');

const profileCounts = Object.fromEntries(profileTypes.map((type) => [type, 0]));
const humanProfiles = new Map();
const cardIds = new Set();
const asRecord = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const asArray = (value) => Array.isArray(value) ? value : [];
const finite = (value, field, cardId) => {
  if (!Number.isFinite(value) || value < 0 || value > 99) fail(`${cardId} has invalid ${field}`);
  return value;
};

const players = profiles.map((profile) => {
  const playerId = String(profile.playerId ?? '').trim();
  const profileType = profile.profileType;
  if (!playerId || !profileTypes.includes(profileType)) fail('profile is missing playerId/profileType');
  const id = `hl:${playerId}:${typeSlug[profileType]}`;
  if (cardIds.has(id)) fail(`duplicate stable card id ${id}`);
  cardIds.add(id);
  profileCounts[profileType] += 1;
  const seenTypes = humanProfiles.get(playerId) ?? new Set();
  if (seenTypes.has(profileType)) fail(`duplicate ${profileType} card for ${playerId}`);
  seenTypes.add(profileType);
  humanProfiles.set(playerId, seenTypes);

  const identity = `historical:${playerId}`;
  const firstName = String(profile.firstName ?? '').trim();
  const lastName = String(profile.lastName ?? '').trim();
  if (!firstName || !lastName) fail(`${id} is missing a first or last name`);
  const createdDate = String(source.generatedAt ?? new Date(0).toISOString());
  return {
    id,
    firstName,
    lastName,
    nickname: String(profile.nickname ?? '').trim() || undefined,
    backstory: String(profile.backstory ?? '').trim() || undefined,
    nicknames: asArray(profile.nicknames),
    signatureMoment: String(profile.signatureMoment ?? '').trim() || undefined,
    gender: profile.gender === 'F' ? 'F' : 'M',
    jerseyNumber: Number.isInteger(profile.jerseyNumber) ? profile.jerseyNumber : undefined,
    age: finite(profile.age, 'age', id),
    bats: profile.bats,
    throws: profile.throws,
    armSlot: profile.armSlot ?? null,
    primaryPosition: profile.primaryPosition,
    secondaryPosition: String(profile.secondaryPosition ?? '').trim() || undefined,
    power: finite(profile.power, 'power', id),
    contact: finite(profile.contact, 'contact', id),
    speed: finite(profile.speed, 'speed', id),
    fielding: finite(profile.fielding, 'fielding', id),
    arm: finite(profile.arm, 'arm', id),
    velocity: finite(profile.velocity, 'velocity', id),
    junk: finite(profile.junk, 'junk', id),
    accuracy: finite(profile.accuracy, 'accuracy', id),
    arsenal: asArray(profile.arsenal),
    overallGrade: profile.overallGrade,
    trait1: String(profile.trait1 ?? '').trim() || undefined,
    trait2: String(profile.trait2 ?? '').trim() || undefined,
    personality: profile.personality,
    chemistry: profile.chemistry,
    hiddenPersonalityModifiers: profile.hiddenPersonalityModifiers ?? undefined,
    morale: Number.isFinite(profile.morale) ? profile.morale : 75,
    mojo: profile.mojo ?? 'Normal',
    fame: Number.isFinite(profile.fame) ? profile.fame : 0,
    salary: Number.isFinite(profile.salary) ? profile.salary : 0,
    leagueAssignments: [],
    ratingRevealState: 'revealed',
    createdDate,
    lastModified: createdDate,
    isCustom: false,
    sourceDatabase: 'HISTORICAL_LEGENDS',
    hometown: profile.hometown ?? undefined,
    editHistory: [],
    sourceId: identity,
    historicalSourceId: identity,
    versionGroupId: identity,
    historicalProfileType: profileType,
    historicalLegend: {
      playerId,
      displayName: String(profile.displayName ?? `${firstName} ${lastName}`).trim(),
      profileType,
      sourceCardId: String(profile.sourceCardId ?? profile.cardId ?? profile.id ?? id),
      sourceWindowId: String(profile.sourceWindowId ?? profile.windowId ?? ''),
      sourceVersionClass: String(profile.sourceVersionClass ?? profile.versionClass ?? ''),
      imageAge: Number.isFinite(profile.imageAge) ? profile.imageAge : profile.age,
      lore: asRecord(profile.legendsLore),
      rivalries: asArray(profile.rivalries),
      confidence: {
        overall: Number.isFinite(profile.overallConfidence) ? profile.overallConfidence : null,
        fields: asRecord(profile.fieldConfidence),
        dossier: asRecord(profile.confidenceLedger),
        narrativeTraits: asRecord(profile.narrativeTraitConfidence),
      },
      personalityEvidence: asArray(profile.personalityEvidence),
      researchFlags: asArray(profile.researchFlags),
      identityClaims: asArray(profile.identityClaims),
      provenance: asRecord(profile.provenance),
    },
  };
});

if (humanProfiles.size !== source.playerCount) fail('source playerCount does not match unique player IDs');
for (const type of profileTypes) {
  if (profileCounts[type] !== source.profileCounts?.[type]) fail(`${type} count does not match source metadata`);
}

const payload = {
  schemaVersion: 'historical-legends-app-v1',
  sourceEditionId: source.editionId,
  sourceContentHash: source.contentHash,
  sourceSha256,
  generatedAt: String(source.generatedAt ?? new Date(0).toISOString()),
  playerCount: humanProfiles.size,
  profileCount: players.length,
  profileCounts,
  players,
};

const payloadBytes = `${JSON.stringify(payload, null, 2)}\n`;
const assetSha256 = createHash('sha256').update(payloadBytes).digest('hex');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, payloadBytes);
console.log(`[historical-legends-app-data] wrote ${players.length} cards for ${humanProfiles.size} players`);
console.log(`[historical-legends-app-data] source sha256 ${sourceSha256}`);
console.log(`[historical-legends-app-data] asset sha256 ${assetSha256}`);
