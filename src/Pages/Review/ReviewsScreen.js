// src/Pages/Reviews/WriteReviewScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../API/config';
import Header from '../../Components/Header';

const WriteReviewScreen = ({ route, navigation }) => {
  const { orderId, item } = route.params;
  const { tokens } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${tokens?.accessToken}`
  });

  const handleStarPress = (star) => {
    setRating(star);
  };

  const handleAddMedia = () => {
    const options = {
      mediaType: 'mixed',
      selectionLimit: 5 - media.length,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert('Error', 'Failed to pick media');
        return;
      }
      if (response.assets) {
        setMedia([...media, ...response.assets]);
      }
    });
  };

  const handleRemoveMedia = (index) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('itemId', item.itemId);
      formData.append('type', item.type);
      formData.append('rating', rating.toString());
      formData.append('comment', comment);

      if (item.type === 'professional' && item.professionalId) {
        formData.append('professionalId', item.professionalId);
      }

      media.forEach((file, index) => {
        formData.append('media', {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          type: file.type,
          name: file.fileName || `media_${index}.${file.type.split('/')[1]}`,
        });
      });

      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success!','Your review has been submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Submit review error:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'product': return 'bag-outline';
      case 'service': return 'cut-outline';
      case 'professional': return 'person-outline';
      default: return 'help-outline';
    }
  };

  const getItemTypeLabel = (type) => {
    switch (type) {
      case 'product': return 'Product';
      case 'service': return 'Service';
      case 'professional': return 'Professional';
      default: return type;
    }
  };

  const getItemTypeColor = (type) => {
    switch (type) {
      case 'product': return '#54A0FF';
      case 'service': return '#FF6B9D';
      case 'professional': return '#9B59B6';
      default: return '#7F8C8D';
    }
  };

  const getPlaceholderText = () => {
    switch (item.type) {
      case 'professional':
        return 'Tell us about your experience with this professional...';
      case 'service':
        return 'Tell us about your experience with this service...';
      case 'product':
        return 'Tell us about your experience with this product...';
      default:
        return 'Share your experience...';
    }
  };

  const typeColor = getItemTypeColor(item.type);

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
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Info */}
        <View style={[styles.itemCard, { borderLeftColor: typeColor }]}>
          <View style={[styles.imageContainer, { borderColor: typeColor }]}>
            {item.type === 'professional' ? (
              <View style={[styles.professionalIcon, { backgroundColor: typeColor + '20' }]}>
                <Icon name="person" size={32} color={typeColor} />
              </View>
            ) : (
              <Image 
                source={{ uri: item.image || 'https://via.placeholder.com/80x80' }}
                style={styles.itemImage}
              />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            {item.serviceName && (
              <Text style={styles.serviceName} numberOfLines={1}>
                Service: {item.serviceName}
              </Text>
            )}
            {item.price && <Text style={styles.itemPrice}>₹{item.price}</Text>}
            <View style={[styles.itemTypeBadge, { backgroundColor: typeColor + '20' }]}>
              <Icon 
                name={getItemIcon(item.type)} 
                size={12} 
                color={typeColor} 
              />
              <Text style={[styles.itemTypeText, { color: typeColor }]}>
                {getItemTypeLabel(item.type)}
              </Text>
            </View>
          </View>
        </View>
        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
              >
                <Icon
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#FFD700' : '#E5E5E5'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.ratingText, { color: typeColor }]}>{getRatingText()}</Text>
        </View>
        {/* Comment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Share Your Experience (Optional)
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder={getPlaceholderText()}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
            placeholderTextColor="#999"
          />
          <Text style={styles.characterCount}>
            {comment.length}/1000 characters
          </Text>
        </View>
        {/* Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Add Photos or Videos (Optional)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Help others by showing your experience
          </Text>
          <View style={styles.mediaContainer}>
            {media.map((file, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image 
                  source={{ uri: file.uri }}
                  style={styles.mediaPreview}
                />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => handleRemoveMedia(index)}
                >
                  <Icon name="close-circle" size={24} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            ))}
            {media.length < 5 && (
              <TouchableOpacity
                style={[styles.addMediaButton, { borderColor: typeColor }]}
                onPress={handleAddMedia}
              >
                <Icon name="camera-outline" size={32} color={typeColor} />
                <Text style={[styles.addMediaText, { color: typeColor }]}>Add Media</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.mediaHint}>
            You can add up to 5 images or videos
          </Text>
        </View>
        {/* Guidelines */}
        <View style={styles.guidelinesCard}>
          <View style={styles.guidelinesHeader}>
            <Icon name="information-circle-outline" size={20} color="#54A0FF" />
            <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
          </View>
          <Text style={styles.guidelinesText}>
            • Focus on your actual experience{'\n'}
            • Be honest and constructive{'\n'}
            • Avoid offensive language{'\n'}
            • Don't include personal information
          </Text>
        </View>
      </ScrollView>
      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton, 
            { backgroundColor: typeColor },
            (rating === 0 || submitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Review</Text>
              <Icon name="checkmark-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  professionalIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  itemTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  addMediaText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  mediaHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },
  guidelinesCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#54A0FF',
  },
  guidelinesText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default WriteReviewScreen;