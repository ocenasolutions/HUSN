import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../API/config';
import { useAuth } from '../../contexts/AuthContext';

const BookAppointmentModal = ({ visible, onClose, salon, onBookingConfirm }) => {
  const { tokens } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [dateOptions, setDateOptions] = useState([]);

  useEffect(() => {
    if (visible) {
      generateDateOptions();
    }
  }, [visible, salon]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let label = '';
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';
      else label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      
      options.push({
        date: date.toISOString().split('T')[0],
        label,
        fullDate: date
      });
    }
    
    setDateOptions(options);
    setSelectedDate(options[0].date);
  };

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/salons/${salon._id}/slots?date=${selectedDate}`
      );
      const result = await response.json();

      if (result.success) {
        setAvailableSlots(result.data.slots || []);
      } else {
        Alert.alert('Error', result.message || 'Failed to load available slots');
      }
    } catch (error) {
      console.error('Fetch slots error:', error);
      Alert.alert('Error', 'Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCountChange = (increment) => {
    const maxGuests = salon?.bookingSettings?.maxGuestsPerSlot || 5;
    const newCount = guestCount + increment;
    
    if (newCount >= 1 && newCount <= maxGuests) {
      setGuestCount(newCount);
    }
  };

  const formatTime = (time) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Incomplete', 'Please select both date and time');
      return;
    }

    const selectedSlot = availableSlots.find(slot => slot.time === selectedTime);
    const selectedDateOption = dateOptions.find(d => d.date === selectedDate);
    
    Alert.alert(
      'Confirm Booking',
      `Date: ${selectedDateOption?.label}\nTime: ${formatTime(selectedTime)}\nGuests: ${guestCount}${
        selectedSlot?.hasOffer ? `\n\nSpecial Offer: ${selectedSlot.offer.discount}% OFF!\n${selectedSlot.offer.title}` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setBookingLoading(true);

              // Prepare booking data
              const bookingData = {
                salonId: salon._id,
                bookingDate: selectedDate,
                timeSlot: selectedTime,
                numberOfGuests: guestCount,
                specialRequests: '',
              };

              console.log('Creating booking with data:', bookingData);

              // Make API call to create booking
              const response = await fetch(`${API_URL}/salon-bookings`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens?.accessToken}`,
                },
                body: JSON.stringify(bookingData),
              });

              const result = await response.json();
              console.log('Booking response:', result);

              if (result.success) {
                const booking = result.data;
                
                // Format date properly for display
                const dateLabel = selectedDateOption?.label || 'Selected date';
                const timeFormatted = formatTime(selectedTime);
                
                Alert.alert(
                  'Success!',
                  `Your appointment has been booked for ${dateLabel} at ${timeFormatted} for ${guestCount} guest(s).`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onBookingConfirm) {
                          onBookingConfirm(booking);
                        }
                        resetAndClose();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to create booking');
              }
            } catch (error) {
              console.error('Booking error:', error);
              Alert.alert('Error', 'Failed to create booking. Please try again.');
            } finally {
              setBookingLoading(false);
            }
          }
        }
      ]
    );
  };

  const resetAndClose = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setGuestCount(1);
    setAvailableSlots([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={resetAndClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={resetAndClose}>
              <Icon name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Salon Info */}
            <View style={styles.salonInfo}>
              <Text style={styles.salonName}>{salon?.name}</Text>
              <Text style={styles.salonAddress}>
                {salon?.address?.street}, {salon?.address?.city}
              </Text>
            </View>

            {/* Info Message */}
            <View style={styles.infoCard}>
              <Icon name="information-circle" size={20} color="#3498DB" />
              <Text style={styles.infoText}>
                View our service menu photos in the salon details for available services
              </Text>
            </View>

            {/* Guest Count */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Number of Guests</Text>
              <View style={styles.guestCounter}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleGuestCountChange(-1)}
                  disabled={guestCount <= 1}
                >
                  <Icon name="remove" size={20} color={guestCount <= 1 ? '#BDC3C7' : '#FF6B9D'} />
                </TouchableOpacity>
                
                <View style={styles.guestCountDisplay}>
                  <Icon name="people" size={20} color="#FF6B9D" />
                  <Text style={styles.guestCountText}>{guestCount}</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleGuestCountChange(1)}
                  disabled={guestCount >= (salon?.bookingSettings?.maxGuestsPerSlot || 5)}
                >
                  <Icon 
                    name="add" 
                    size={20} 
                    color={guestCount >= (salon?.bookingSettings?.maxGuestsPerSlot || 5) ? '#BDC3C7' : '#FF6B9D'} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Max {salon?.bookingSettings?.maxGuestsPerSlot || 5} guests per slot
              </Text>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <View style={styles.dateOptions}>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.date}
                    style={[
                      styles.dateOption,
                      selectedDate === option.date && styles.selectedDateOption
                    ]}
                    onPress={() => setSelectedDate(option.date)}
                  >
                    <Text style={[
                      styles.dateOptionText,
                      selectedDate === option.date && styles.selectedDateOptionText
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.dateSubText,
                      selectedDate === option.date && styles.selectedDateSubText
                    ]}>
                      {option.fullDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Slots */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Time</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FF6B9D" />
                  <Text style={styles.loadingText}>Loading slots...</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Icon name="calendar-outline" size={40} color="#BDC3C7" />
                  <Text style={styles.noSlotsText}>No available slots for this date</Text>
                </View>
              ) : (
                <View style={styles.timeSlots}>
                  {availableSlots.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlot,
                        selectedTime === slot.time && styles.selectedTimeSlot,
                        slot.hasOffer && styles.offerTimeSlot
                      ]}
                      onPress={() => setSelectedTime(slot.time)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedTime === slot.time && styles.selectedTimeSlotText,
                        slot.hasOffer && styles.offerTimeSlotText
                      ]}>
                        {formatTime(slot.time)}
                      </Text>
                      {slot.hasOffer && (
                        <View style={styles.offerBadge}>
                          <Text style={styles.offerBadgeText}>
                            {slot.offer.discount}% OFF
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Selected Slot Offer Details */}
            {selectedTime && availableSlots.find(s => s.time === selectedTime)?.hasOffer && (
              <View style={styles.offerDetailsCard}>
                <Icon name="gift" size={20} color="#E74C3C" />
                <View style={styles.offerDetailsText}>
                  <Text style={styles.offerDetailsTitle}>
                    {availableSlots.find(s => s.time === selectedTime).offer.title}
                  </Text>
                  {availableSlots.find(s => s.time === selectedTime).offer.description && (
                    <Text style={styles.offerDetailsDescription}>
                      {availableSlots.find(s => s.time === selectedTime).offer.description}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Book Button */}
          <TouchableOpacity
            style={[
              styles.bookButton,
              ((!selectedDate || !selectedTime) || bookingLoading) && styles.bookButtonDisabled
            ]}
            onPress={handleBooking}
            disabled={!selectedDate || !selectedTime || bookingLoading}
          >
            {bookingLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  salonInfo: {
    padding: 20,
    backgroundColor: '#FFF5F8',
  },
  salonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  salonAddress: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  guestCountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  guestCountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  helperText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 10,
  },
  dateOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  dateOption: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedDateOption: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  selectedDateOptionText: {
    color: '#fff',
  },
  dateSubText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  selectedDateSubText: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
  },
  noSlotsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  offerTimeSlot: {
    backgroundColor: '#FFF3CD',
    borderColor: '#F8D866',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  offerTimeSlotText: {
    color: '#856404',
  },
  offerBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  offerDetailsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F8D866',
  },
  offerDetailsText: {
    flex: 1,
  },
  offerDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  offerDetailsDescription: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  bookButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookAppointmentModal;