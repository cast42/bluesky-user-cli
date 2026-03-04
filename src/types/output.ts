import { z } from 'zod';

export const followRecordSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  description: z.string().nullable()
});

export const followsEnvelopeSchema = z.object({
  command: z.literal('follows'),
  target: z.string(),
  resolvedActor: z.string(),
  serviceUrl: z.string().url(),
  generatedAt: z.string(),
  count: z.number().int().nonnegative(),
  data: z.array(followRecordSchema)
});

export const followersEnvelopeSchema = z.object({
  command: z.literal('followers'),
  target: z.string(),
  resolvedActor: z.string(),
  serviceUrl: z.string().url(),
  generatedAt: z.string(),
  count: z.number().int().nonnegative(),
  data: z.array(followRecordSchema)
});

export const likeRecordSchema = z.object({
  uri: z.string(),
  cid: z.string(),
  authorDid: z.string(),
  authorHandle: z.string(),
  authorDisplayName: z.string().nullable(),
  text: z.string().nullable(),
  createdAt: z.string().nullable(),
  likedAt: z.string().nullable()
});

export const likesEnvelopeSchema = z.object({
  command: z.literal('likes'),
  target: z.string(),
  resolvedActor: z.string(),
  serviceUrl: z.string().url(),
  generatedAt: z.string(),
  since: z.string().nullable(),
  count: z.number().int().nonnegative(),
  data: z.array(likeRecordSchema)
});

export const postRecordSchema = z.object({
  uri: z.string(),
  cid: z.string(),
  authorDid: z.string(),
  authorHandle: z.string(),
  authorDisplayName: z.string().nullable(),
  text: z.string().nullable(),
  createdAt: z.string().nullable()
});

export const postsEnvelopeSchema = z.object({
  command: z.literal('posts'),
  target: z.string(),
  resolvedActor: z.string(),
  source: z.enum(['follows', 'followers', 'both']),
  serviceUrl: z.string().url(),
  generatedAt: z.string(),
  since: z.string().nullable(),
  count: z.number().int().nonnegative(),
  data: z.array(postRecordSchema)
});

export type FollowRecord = z.infer<typeof followRecordSchema>;
export type FollowsEnvelope = z.infer<typeof followsEnvelopeSchema>;
export type FollowersEnvelope = z.infer<typeof followersEnvelopeSchema>;

export type LikeRecord = z.infer<typeof likeRecordSchema>;
export type LikesEnvelope = z.infer<typeof likesEnvelopeSchema>;
export type PostRecord = z.infer<typeof postRecordSchema>;
export type PostsEnvelope = z.infer<typeof postsEnvelopeSchema>;

export type JsonEnvelope =
  | FollowsEnvelope
  | FollowersEnvelope
  | LikesEnvelope
  | PostsEnvelope;
