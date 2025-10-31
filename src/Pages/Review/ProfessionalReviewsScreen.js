// src/Pages/Reviews/ProfessionalReviewsScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    SafeAreaView,
    ActivityIndicator,
    FlatList,
    Modal,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const { width } = Dimensions.get('window');

const ProfessionalReviewsScreen = ({ route, navigation }) => {
  const { professionalId, professionalName } = route.params;
  const { tokens, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({});
  const [sortBy, setSortBy] = useState('recent');
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const sortOptions = [
    { id: 'recent', label: 'Most Recent' },
    { id: 'helpful', label: 'Most Helpful' },
    { id: 'rating_high', label: 'Highest Rated' },
    { id: 'rating_low', label: 'Lowest Rated' },
  ];

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': tokens?.accessToken ? `Bearer ${tokens.accessToken}` : ''
  });

  useEffect(() => {
    fetchReviews();
  }, [sortBy]);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/reviews/professional/${professionalId}?page=${page}&limit=10&sort=${sortBy}`,
        { headers: getAuthHeaders() }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setReviews(page === 1 ? data.data.reviews : [...reviews, ...data.data.reviews]);
        setSummary(data.data.summary);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId, vote) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ vote }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReviews(prevReviews =>
          prevReviews.map(review =>
            review._id === reviewId
              ? { ...review, helpful: data.data.helpful }
              : review
          )
        );
      }
    } catch (error) {
      console.error('Vote review error:', error);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const renderRatingBar = (rating, count) => {
    const percentage = summary?.total > 0 ? (count / summary.total) * 100 : 0;
    
    return (
      <View style={styles.ratingBarContainer}>
        <Text style={styles.ratingBarLabel}>{rating}</Text>
        <Icon name="star" size={12} color="#FFD700" style={styles.ratingBarIcon} />
        <View style={styles.ratingBarTrack}>
          <View 
            style={[styles.ratingBarFill, { width: `${percentage}%` }]} 
          />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const ReviewSummaryCard = () => {
    if (!summary) return null;

    const averageRating = summary.averageRating || 0;

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.averageRatingContainer}>
            <View style={styles.professionalBadge}>
              <Icon name="person" size={24} color="#FF6B9D" />
            </View>
            <Text style={styles.averageRatingText}>
              {averageRating.toFixed(1)}
            </Text>
            <View style={styles.averageStars}>
              {renderStars(Math.round(averageRating))}
            </View>
            <Text style={styles.totalReviewsText}>
              Based on {summary.total} review{summary.total !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.ratingBarsContainer}>
            {[5, 4, 3, 2, 1].map(rating =>
              renderRatingBar(rating, summary.breakdown[rating] || 0)
            )}
          </View>
        </View>
      </View>
    );
  };

  const ReviewItem = ({ review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Image
            source={{
              uri: review.user?.profilePicture || 'https://via.placeholder.com/40x40'
            }}
            style={styles.reviewerAvatar}
          />
          <View style={styles.reviewerDetails}>
            <View style={styles.reviewerNameRow}>
              <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
              {review.isVerifiedPurchase && (
                <View style={styles.verifiedBadge}>
                  <Icon name="checkmark-circle" size={12} color="#2ECC71" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
            {review.serviceId && (
              <View style={styles.serviceTag}>
                <Icon name="cut-outline" size={12} color="#FF6B9D" />
                <Text style={styles.serviceTagText}>{review.serviceId.name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.reviewRating}>
          {renderStars(review.rating)}
        </View>
      </View>

      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}

      {review.media && review.media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaScroll}
        >
          {review.media.map((media, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImageIndex({ review, index })}
            >
              <Image
                source={{ uri: media.url }}
                style={styles.reviewMedia}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.reviewFooter}>
        <View style={styles.helpfulSection}>
          <Text style={styles.helpfulText}>Helpful?</Text>
          <TouchableOpacity
            style={styles.helpfulButton}
            onPress={() => handleVote(review._id, 'up')}
          >
            <Icon name="thumbs-up-outline" size={16} color="#7F8C8D" />
            <Text style={styles.helpfulCount}>{review.helpful || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {review.adminResponse && (
        <View style={styles.adminResponse}>
          <View style={styles.adminResponseHeader}>
            <Icon name="business" size={16} color="#FF6B9D" />
            <Text style={styles.adminResponseTitle}>Response from Store</Text>
          </View>
          <Text style={styles.adminResponseText}>
            {review.adminResponse.comment}
          </Text>
          <Text style={styles.adminResponseDate}>
            {formatDate(review.adminResponse.respondedAt)}
          </Text>
        </View>
      )}
    </View>
  );

  const SortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.sortModalContent}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Icon name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOption,
                sortBy === option.id && styles.sortOptionActive
              ]}
              onPress={() => {
                setSortBy(option.id);
                setShowSortModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.id && styles.sortOptionTextActive
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.id && (
                <Icon name="checkmark" size={20} color="#FF6B9D" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ImageViewModal = () => {
    if (!selectedImageIndex) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImageIndex(null)}
          >
            <Icon name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          <Image
            source={{ uri: selectedImageIndex.review.media[selectedImageIndex.index].url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {professionalName}
          </Text>
          <Text style={styles.headerSubtitle}>Professional Reviews</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading && reviews.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={({ item }) => <ReviewItem review={item} />}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <>
              <ReviewSummaryCard />
              
              <View style={styles.sortContainer}>
                <Text style={styles.reviewsCountText}>
                  {summary?.total || 0} Review{summary?.total !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => setShowSortModal(true)}
                >
                  <Text style={styles.sortButtonText}>
                    {sortOptions.find(o => o.id === sortBy)?.label}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#7F8C8D" />
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="person-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to review this professional!
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (pagination.current < pagination.pages && !loading) {
              fetchReviews(pagination.current + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <SortModal />
      <ImageViewModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FF6B9D',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  listContent: {
    paddingBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    gap: 30,
  },
  averageRatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  averageRatingText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  averageStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  totalReviewsText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  ratingBarsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: '#2C3E50',
    width: 10,
  },
  ratingBarIcon: {
    marginRight: 4,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  ratingBarCount: {
    fontSize: 12,
    color: '#7F8C8D',
    width: 30,
    textAlign: 'right',
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewsCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2ECC71',
  },
  reviewDate: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 12,
  },
  mediaScroll: {
    marginBottom: 12,
  },
  reviewMedia: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#F5F5F5',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpfulText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
  },
  helpfulCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  adminResponse: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF5F8',
    padding: 12,
    borderRadius: 8,
  },
  adminResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adminResponseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  adminResponseText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
    marginBottom: 6,
  },
  adminResponseDate: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: '#FFE8F0',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#7F8C8D',
  },
  sortOptionTextActive: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: width,
  },
});

export default ProfessionalReviewsScreen;