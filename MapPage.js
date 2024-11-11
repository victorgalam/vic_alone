import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const LocationsMap = () => {
    const [places, setPlaces] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [showType, setShowType] = useState('all');
    const [userLocation, setUserLocation] = useState(null);
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);

    // מרכז ברירת מחדל (תל אביב)
    const defaultCenter = {
        lat: 32.0853,
        lng: 34.7818
    };

    const mapStyles = {
        height: "70vh",
        width: "100%"
    };

    // קבלת מיקום המשתמש הנוכחי
    const getCurrentLocation = () => {
        setLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(location);
                    if (map) {
                        map.panTo(location);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error("שגיאה בקבלת המיקום:", error);
                    setLoading(false);
                }
            );
        } else {
            setLoading(false);
        }
    };

    // חיפוש מקומות לפי סוג
    const searchPlaces = useCallback((location, type) => {
        if (!map) return;        
        const service = new window.google.maps.places.PlacesService(map);
        const request = {
            location: location,
            radius: '5000', // 5 קילומטרים
            type: type === 'gym' ? ['gym'] : ['park']
        };

        service.nearbySearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                const formattedPlaces = results.map(place => ({
                    id: place.place_id,
                    name: place.name,
                    location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    },
                    rating: place.rating,
                    vicinity: place.vicinity,
                    type: type,
                    icon: type === 'gym' ?
                        'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' :
                        'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }));

                setPlaces(prev => {
                    // מיזוג תוצאות חדשות עם קיימות
                    const existingIds = new Set(prev.filter(p => p.type !== type).map(p => p.id));
                    return [...prev.filter(p => p.type !== type), ...formattedPlaces.filter(p => !existingIds.has(p.id))];
                });
            }
        });
    }, [map, userLocation]);

    // קבלת פרטים נוספים על מקום
    const getPlaceDetails = useCallback((placeId) => {
        if (!map) return;

        const service = new window.google.maps.places.PlacesService(map);
        service.getDetails({
            placeId: placeId,
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'website', 'rating', 'reviews', 'photos']
        }, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                setSelectedPlace(prev => ({
                    ...prev,
                    details: {
                        address: place.formatted_address,
                        phone: place.formatted_phone_number,
                        hours: place.opening_hours?.weekday_text,
                        website: place.website,
                        rating: place.rating,
                        reviews: place.reviews,
                        photos: place.photos
                    }
                }));
            }
        });
    }, [map]);

    // טעינת המפה
    const onMapLoad = useCallback((mapInstance) => {
        setMap(mapInstance);
    }, []);

    // עדכון חיפוש כשמשתנה הסוג או המיקום
    useEffect(() => {
        try {
            if (map && userLocation) {
                if (showType === 'all' || showType === 'gyms') {
                    searchPlaces(userLocation, 'gym');
                }
                if (showType === 'all' || showType === 'parks') {
                    searchPlaces(userLocation, 'park');
                }
            }
        } catch (e) {
            console.log('Error when get position changes', e);

        }
    }, [map, userLocation, showType, searchPlaces]);

    // קבלת מיקום ראשוני
    useEffect(() => {
        getCurrentLocation();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-center mb-4">מפת מקומות</h1>

                    {/* כפתורי סינון ומיקום */}
                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                        <div className="flex space-x-4 space-x-reverse">
                            <button
                                onClick={() => setShowType('all')}
                                className={`px-4 py-2 rounded-full transition duration-200 ${showType === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                הכל
                            </button>
                            <button
                                onClick={() => setShowType('gyms')}
                                className={`px-4 py-2 rounded-full transition duration-200 ${showType === 'gyms'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                חדרי כושר
                            </button>
                            <button
                                onClick={() => setShowType('parks')}
                                className={`px-4 py-2 rounded-full transition duration-200 ${showType === 'parks'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                פארקים
                            </button>
                        </div>

                        <button
                            onClick={getCurrentLocation}
                            className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition duration-200"
                            disabled={loading}
                        >
                            {loading ? 'מאתר מיקום...' : 'מצא את המיקום שלי'}
                        </button>
                    </div>

                    {/* מפה */}
                    <LoadScript  libraries={['places']}>
                        <GoogleMap
                            mapContainerStyle={mapStyles}
                            zoom={14}
                            center={userLocation || defaultCenter}
                            onLoad={onMapLoad}
                        >
                            {/* סמן המיקום שלי */}
                            {userLocation && (
                                <Marker
                                    position={userLocation}
                                    icon={{
                                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                        scaledSize: new window.google.maps.Size(40, 40)
                                    }}
                                />
                            )}

                            {/* סמני המקומות */}
                            {places.map(place => (
                                <Marker
                                    key={place.id}
                                    position={place.location}
                                    icon={{
                                        url: place.icon,
                                        scaledSize: new window.google.maps.Size(30, 30)
                                    }}
                                    onClick={() => {
                                        setSelectedPlace(place);
                                        getPlaceDetails(place.id);
                                    }}
                                />
                            ))}

                            {/* חלון מידע */}
                            {selectedPlace && (
                                <InfoWindow
                                    position={selectedPlace.location}
                                    onCloseClick={() => setSelectedPlace(null)}
                                >
                                    <div className="p-2 max-w-xs">
                                        <h3 className="font-bold text-lg">{selectedPlace.name}</h3>
                                        {selectedPlace.rating && (
                                            <div className="flex items-center mt-1">
                                                <span className="text-yellow-400">
                                                    {'★'.repeat(Math.floor(selectedPlace.rating))}
                                                    {'☆'.repeat(5 - Math.floor(selectedPlace.rating))}
                                                </span>
                                                <span className="text-sm text-gray-600 mr-2">
                                                    ({selectedPlace.rating})
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-600 mt-1">{selectedPlace.vicinity}</p>

                                        {selectedPlace.details && (
                                            <>
                                                {selectedPlace.details.hours && (
                                                    <div className="mt-2">
                                                        <h4 className="font-semibold text-sm">שעות פעילות:</h4>
                                                        <ul className="text-sm text-gray-600">
                                                            {selectedPlace.details.hours.map((hour, index) => (
                                                                <li key={index}>{hour}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {selectedPlace.details.phone && (
                                                    <p className="text-sm mt-2">
                                                        <span className="font-semibold">טלפון: </span>
                                                        <a
                                                            href={`tel:${selectedPlace.details.phone}`}
                                                            className="text-blue-500 hover:text-blue-700"
                                                        >
                                                            {selectedPlace.details.phone}
                                                        </a>
                                                    </p>
                                                )}

                                                {selectedPlace.details.website && (
                                                    <a
                                                        href={selectedPlace.details.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-700 text-sm mt-2 block"
                                                    >
                                                        לאתר האינטרנט
                                                    </a>
                                                )}


                                                <button
                                                    onClick={() => {
                                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.location.lat},${selectedPlace.location.lng}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition duration-200"
                                                >
                                                    נווט למקום
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    </LoadScript>
                </div>
            </div>
        </div>
    );
};

export default LocationsMap;
