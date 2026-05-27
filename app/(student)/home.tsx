// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit, startAfter, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

interface Post {
  id: string;
  clubId: string;
  clubName: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  createdAt: number;
}

const PAGE_SIZE = 5;

export default function StudentHome() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [likedPosts, setLikedPosts] = useState<string[]>([]);

  // Fetch posts from joined clubs or all posts if no clubs joined
  const joinedClubs = profile?.joinedClubs || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching
  } = useInfiniteQuery({
    queryKey: ['feedPosts', joinedClubs],
    initialPageParam: null as any,
    queryFn: async ({ pageParam }) => {
      let q;
      
      if (joinedClubs.length > 0) {
        // Query posts from joined clubs, ordered by creation time
        q = query(
          collection(db, 'posts'),
          where('clubId', 'in', joinedClubs),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      } else {
        // Fallback: Query all recent posts if user hasn't joined any clubs
        q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (pageParam) {
        q = query(q, startAfter(pageParam));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      return { posts, lastVisible };
    },
    getNextPageParam: (lastPage) => lastPage.lastVisible,
  });

  const postsList = data?.pages.flatMap(page => page.posts) || [];

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(isLiked ? -1 : 1)
      });
      return { postId, isLiked };
    },
    onSuccess: ({ postId, isLiked }) => {
      // Toggle liked state locally
      if (isLiked) {
        setLikedPosts(prev => prev.filter(id => id !== postId));
      } else {
        setLikedPosts(prev => [...prev, postId]);
      }
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    }
  });

  const handleLikePress = (postId: string) => {
    const isLiked = likedPosts.includes(postId);
    likeMutation.mutate({ postId, isLiked });
  };

  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        message: `Check out this post from ${post.clubName} on CampusConnect:\n\n"${post.content}"`,
      });
    } catch (error: any) {
      console.log('Error sharing:', error.message);
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.includes(item.id);
    
    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <Image source="https://picsum.photos/50" style={styles.clubAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.clubName}>{item.clubName}</Text>
            <Text style={styles.postDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <Text style={styles.postText}>{item.content}</Text>

        {/* Post Image */}
        {item.imageUrl && (
          <Image source={item.imageUrl} style={styles.postImage} contentFit="cover" />
        )}

        {/* Post Footer Actions */}
        <View style={styles.postFooter}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleLikePress(item.id)}
            disabled={likeMutation.isPending}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={22} 
              color={isLiked ? "#FF3B30" : "#636366"} 
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {item.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={20} color="#636366" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyFeed = () => {
    if (isLoading) return null;

    if (joinedClubs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={60} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>Your Feed is Quiet</Text>
          <Text style={styles.emptySubtitle}>
            Join clubs to see posts and announcements from your favorite groups!
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/(student)/explore')}
          >
            <Text style={styles.exploreButtonText}>Explore Clubs</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={60} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>No Updates Yet</Text>
        <Text style={styles.emptySubtitle}>
          The clubs you joined haven't posted any updates yet. Check back later!
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Feed</Text>
        <TouchableOpacity style={styles.notiButton}>
          <Ionicons name="notifications-outline" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={postsList}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          ListEmptyComponent={renderEmptyFeed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.footerLoader} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  notiButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  feedContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 40,
  },
  footerLoader: {
    marginVertical: 16,
  },
  postCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clubAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  postDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  postText: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#636366',
    fontWeight: '600',
    marginLeft: 6,
  },
  likedText: {
    color: '#FF3B30',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});