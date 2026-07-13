import client from '@/src/api/client';
import { SkeletonListItem, SkeletonPostCard } from '@/src/components/Skeleton';
import ReportContentSheet from '@/src/components/ReportContentSheet';
import { usePopOnActivate } from '@/src/hooks/usePopOnActivate';
import { formatCount } from '@/src/utils/formatCount';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PostUser = { id: number; name: string; username: string | null; avatar: string | null };

type Post = {
  id: number; user_id: number; user: PostUser;
  post_type: string; body: string; images: string[] | null;
  puso_count: number; dislike_count: number; comments_count: number; views_count: number;
  has_reacted: boolean; has_disliked: boolean; has_saved: boolean; created_at: string;
};

type Comment = {
  id: number; user_id: number; body: string; created_at: string;
  user: PostUser;
  replies: Comment[];
};

type CommentsPage = { data: Comment[]; current_page: number; last_page: number };

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { labelEn: string; labelTl: string; bg: string; text: string; emoji: string }> = {
  recipe_share: { labelEn: 'Recipe',     labelTl: 'Recipe',     bg: '#FDEFC9', text: '#9A6A12', emoji: '🍲' },
  price_tip:    { labelEn: 'Price Tip',  labelTl: 'Presyo',     bg: '#EFF4EC', text: '#386641', emoji: '💰' },
  budget_win:   { labelEn: 'Budget Win', labelTl: 'Budget Win', bg: '#EFF4EC', text: '#2C5234', emoji: '🏆' },
  general:      { labelEn: 'General',    labelTl: 'General',    bg: '#F9EDD3', text: '#292522', emoji: '💬' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function timeAgo(iso: string, lang: 'en' | 'tl' = 'tl') {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return lang === 'en' ? 'Just now' : 'Kakapost';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function isEditable(iso: string) {
  return (Date.now() - new Date(iso).getTime()) < 72 * 60 * 60 * 1000;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 9 }: { user: PostUser; size?: number }) {
  const px  = size * 4;
  const uri = user.avatar ? `${API_URL}${user.avatar}` : null;
  return uri ? (
    <Image source={{ uri }} style={{ width: px, height: px, borderRadius: px / 2 }} />
  ) : (
    <View
      style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: '#EFF4EC', alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: px * 0.35, fontFamily: 'NunitoSans_700Bold', color: '#386641' }}>
        {initials(user.name)}
      </Text>
    </View>
  );
}

// ─── Comment row ───────────────────────────────────────────────────────────────

