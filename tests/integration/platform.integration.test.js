import { describe, expect, it } from 'vitest';
import { createAuthRepository } from '../../server/auth/authRepository.js';
import { createAuthService } from '../../server/auth/authService.js';
import { createCommunityRepository } from '../../server/community/communityRepository.js';
import { createCommunityService } from '../../server/community/communityService.js';
import { createCreativeRepository } from '../../server/creative/creativeRepository.js';
import { createCreativeService } from '../../server/creative/creativeService.js';
import { createProfileRepository } from '../../server/profile/profileRepository.js';
import { createProfileService } from '../../server/profile/profileService.js';
import { hasTestDatabase, withTestDatabase } from './dbTestUtils.js';

const run = hasTestDatabase() ? it : it.skip;

describe('platform persistence integration', () => {
  run('persists cross-user community interactions idempotently', async () => {
    await withTestDatabase(async db => {
      const auth = createAuthService(createAuthRepository(db));
      const community = createCommunityService(createCommunityRepository(db));
      const alice = await auth.register({ username: 'alice_it', email: 'alice@example.test', password: 'long-password-a' });
      const bob = await auth.register({ username: 'bob_it', email: 'bob@example.test', password: 'long-password-b' });

      const post = await community.createPost({
        userId: alice.user.id,
        input: { type: 'article', title: 'Shared intelligence', body: 'Evidence and analysis', visibility: 'public' },
      });
      await community.setLike({ userId: bob.user.id, postId: post.id, enabled: true });
      await community.setLike({ userId: bob.user.id, postId: post.id, enabled: true });
      await community.createComment({ userId: bob.user.id, postId: post.id, body: 'Useful evidence' });

      const visible = await community.getPost({ postId: post.id, viewerId: bob.user.id });
      const comments = await community.listComments({ postId: post.id, viewerId: alice.user.id });
      expect(visible.likeCount).toBe(1);
      expect(comments).toHaveLength(1);
      expect(comments[0].body).toBe('Useful evidence');
    });
  });

  run('keeps recommendation snapshots immutable across profile changes', async () => {
    await withTestDatabase(async db => {
      const auth = createAuthService(createAuthRepository(db));
      const profile = createProfileService(createProfileRepository(db));
      const alice = await auth.register({ username: 'profile_it', email: 'profile@example.test', password: 'long-password-a' });
      const userId = alice.user.id;

      const version2 = await profile.saveState(userId, {
        domainTiers: { ai: 'focus' },
        sourceTiers: { official: 'focus' },
        specialFollows: [],
        confidence: 60,
      });
      const snapshot = await db.query(
        `insert into recommendation_snapshots(user_id, snapshot_date, profile_version, algorithm_version, updates)
         values ($1, '2026-07-14', $2, 1, $3) returning id`,
        [userId, version2, JSON.stringify([{ id: 'item-1', totalScore: 91 }])],
      );
      await db.query(
        `insert into recommendation_items(snapshot_id, item_id, lane, position, total_score, score_parts, reasons, item_payload)
         values ($1, 'item-1', 'personal', 1, 91, $2, $3, $4)`,
        [snapshot.rows[0].id, JSON.stringify({ profile: 10 }), JSON.stringify(['tier match']), JSON.stringify({ title: 'Original' })],
      );

      await profile.saveState(userId, {
        domainTiers: { ai: 'explore' },
        sourceTiers: { official: 'explore' },
        specialFollows: [],
        confidence: 20,
        expectedVersion: version2,
      });

      const stored = await db.query(
        `select s.profile_version as "profileVersion", i.position, i.score_parts as "scoreParts", i.item_payload as "itemPayload"
         from recommendation_snapshots s
         join recommendation_items i on i.snapshot_id = s.id
         where s.user_id = $1 and s.snapshot_date = '2026-07-14'`,
        [userId],
      );
      expect(stored.rows[0].profileVersion).toBe(version2);
      expect(stored.rows[0].position).toBe(1);
      expect(stored.rows[0].scoreParts).toEqual({ profile: 10 });
      expect(stored.rows[0].itemPayload.title).toBe('Original');
    });
  });

  run('protects creative ownership and restores by appending a version', async () => {
    await withTestDatabase(async db => {
      const auth = createAuthService(createAuthRepository(db));
      const creative = createCreativeService(createCreativeRepository(db));
      const alice = await auth.register({ username: 'creative_alice_it', email: 'creative-alice@example.test', password: 'long-password-a' });
      const bob = await auth.register({ username: 'creative_bob_it', email: 'creative-bob@example.test', password: 'long-password-b' });
      const document = await creative.saveDocument(alice.user.id, { title: 'Draft', draftContent: 'one' });

      const first = await creative.saveVersion(alice.user.id, document.id, {
        clientOperationId: '11111111-1111-4111-8111-111111111111',
        title: 'Draft',
        content: 'one',
        reason: 'manual',
      });
      const second = await creative.saveVersion(alice.user.id, document.id, {
        clientOperationId: '22222222-2222-4222-8222-222222222222',
        title: 'Draft',
        content: 'two',
        reason: 'manual',
      });

      await expect(creative.listVersions(bob.user.id, document.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const restored = await creative.saveVersion(alice.user.id, document.id, {
        clientOperationId: '33333333-3333-4333-8333-333333333333',
        title: first.title,
        content: first.content,
        reason: 'restore',
      });
      const versions = await creative.listVersions(alice.user.id, document.id);
      expect(first.number).toBe(1);
      expect(second.number).toBe(2);
      expect(restored.number).toBe(3);
      expect(versions).toHaveLength(3);
      expect(versions[0].content).toBe('one');
    });
  });
});
