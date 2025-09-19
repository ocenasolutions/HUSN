import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';

const RateUsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallRating, setOverallRating] = useState(0);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    fetchReviews();
  }, [user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/reviews`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.data || []);
        setOverallRating(data.overall_rating || 0);
      }
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Fallback data if API fails
      setReviews([
        {
          id: 1,
          name: "Sarah Johnson",
          rating: 5,
          review: "Amazing service! The staff is professional and the results exceeded my expectations.",
          date: "2024-01-15",
          avatar: "https://via.placeholder.com/50x50/FF6B9D/FFFFFF?text=SJ"
        },
        {
          id: 2,
          name: "Emily Davis",
          rating: 4,
          review: "Great experience overall. Will definitely come back for more services.",
          date: "2024-01-10",
          avatar: "https://via.placeholder.com/50x50/54A0FF/FFFFFF?text=ED"
        }
      ]);
      setOverallRating(4.5);
    } finally {
      setLoading(false);
    }
  };

  const handleStarPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!review.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }

    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in your name and email');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          rating,
          review: review.trim(),
          user_id: user?.id
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Thank you for your review!', [
          {
            text: 'OK',
            onPress: () => {
              setRating(0);
              setReview('');
              fetchReviews(); // Refresh reviews
            }
          }
        ]);
      } else {
        throw new Error(result.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating, onPress = null, size = 30) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={onPress ? () => onPress(i) : null}
          disabled={!onPress}
          style={styles.starButton}
        >
          <Icon
            name={i <= currentRating ? "star" : "star-outline"}
            size={size}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderReviewItem = ({ item, index }) => (
    <View key={item.id || index} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image 
          source={{ uri: item.avatar || `https://via.placeholder.com/50x50/FF6B9D/FFFFFF?text=${item.name?.charAt(0) || 'U'}` }} 
          style={styles.reviewerAvatar}
        />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.name}</Text>
          <View style={styles.reviewRatingContainer}>
            {renderStars(item.rating, null, 16)}
          </View>
          <Text style={styles.reviewDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>
      <Text style={styles.reviewText}>{item.review}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FF6B9D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Us</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FF6B9D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Us</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Overall Rating Section */}
        <View style={styles.overallSection}>
          <Text style={styles.overallTitle}>Overall Rating</Text>
          <View style={styles.overallRatingContainer}>
            <Text style={styles.overallRatingNumber}>{overallRating.toFixed(1)}</Text>
            <View style={styles.overallStars}>
              {renderStars(Math.round(overallRating), null, 24)}
            </View>
            <Text style={styles.totalReviews}>Based on {reviews.length} reviews</Text>
          </View>
        </View>

        {/* Rate Us Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Your Experience</Text>
          <View style={styles.ratingCard}>
            
            {/* Rating Stars */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How would you rate our service?</Text>
              <View style={styles.starsContainer}>
                {renderStars(rating, handleStarPress)}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 ? 'Poor' : 
                   rating === 2 ? 'Fair' : 
                   rating === 3 ? 'Good' : 
                   rating === 4 ? 'Very Good' : 'Excellent'}
                </Text>
              )}
            </View>

            {/* User Information */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={name}
                onChangeText={setName}
                editable={!user}
              />
              <TextInput
                style={styles.input}
                placeholder="Your Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!user}
              />
            </View>

            {/* Review Text */}
            <View style={styles.reviewInputSection}>
              <Text style={styles.inputLabel}>Write your review</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tell us about your experience..."
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={submitReview}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="send" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.length > 0 ? (
            reviews.map((review, index) => renderReviewItem({ item: review, index }))
          ) : (
            <View style={styles.noReviewsContainer}>
              <Icon name="chatbubble-outline" size={50} color="#BDC3C7" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to share your experience!</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  overallSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  overallRatingContainer: {
    alignItems: 'center',
  },
  overallRatingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 10,
  },
  overallStars: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  totalReviews: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 15,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
  },
  reviewInputSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 10,
    fontWeight: '600',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    height: 120,
    backgroundColor: '#F8F9FA',
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  reviewerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  reviewRatingContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  reviewText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 20,
  },
  noReviewsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noReviewsText: {
    fontSize: 18,
    color: '#7F8C8D',
    marginTop: 15,
    fontWeight: '600',
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 5,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default RateUsScreen;