function CommentRow({
  comment, myId, onDelete, onEdit, onReply,
}: {
  comment: Comment;
  myId: number;
  onDelete: (id: number) => void;
  onEdit: (id: number, currentBody: string) => void;
  onReply: (user: PostUser) => void;
}) {
  const { lang } = useLanguage();
  const renderComment = (c: Comment, isReply = false) => {
    const isMine  = c.user_id === myId;
    const canEdit = isMine && isEditable(c.created_at);

    return (
      <View key={c.id} className={`flex-row gap-2.5 ${isReply ? 'ml-10 mt-2' : ''}`}>
        <Avatar user={c.user} size={isReply ? 7 : 8} />
        <View className="flex-1">
          <View className="bg-cream-50 rounded-2xl rounded-tl-none px-3 py-2">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 12, color: '#292522' }}>
                {c.user.name}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>
                  {timeAgo(c.created_at, lang)}
                </Text>
                {canEdit && (
                  <Pressable onPress={() => onEdit(c.id, c.body)} hitSlop={8} className="active:opacity-60">
                    <Ionicons name="create-outline" size={13} color="#6F655A" />
                  </Pressable>
                )}
                {isMine && (
                  <Pressable onPress={() => onDelete(c.id)} hitSlop={8} className="active:opacity-60">
                    <Ionicons name="close" size={14} color="#E24B4A" />
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#292522', lineHeight: 20 }}>
              {c.body}
            </Text>
          </View>
          <Pressable onPress={() => onReply(c.user)} className="ml-2 mt-1 active:opacity-60">
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A' }}>{lang === 'en' ? 'Reply' : 'Tumugon'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="px-4 py-3 border-b border-cream-200">
      {renderComment(comment)}
      {comment.replies?.map((reply) => (
        <View key={reply.id} className="mt-2">{renderComment(reply, true)}</View>
      ))}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PostDetailScreen() {
  const { id }        = useLocalSearchParams<{ id: string }>();
  const router        = useRouter();
  const { user: me }  = useAuth();
  const { lang }      = useLanguage();
  const qc            = useQueryClient();
  const insets        = useSafeAreaInsets();
  const inputRef      = useRef<TextInput>(null);

  // Comment input state
  const [body,        setBody]        = useState('');
  const [replyTo,     setReplyTo]     = useState<PostUser | null>(null);

  // Edit post inline
  const [editingPost,    setEditingPost]    = useState(false);
  const [editPostBody,   setEditPostBody]   = useState('');
  const [savingPost,     setSavingPost]     = useState(false);

  // Edit comment inline
  const [editCommentId,   setEditCommentId]   = useState<number | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [savingComment,   setSavingComment]   = useState(false);

  // Fetch post
  const { data: postData, isLoading: postLoading } = useQuery<{ post: Post }>({
    queryKey: ['post', id],
    queryFn:  () => client.get(`/community/post/${id}`).then((r) => r.data),
    staleTime: 30_000,
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading, refetch, isRefetching } = useQuery<CommentsPage>({
    queryKey: ['comments', id],
    queryFn:  () => client.get(`/community/post/${id}/comments`).then((r) => r.data),
    staleTime: 30_000,
  });

  const [reacted,      setReacted]      = useState<boolean | null>(null);
  const [pusoCount,    setPusoCount]    = useState<number | null>(null);
  const [disliked,     setDisliked]     = useState<boolean | null>(null);
  const [dislikeCount, setDislikeCount] = useState<number | null>(null);
  const [saved,        setSaved]        = useState<boolean | null>(null);

  const post         = postData?.post;
  const isReacted    = reacted      ?? (post?.has_reacted  ?? false);
  const thisPuso     = pusoCount    ?? (post?.puso_count   ?? 0);
  const isDisliked   = disliked     ?? (post?.has_disliked ?? false);
  const thisDislike  = dislikeCount ?? (post?.dislike_count ?? 0);
  const isSaved      = saved        ?? (post?.has_saved    ?? false);
  const likeScale    = usePopOnActivate(isReacted);
  const dislikeScale = usePopOnActivate(isDisliked);
  const comments  = commentsData?.data ?? [];
  const meta      = TYPE_META[post?.post_type ?? 'general'] ?? TYPE_META.general;

  const isMyPost  = post?.user_id === me?.id;
  const canEditPost = isMyPost && post ? isEditable(post.created_at) : false;

  // ── Like / Dislike / Save ────────────────────────────────────────────────────

  const toggleLike = async () => {
    if (!post) return;
    const was = isReacted;
    setReacted(!was);
    setPusoCount(thisPuso + (was ? -1 : 1));
    try {
      await client.post(`/community/post/${post.id}/react`);
      qc.invalidateQueries({ queryKey: ['community-feed'] });
    } catch {
      setReacted(was);
      setPusoCount(thisPuso);
    }
  };

  const toggleDislike = async () => {
    if (!post) return;
    const was = isDisliked;
    setDisliked(!was);
    setDislikeCount(thisDislike + (was ? -1 : 1));
    try {
      await client.post(`/community/post/${post.id}/dislike`);
    } catch {
      setDisliked(was);
      setDislikeCount(thisDislike);
    }
  };

  const toggleSave = async () => {
    if (!post) return;
    const was = isSaved;
    setSaved(!was);
    try {
      await client.post(`/community/post/${post.id}/save`);
    } catch {
      setSaved(was);
    }
  };

  // ── Edit post ────────────────────────────────────────────────────────────────

  const startEditPost = () => {
    setEditPostBody(post?.body ?? '');
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    if (!editPostBody.trim()) return;
    setSavingPost(true);
    try {
      await client.patch(`/community/post/${id}`, { body: editPostBody.trim() });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['community-feed'] });
      setEditingPost(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not edit post.' : 'Hindi ma-edit ang post.'));
    } finally {
      setSavingPost(false);
    }
  };

  // ── Delete post ──────────────────────────────────────────────────────────────

  const deletePost = () => {
    Alert.alert(
      lang === 'en' ? 'Delete this post?' : 'I-delete ang post?',
      lang === 'en' ? 'This cannot be undone.' : 'Hindi na ito mababalik pa.',
      [
        { text: lang === 'en' ? 'Cancel' : 'Huwag', style: 'cancel' },
        {
          text: lang === 'en' ? 'Delete' : 'I-delete', style: 'destructive', onPress: async () => {
            await client.delete(`/community/post/${id}`);
            qc.invalidateQueries({ queryKey: ['community-feed'] });
            router.back();
          },
        },
      ]);
  };

  // ── Submit comment ───────────────────────────────────────────────────────────

  const { mutate: submitComment, isPending: sending } = useMutation({
    mutationFn: (text: string) =>
      client.post(`/community/post/${id}/comments`, { body: text }),
    onSuccess: () => {
      setBody('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onError: () => Alert.alert('Error', lang === 'en' ? 'Could not send comment. Please try again.' : 'Hindi ma-send ang komento. Subukan ulit.'),
  });

  const handleSend = () => {
    const text = replyTo ? `@${replyTo.name.split(' ')[0]} ${body.trim()}` : body.trim();
    if (text) submitComment(text);
  };

  // ── Edit comment ─────────────────────────────────────────────────────────────

  const startEditComment = (commentId: number, currentBody: string) => {
    setEditCommentId(commentId);
    setEditCommentBody(currentBody);
  };

  const saveEditComment = async () => {
    if (!editCommentBody.trim() || !editCommentId) return;
    setSavingComment(true);
    try {
      await client.patch(`/community/comment/${editCommentId}`, { body: editCommentBody.trim() });
      qc.invalidateQueries({ queryKey: ['comments', id] });
      setEditCommentId(null);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? (lang === 'en' ? 'Could not edit comment.' : 'Hindi ma-edit ang komento.'));
    } finally {
      setSavingComment(false);
    }
  };

  // ── Delete comment ───────────────────────────────────────────────────────────

  const { mutate: deleteComment } = useMutation({
    mutationFn: (commentId: number) => client.delete(`/community/comment/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const confirmDelete = (commentId: number) => {
    Alert.alert(lang === 'en' ? 'Delete this comment?' : 'I-delete ang komento?', '', [
      { text: lang === 'en' ? 'Cancel' : 'Huwag', style: 'cancel' },
      { text: lang === 'en' ? 'Delete' : 'I-delete', style: 'destructive', onPress: () => deleteComment(commentId) },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFCF5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F9EDD3', flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={20} color="#292522" />
        </Pressable>
        <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: 16, color: '#292522', flex: 1 }}>Post</Text>
        {!isMyPost && (
          <Pressable onPress={() => setReportSheetOpen(true)} hitSlop={8}>
            <Ionicons name="flag-outline" size={18} color="#B0A18C" />
          </Pressable>
        )}
        {isMyPost && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEditPost && (
              <Pressable onPress={startEditPost} hitSlop={8}>
                <Ionicons name="create-outline" size={19} color="#6F655A" />
              </Pressable>
            )}
            <Pressable onPress={deletePost} hitSlop={8}>
              <Ionicons name="trash-outline" size={19} color="#E24B4A" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Edit comment modal row */}
      {editCommentId !== null && (
        <View style={{ backgroundColor: '#FDEFC9', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8D076', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            style={{ flex: 1, fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#292522', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 80 }}
            value={editCommentBody}
            onChangeText={setEditCommentBody}
            multiline
            autoFocus
          />
          <Pressable onPress={saveEditComment} disabled={savingComment} style={{ backgroundColor: '#386641', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            {savingComment ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontFamily: 'NunitoSans_700Bold', fontSize: 12 }}>{lang === 'en' ? 'Save' : 'I-save'}</Text>}
          </Pressable>
          <Pressable onPress={() => setEditCommentId(null)}>
            <Text style={{ color: '#6F655A', fontSize: 14 }}>✕</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={comments}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            myId={me?.id ?? -1}
            onDelete={confirmDelete}
            onEdit={startEditComment}
            onReply={(user) => {
              setReplyTo(user);
              inputRef.current?.focus();
            }}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#386641" />}
        ListHeaderComponent={
          postLoading ? (
            <View style={{ padding: 16 }}>
              <SkeletonPostCard />
              {[0, 1].map((i) => <SkeletonListItem key={i} />)}
            </View>
          ) : post ? (
            <View>
              {/* Post card */}
              <View style={{ backgroundColor: '#fff', padding: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F9EDD3' }}>
                {/* Author */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Pressable onPress={() => router.push(`/user/${post.user_id}` as any)}>
                    <Avatar user={post.user} size={9} />
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => router.push(`/user/${post.user_id}` as any)}>
                    <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 14, color: '#292522' }}>{post.user.name}</Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#6F655A' }}>{timeAgo(post.created_at, lang)}</Text>
                  </Pressable>
                  <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: meta.bg }}>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: meta.text }}>
                      {meta.emoji} {lang === 'en' ? meta.labelEn : meta.labelTl}
                    </Text>
                  </View>
                </View>

                {/* Body or edit */}
                {editingPost ? (
                  <View style={{ marginBottom: 12 }}>
                    <TextInput
                      style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#292522', backgroundColor: '#FFFCF5', borderRadius: 12, padding: 12, minHeight: 80, borderWidth: 1, borderColor: '#D1FAE5' }}
                      value={editPostBody}
                      onChangeText={setEditPostBody}
                      multiline
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Pressable
                        onPress={saveEditPost}
                        disabled={savingPost}
                        style={{ flex: 1, backgroundColor: '#386641', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                      >
                        {savingPost ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: 'white' }}>{lang === 'en' ? 'Save' : 'I-save'}</Text>}
                      </Pressable>
                      <Pressable
                        onPress={() => setEditingPost(false)}
                        style={{ flex: 1, backgroundColor: '#F9EDD3', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                      >
                        <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: '#6F655A' }}>{lang === 'en' ? 'Cancel' : 'Kanselahin'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: '#292522', lineHeight: 22, marginBottom: 12 }}>{post.body}</Text>
                )}

                {/* Images */}
                {Array.isArray(post.images) && post.images.length > 0 && (
                  post.images.length === 1 ? (
                    <Image source={{ uri: post.images[0] }} style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 12, resizeMode: 'cover' }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                      {post.images.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={{ width: 180, height: 150, borderRadius: 10, resizeMode: 'cover' }} />
                      ))}
                    </ScrollView>
                  )
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F9EDD3', alignItems: 'center' }}>
                  <Pressable onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                      <Ionicons name={isReacted ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={isReacted ? '#386641' : '#B0A18C'} />
                    </Animated.View>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: isReacted ? '#386641' : '#B0A18C' }}>{thisPuso}</Text>
                  </Pressable>
                  <Pressable onPress={toggleDislike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
                      <Ionicons name={isDisliked ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={isDisliked ? '#E24B4A' : '#B0A18C'} />
                    </Animated.View>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, color: isDisliked ? '#E24B4A' : '#B0A18C' }}>{thisDislike}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="chatbubble-outline" size={16} color="#B0A18C" />
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{post.comments_count}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="eye-outline" size={16} color="#B0A18C" />
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A' }}>{formatCount(post.views_count)}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={toggleSave} hitSlop={8}>
                    <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? '#F4B942' : '#B0A18C'} />
                  </Pressable>
                </View>
              </View>

              {/* Comments heading */}
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, color: '#6F655A', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 8 }}>
                {lang === 'en' ? 'Comments' : 'Mga Komento'} ({commentsData?.data.length ?? 0})
              </Text>
              {commentsLoading && <ActivityIndicator color="#386641" style={{ marginTop: 16 }} />}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !commentsLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 32, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>💬</Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 13, color: '#6F655A', textAlign: 'center' }}>
                {lang === 'en' ? 'No comments yet. Be the first!' : 'Wala pang komento. Maging una!'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 12 }}
      />

      {/* Reply banner */}
      {replyTo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF4EC', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#DCE8D6' }}>
          <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: '#386641', flex: 1 }}>
            ↩ {lang === 'en' ? 'Replying to' : 'Tumutugon kay'} <Text style={{ fontFamily: 'NunitoSans_700Bold' }}>{replyTo.name.split(' ')[0]}</Text>
          </Text>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
            <Ionicons name="close" size={15} color="#6F655A" />
          </Pressable>
        </View>
      )}

      {/* Input bar — padded for Android nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F9EDD3' }}>
        {me && <Avatar user={{ id: me.id, name: me.name, username: me.username ?? null, avatar: me.avatar ?? null }} size={8} />}
        <TextInput
          ref={inputRef}
          style={{ flex: 1, backgroundColor: '#F9EDD3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: 'NunitoSans_400Regular', color: '#292522', maxHeight: 100 }}
          placeholder={
            replyTo
              ? (lang === 'en' ? `Reply to ${replyTo.name.split(' ')[0]}...` : `Tumugon kay ${replyTo.name.split(' ')[0]}...`)
              : (lang === 'en' ? 'Write a comment...' : 'Sumulat ng komento...')
          }
          placeholderTextColor="#B0A18C"
          value={body}
          onChangeText={setBody}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!body.trim() || sending}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#C45E3A', alignItems: 'center', justifyContent: 'center', opacity: !body.trim() || sending ? 0.4 : 1 }}
        >
          {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="arrow-up" size={17} color="#fff" />}
        </Pressable>
      </View>
      <ReportContentSheet visible={reportSheetOpen} onClose={() => setReportSheetOpen(false)} contentType="post" contentId={Number(id)} />
    </KeyboardAvoidingView>
  );
}
