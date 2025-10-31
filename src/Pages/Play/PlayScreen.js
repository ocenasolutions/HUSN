import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  SafeAreaView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Video } from 'react-native-video';
import { API_URL } from '../../API/config';

const FOOTER_HEIGHT = 60;

const { width, height } = Dimensions.get('window');

const PlayScreen = ({ navigation }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [mediaContent, setMediaContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const flatListRef = useRef(null);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      const videosResponse = await fetch(`${API_URL}/media/videos`);
      const videosData = await videosResponse.json();
      const imagesResponse = await fetch(`${API_URL}/media/images`);
      const imagesData = await imagesResponse.json();
      const allMedia = [
        ...(videosData.data || []).map(item => ({ ...item, type: 'video' })),
        ...(imagesData.data || []).map(item => ({ ...item, type: 'image' }))
      ];
      
      const shuffledMedia = shuffleArray(allMedia);
      setMediaContent(shuffledMedia);
      
    } catch (error) {
      console.error('Error fetching media data:', error);
      setMediaContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaData();

    // Animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const openMediaModal = (media) => {
    setSelectedMedia(media);
    setModalVisible(true);
  };

  const closeMediaModal = () => {
    setModalVisible(false);
    setSelectedMedia(null);
  };

  const handleLike = (itemId) => {
    setMediaContent(prevContent => 
      prevContent.map(item => 
        item.id === itemId 
          ? { ...item, likes: (item.likes || 0) + 1, isLiked: !item.isLiked }
          : item
      )
    );
  };

  const handleShare = (item) => {
    // Handle share functionality
    console.log('Sharing:', item.title);
  };

  const handleComment = (item) => {
    // Handle comment functionality
    console.log('Commenting on:', item.title);
  };

  const handleBookmark = (itemId) => {
    setMediaContent(prevContent => 
      prevContent.map(item => 
        item.id === itemId 
          ? { ...item, isBookmarked: !item.isBookmarked }
          : item
      )
    );
  };

  const renderMediaItem = ({ item, index }) => (
    <View style={styles.reelContainer}>
      <TouchableOpacity 
        style={styles.reelTouchable}
        onPress={() => openMediaModal(item)}
        activeOpacity={1}
      >
        {/* Media Background */}
        <Image 
          source={{ uri: item.thumbnail_url || item.image_url }} 
          style={styles.reelBackground}
          resizeMode="cover"
        />
        
        {/* Dark Overlay */}
        <View style={styles.darkOverlay} />
        
        {/* Video Play Button */}
        {item.type === 'video' && (
          <View style={styles.centerPlayButton}>
            <TouchableOpacity style={styles.playButtonCircle}>
              <Icon name="play" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Header */}
        <View style={styles.reelHeader}>
          <Text style={styles.reelTitle}>Reels</Text>
          <TouchableOpacity>
            <Icon name="camera-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Bottom Content */}
        <View style={styles.reelBottomContent}>
          {/* Left Side - User Info */}
          <View style={styles.leftContent}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>@{item.username || 'username'}</Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButtonPrimary}>
                <Text style={styles.actionButtonText}>Shop this look</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButtonSecondary}>
                <Text style={styles.actionButtonSecondaryText}>Book this service</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Right Side - Social Actions */}
          <View style={styles.rightActions}>
            <TouchableOpacity 
              style={styles.socialAction}
              onPress={() => handleLike(item.id)}
            >
              <Icon 
                name={item.isLiked ? 'heart' : 'heart-outline'} 
                size={28} 
                color={item.isLiked ? '#FF3040' : '#fff'} 
              />
              <Text style={styles.socialActionText}>
                {item.likes ? `${(item.likes / 1000).toFixed(1)}K` : '1.2K'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialAction}
              onPress={() => handleComment(item)}
            >
              <Icon name="chatbubble-outline" size={26} color="#fff" />
              <Text style={styles.socialActionText}>
                {item.comments || '345'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialAction}
              onPress={() => handleShare(item)}
            >
              <Icon name="paper-plane-outline" size={26} color="#fff" />
              <Text style={styles.socialActionText}>
                {item.shares || '123'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialAction}
              onPress={() => handleBookmark(item.id)}
            >
              <Icon 
                name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={26} 
                color={item.isBookmarked ? '#fff' : '#fff'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderMediaModal = () => (
    <Modal
      visible={modalVisible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={closeMediaModal}
    >
      <View style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity 
          style={styles.modalCloseButton}
          onPress={closeMediaModal}
        >
          <Icon name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        {/* Media Content */}
        <View style={styles.modalMediaContainer}>
          {selectedMedia?.type === 'video' ? (
            <View style={styles.videoContainer}>
              {/* Video Player Placeholder */}
              <View style={styles.videoPlaceholder}>
                <Icon name="play-circle" size={80} color="#FF6B9D" />
                <Text style={styles.videoPlaceholderText}>
                  {selectedMedia?.title}
                </Text>
                <Text style={styles.videoUrl}>
                  {selectedMedia?.video_url}
                </Text>
              </View>
            </View>
          ) : (
            <Image 
              source={{ uri: selectedMedia?.image_url }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
        
        {/* Modal Actions */}
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.modalActionButton, selectedMedia?.isLiked && styles.modalLikedButton]}
            onPress={() => selectedMedia && handleLike(selectedMedia.id)}
          >
            <Icon 
              name={selectedMedia?.isLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={selectedMedia?.isLiked ? '#FF6B9D' : '#fff'} 
            />
            <Text style={[styles.modalActionText, selectedMedia?.isLiked && styles.modalLikedText]}>
              {selectedMedia?.likes || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalActionButton}
            onPress={() => selectedMedia && handleShare(selectedMedia)}
          >
            <Icon name="share-outline" size={28} color="#fff" />
            <Text style={styles.modalActionText}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={mediaContent}
          renderItem={renderMediaItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews={true}
        />
      </Animated.View>
      
      {/* Media Modal */}
      {renderMediaModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
content: {
  flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
    marginTop: 15,
  },

  // Reel Container
reelContainer: {
  width: width,
  height: height - FOOTER_HEIGHT, 
},
  reelTouchable: {
    flex: 1,
    position: 'relative',
  },
  reelBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Header
  reelHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  reelTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Center Play Button
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    zIndex: 5,
  },
  playButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },

  // Bottom Content
reelBottomContent: {
  position: 'absolute',
  bottom: FOOTER_HEIGHT + 20, // Footer height + extra padding
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  paddingHorizontal: 15,
  paddingBottom: 10, // Reduced since we're accounting for footer
  paddingTop: 20,
},


  // Left Content
  leftContent: {
    flex: 1,
    paddingRight: 15,
  },
  userInfo: {
    marginBottom: 15,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  actionButtonSecondaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Right Actions
  rightActions: {
    alignItems: 'center',
    gap: 20,
  },
  socialAction: {
    alignItems: 'center',
    gap: 5,
  },
  socialActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMediaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  
  // Video Container
  videoContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    padding: 30,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  videoUrl: {
    color: '#FF6B9D',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },

  // Modal Actions
  modalActions: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalLikedButton: {
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalLikedText: {
    color: '#FF6B9D',
  },
});

export default PlayScreen;