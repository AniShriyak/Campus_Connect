import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface SearchItem {
  id: string;
  type: 'club' | 'event' | 'post';
  title: string;
  subtitle: string;
  imageUrl?: string;
  category?: string;
  metadata?: string;
}

export default function SearchScreen() {
  const [queryText, setQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Clubs' | 'Events' | 'Posts'>('All');

  // Fetch search index of everything (clubs, events, posts)
  const { data: searchIndex = [], isLoading } = useQuery<SearchItem[]>({
    queryKey: ['searchIndex'],
    queryFn: async () => {
      const results: SearchItem[] = [];

      // Fetch Clubs
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      clubsSnap.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'club',
          title: data.name || '',
          subtitle: data.description || '',
          imageUrl: data.logoUrl || 'https://picsum.photos/100',
          category: data.category || 'General',
          metadata: `${data.memberCount || 0} members`
        });
      });

      // Fetch Events
      const eventsSnap = await getDocs(collection(db, 'events'));
      eventsSnap.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'event',
          title: data.title || '',
          subtitle: data.description || '',
          imageUrl: data.coverImage || 'https://picsum.photos/200',
          category: data.clubName || 'Club Event',
          metadata: `${data.date} @ ${data.venue}`
        });
      });

      // Fetch Posts
      const postsSnap = await getDocs(collection(db, 'posts'));
      postsSnap.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'post',
          title: data.clubName || 'Club Post',
          subtitle: data.content || '',
          imageUrl: data.imageUrl,
          category: 'Post',
          metadata: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : ''
        });
      });

      return results;
    }
  });

  // Filter items based on tab and query text
  const filteredItems = searchIndex.filter(item => {
    const matchesTab = 
      activeTab === 'All' || 
      (activeTab === 'Clubs' && item.type === 'club') ||
      (activeTab === 'Events' && item.type === 'event') ||
      (activeTab === 'Posts' && item.type === 'post');

    const matchesQuery = 
      item.title.toLowerCase().includes(queryText.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(queryText.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(queryText.toLowerCase()));

    return matchesTab && matchesQuery;
  });

  const renderItem = ({ item, index }: { item: SearchItem; index: number }) => {
    const getBadgeColor = () => {
      switch (item.type) {
        case 'club': return '#007AFF';
        case 'event': return '#34C759';
        case 'post': return '#FF9500';
        default: return '#8E8E93';
      }
    };

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
        <TouchableOpacity style={styles.card}>
          <Image
            source={item.imageUrl || 'https://picsum.photos/100'}
            style={styles.cardImage}
            contentFit="cover"
          />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
                <Text style={styles.badgeText}>{item.type}</Text>
              </View>
              {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
            {item.metadata && <Text style={styles.cardMeta}>{item.metadata}</Text>}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs, events, posts..."
          value={queryText}
          onChangeText={setQueryText}
          placeholderTextColor="#8E8E93"
        />
        {queryText.length > 0 && (
          <TouchableOpacity onPress={() => setQueryText('')}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['All', 'Clubs', 'Events', 'Posts'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0F2',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#EEF0F2',
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },
  tabTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  categoryText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#636366',
    lineHeight: 16,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
});
