import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import api from '../../services/api';

export default function MapScreen() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default region - normally you'd use Geolocation here
  const initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    // In a real scenario, this would query based on coordinates / radius
    api.get('/pharmacy/list')
      .then(res => {
        if(res.data && res.data.data) {
          setPharmacies(res.data.data);
        }
      })
      .catch(err => console.log('Map fetch error', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>Nearby Pharmacies</Text>
      </View>
      
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
        >
          {pharmacies.map((pharmacy, index) => {
            // Mocking coordinates if none provided by API for demonstration
            const lat = pharmacy.latitude || (initialRegion.latitude + (Math.random() * 0.02 - 0.01));
            const lon = pharmacy.longitude || (initialRegion.longitude + (Math.random() * 0.02 - 0.01));
            
            return (
              <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lon }}
                title={pharmacy.orgName || `Pharmacy ${index + 1}`}
                description="Tap to view details"
              />
            );
          })}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
