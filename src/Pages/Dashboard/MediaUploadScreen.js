import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Header from '../../Components/Header';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

const MediaUploadScreen = ({ navigation }) => {
  const { user, tokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState('image'); 
  const [uploadMethod, setUploadMethod] = useState('file'); 
  const [mediaData, setMediaData] = useState({
    title: '',
    description: '',
    tags: '',
    featured: false,
    category: 'general',
    mediaUrl: '',
    thumbnailUrl: '',
    duration: ''
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [existingMedia, setExistingMedia] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);

  const categories = [
    'general', 'beauty', 'wellness', 'tutorials', 'before-after', 
    'tips', 'products', 'services', 'promotional'
  ];

  // Get the correct token
  const getAuthToken = () => {
    return tokens?.accessToken || user?.token || null;
  };

  useEffect(() => {
    fetchExistingMedia();
  }, []);

  const fetchExistingMedia = async () => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      const [imagesResponse, videosResponse] = await Promise.all([
        fetch(`${API_URL}/media/images`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_URL}/media/videos`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const imagesData = await imagesResponse.json();
      const videosData = await videosResponse.json();

      const allMedia = [
        ...(imagesData.data || []).map(item => ({ ...item, type: 'image' })),
        ...(videosData.data || []).map(item => ({ ...item, type: 'video' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setExistingMedia(allMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        Alert.alert('Error', 'Session expired. Please login again.');
        navigation.navigate('Login');
      }
    }
  };

  const selectMedia = () => {
    const options = {
      mediaType: uploadType === 'image' ? 'photo' : 'video',
      quality: 0.8,
      videoQuality: 'medium',
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setSelectedMedia(response.assets[0]);
      }
    });
  };

  const handleUpload = async () => {
    // Validation
    if (!mediaData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (uploadMethod === 'file' && !selectedMedia) {
      Alert.alert('Error', 'Please select a media file');
      return;
    }

    if (uploadMethod === 'url' && !mediaData.mediaUrl.trim()) {
      Alert.alert('Error', 'Please enter a media URL');
      return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      navigation.navigate('Login');
      return;
    }

    setLoading(true);

    try {
      let response;

      if (uploadMethod === 'file') {
        // File upload using FormData
        const formData = new FormData();
        formData.append('media', {
          uri: selectedMedia.uri,
          type: selectedMedia.type,
          name: selectedMedia.fileName || `${uploadType}_${Date.now()}.${selectedMedia.type.split('/')[1]}`,
        });
        
        formData.append('title', mediaData.title);
        formData.append('description', mediaData.description);
        formData.append('tags', mediaData.tags);
        formData.append('featured', mediaData.featured.toString());
        formData.append('category', mediaData.category);
        formData.append('type', uploadType);
        formData.append('duration', mediaData.duration || '');

        response = await fetch(`${API_URL}/media/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            // Don't set Content-Type for FormData - let the browser set it
          },
          body: formData,
        });
      } else {
        // URL upload using JSON
        const uploadData = {
          title: mediaData.title,
          description: mediaData.description,
          tags: mediaData.tags,
          featured: mediaData.featured,
          category: mediaData.category,
          type: uploadType,
          mediaUrl: mediaData.mediaUrl,
          thumbnailUrl: mediaData.thumbnailUrl || '',
          duration: mediaData.duration || (uploadType === 'video' ? '0:00' : '')
        };

        response = await fetch(`${API_URL}/media/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(uploadData),
        });
      }

      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', `${uploadType === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
        resetForm();
        fetchExistingMedia();
      } else {
        Alert.alert('Error', result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMediaData({
      title: '',
      description: '',
      tags: '',
      featured: false,
      category: 'general',
      mediaUrl: '',
      thumbnailUrl: '',
      duration: ''
    });
    setSelectedMedia(null);
  };

  const deleteMedia = async (mediaId, mediaType) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this ${mediaType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = getAuthToken();
              if (!authToken) {
                Alert.alert('Error', 'Authentication token not found. Please login again.');
                navigation.navigate('Login');
                return;
              }

              const response = await fetch(`${API_URL}/media/${mediaId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
              });

              const result = await response.json();

              if (result.success) {
                Alert.alert('Success', 'Media deleted successfully');
                fetchExistingMedia();
              } else {
                Alert.alert('Error', result.message || 'Delete failed');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete media');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (media) => {
    setEditingMedia(media);
    setEditModalVisible(true);
  };

  const updateMedia = async () => {
    if (!editingMedia.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/media/${editingMedia._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: editingMedia.title,
          description: editingMedia.description,
          tags: editingMedia.tags,
          featured: editingMedia.featured,
          category: editingMedia.category,
          mediaUrl: editingMedia.mediaUrl || '',
          thumbnailUrl: editingMedia.thumbnailUrl || '',
          duration: editingMedia.duration || ''
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', 'Media updated successfully');
        setEditModalVisible(false);
        fetchExistingMedia();
      } else {
        Alert.alert('Error', result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update media');
    }
  };

  const renderMediaItem = ({ item }) => (
    <View style={styles.mediaItem}>
      <Image 
        source={{ uri: item.thumbnail_url || item.image_url || item.video_url }} 
        style={styles.mediaThumb}
        resizeMode="cover"
      />
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.mediaType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.mediaCategory}>{item.category}</Text>
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        )}
      </View>
      <View style={styles.mediaActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Icon name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteMedia(item._id, item.type)}
        >
          <Icon name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setEditModalVisible(false)}
          >
            <Icon name="close" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Media</Text>
          <TouchableOpacity 
            style={styles.modalSaveButton}
            onPress={updateMedia}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {editingMedia && (
            <>
              <Image 
                source={{ uri: editingMedia.thumbnail_url || editingMedia.image_url || editingMedia.video_url }}
                style={styles.editPreview}
                resizeMode="cover"
              />
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingMedia.title}
                  onChangeText={(text) => setEditingMedia({ ...editingMedia, title: text })}
                  placeholder="Enter media title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editingMedia.description}
                  onChangeText={(text) => setEditingMedia({ ...editingMedia, description: text })}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingMedia.tags}
                  onChangeText={(text) => setEditingMedia({ ...editingMedia, tags: text })}
                  placeholder="beauty, wellness, tutorial"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryContainer}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          editingMedia.category === category && styles.selectedCategory
                        ]}
                        onPress={() => setEditingMedia({ ...editingMedia, category })}
                      >
                        <Text style={[
                          styles.categoryText,
                          editingMedia.category === category && styles.selectedCategoryText
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.toggleButton, editingMedia.featured && styles.toggleActive]}
                onPress={() => setEditingMedia({ ...editingMedia, featured: !editingMedia.featured })}
              >
                <Icon 
                  name={editingMedia.featured ? "star" : "star-outline"} 
                  size={20} 
                  color={editingMedia.featured ? "#fff" : "#FF6B9D"} 
                />
                <Text style={[styles.toggleText, editingMedia.featured && styles.toggleActiveText]}>
                  Featured Content
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Media Upload</Text>
        </View>

        {/* Upload Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, uploadType === 'image' && styles.activeType]}
            onPress={() => setUploadType('image')}
          >
            <Icon name="image" size={20} color={uploadType === 'image' ? "#fff" : "#FF6B9D"} />
            <Text style={[styles.typeText, uploadType === 'image' && styles.activeTypeText]}>
              Image
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.typeButton, uploadType === 'video' && styles.activeType]}
            onPress={() => setUploadType('video')}
          >
            <Icon name="videocam" size={20} color={uploadType === 'video' ? "#fff" : "#FF6B9D"} />
            <Text style={[styles.typeText, uploadType === 'video' && styles.activeTypeText]}>
              Video
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Method Selector */}
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodButton, uploadMethod === 'file' && styles.activeMethod]}
            onPress={() => setUploadMethod('file')}
          >
            <Icon name="document" size={18} color={uploadMethod === 'file' ? "#fff" : "#54A0FF"} />
            <Text style={[styles.methodText, uploadMethod === 'file' && styles.activeMethodText]}>
              Upload File
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.methodButton, uploadMethod === 'url' && styles.activeMethod]}
            onPress={() => setUploadMethod('url')}
          >
            <Icon name="link" size={18} color={uploadMethod === 'url' ? "#fff" : "#54A0FF"} />
            <Text style={[styles.methodText, uploadMethod === 'url' && styles.activeMethodText]}>
              Use URL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media Selection/URL Input */}
        {uploadMethod === 'file' ? (
          <TouchableOpacity style={styles.mediaSelector} onPress={selectMedia}>
            {selectedMedia ? (
              <View style={styles.selectedMediaContainer}>
                <Image 
                  source={{ uri: selectedMedia.uri }} 
                  style={styles.selectedMedia}
                  resizeMode="cover"
                />
                <View style={styles.selectedMediaOverlay}>
                  <Icon name="checkmark-circle" size={30} color="#4CAF50" />
                  <Text style={styles.selectedMediaText}>
                    {uploadType === 'image' ? 'Image Selected' : 'Video Selected'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.mediaSelectorContent}>
                <Icon 
                  name={uploadType === 'image' ? 'image-outline' : 'videocam-outline'} 
                  size={50} 
                  color="#FF6B9D" 
                />
                <Text style={styles.mediaSelectorText}>
                  Tap to select {uploadType === 'image' ? 'an image' : 'a video'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.urlInputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Media URL *</Text>
              <TextInput
                style={styles.textInput}
                value={mediaData.mediaUrl}
                onChangeText={(text) => setMediaData({ ...mediaData, mediaUrl: text })}
                placeholder={`Enter ${uploadType} URL`}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thumbnail URL (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={mediaData.thumbnailUrl}
                onChangeText={(text) => setMediaData({ ...mediaData, thumbnailUrl: text })}
                placeholder="Enter thumbnail URL"
                autoCapitalize="none"
              />
            </View>

            {uploadType === 'video' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={mediaData.duration}
                  onChangeText={(text) => setMediaData({ ...mediaData, duration: text })}
                  placeholder="e.g., 2:30"
                />
              </View>
            )}

            {/* URL Preview */}
            {mediaData.mediaUrl && (
              <View style={styles.urlPreview}>
                <Image 
                  source={{ uri: mediaData.thumbnailUrl || mediaData.mediaUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  onError={() => console.log('Image failed to load')}
                />
                <Text style={styles.urlPreviewText}>Preview</Text>
              </View>
            )}
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={mediaData.title}
              onChangeText={(text) => setMediaData({ ...mediaData, title: text })}
              placeholder="Enter media title"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={mediaData.description}
              onChangeText={(text) => setMediaData({ ...mediaData, description: text })}
              placeholder="Enter description"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.textInput}
              value={mediaData.tags}
              onChangeText={(text) => setMediaData({ ...mediaData, tags: text })}
              placeholder="beauty, wellness, tutorial"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      mediaData.category === category && styles.selectedCategory
                    ]}
                    onPress={() => setMediaData({ ...mediaData, category })}
                  >
                    <Text style={[
                      styles.categoryText,
                      mediaData.category === category && styles.selectedCategoryText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.toggleButton, mediaData.featured && styles.toggleActive]}
            onPress={() => setMediaData({ ...mediaData, featured: !mediaData.featured })}
          >
            <Icon 
              name={mediaData.featured ? "star" : "star-outline"} 
              size={20} 
              color={mediaData.featured ? "#fff" : "#FF6B9D"} 
            />
            <Text style={[styles.toggleText, mediaData.featured && styles.toggleActiveText]}>
              Featured Content
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {uploadMethod === 'file' ? 'Upload' : 'Add'} {uploadType === 'image' ? 'Image' : 'Video'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Media */}
        <View style={styles.existingMediaSection}>
          <Text style={styles.sectionTitle}>Uploaded Media ({existingMedia.length})</Text>
          <FlatList
            data={existingMedia}
            renderItem={renderMediaItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {renderEditModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 20,
  },
  activeType: {
    backgroundColor: '#FF6B9D',
  },
  typeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  activeTypeText: {
    color: '#fff',
  },

  // Method Selector
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  activeMethod: {
    backgroundColor: '#54A0FF',
  },
  methodText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#54A0FF',
  },
  activeMethodText: {
    color: '#fff',
  },

  // URL Input Container
  urlInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urlPreview: {
    alignItems: 'center',
    marginTop: 15,
  },
  previewImage: {
    width: 150,
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  urlPreviewText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },

  // Media Selector
  mediaSelector: {
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  mediaSelectorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaSelectorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  selectedMediaContainer: {
    flex: 1,
    position: 'relative',
  },
  selectedMedia: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  selectedMediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  selectedMediaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },

  // Form
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel:{
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Categories
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  categoryChip: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedCategory: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  selectedCategoryText: {
    color: '#fff',
  },

  // Toggle Button
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    marginBottom: 20,
  },
  toggleActive: {
    backgroundColor: '#FF6B9D',
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  toggleActiveText: {
    color: '#fff',
  },

  // Upload Button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    borderRadius: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // Existing Media
  existingMediaSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
  },
  mediaItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 15,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  mediaType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B9D',
    marginBottom: 3,
  },
  mediaCategory: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  featuredBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  mediaActions: {
    justifyContent: 'center',
  },
  actionButton: {
    width: 35,
    height: 35,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#54A0FF',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalSaveButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  editPreview: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },

  bottomSpacer: {
    height: 100,
  },
});

export default MediaUploadScreen;