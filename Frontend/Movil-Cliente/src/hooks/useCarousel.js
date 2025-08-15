import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';

const { width } = Dimensions.get('window');


const SUBTITLE_SIZE = 18;  

const CarouselSlide = ({ title, subtitle, image, imageSource, backgroundColor }) => {
  return (
    <View style={styles.slide}>
      <View style={[styles.card, { backgroundColor }]}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {imageSource ? (
              <Image source={imageSource} style={styles.image} />
            ) : (
              <Text style={styles.imageText}>{image}</Text>
            )}
          </View>

          <View style={styles.textSection}>
            <Text style={styles.title}>{title}</Text>
            {/* SUBTÍTULO DEL CARRUSEL (más grande) */}
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
            <Text style={styles.footerText}>Últimas Contrataciones fechas</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    width,
    height: 200,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  image: {
    width: 92,
    height: 92,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  imageText: { fontSize: 50 },
  textSection: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  subtitle: {
    fontSize: SUBTITLE_SIZE,
    lineHeight: SUBTITLE_SIZE + 4,
    color: '#FFFFFF',
    opacity: 0.98,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerText: { fontSize: 12, color: '#FFFFFF', opacity: 0.8, fontWeight: '400' },
});

export default CarouselSlide;
