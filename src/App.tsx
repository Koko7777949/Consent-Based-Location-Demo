import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2, ShieldCheck, Send, Clock, MessageSquare, Search, Menu, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const foundAddress = result.display_name;

        setLocation({ lat, lng });
        setAddress(foundAddress);
        
        const now = new Date();
        setTimestamp(now);

        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const timeStr = now.toLocaleTimeString();
        const msg = `Location as of ${timeStr}:\n${foundAddress ? foundAddress + '\n' : ''}${mapsLink}`;
        setMessageBody(msg);
        
        // Auto-hide panel to show the map after a brief delay
        setTimeout(() => setIsPanelOpen(false), 800);
      } else {
        setError('No results found for that search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendSMS = () => {
    if (!messageBody) return;
    // Create the sms: URI scheme
    const uri = `sms:${phoneNumber}?body=${encodeURIComponent(messageBody)}`;
    window.open(uri, '_self');
  };

  const requestLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        const now = new Date();
        setTimestamp(now);

        let foundAddress = '';
        try {
          // Reverse geocoding using OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            foundAddress = data.display_name;
            setAddress(foundAddress);
          } else {
            setAddress('Address not found for these coordinates.');
          }
        } catch (err) {
          console.error('Error fetching address:', err);
          setAddress('Could not retrieve address details.');
        } finally {
          setLoading(false);
          // Generate the default message
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          const timeStr = now.toLocaleTimeString();
          const msg = `My current location as of ${timeStr}:\n${foundAddress ? foundAddress + '\n' : ''}${mapsLink}`;
          setMessageBody(msg);
          
          // Auto-hide panel to show the map after a brief delay
          setTimeout(() => setIsPanelOpen(false), 800);
        }
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location request was denied. We respect your privacy and will not track you.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is currently unavailable.');
            break;
          case err.TIMEOUT:
            setError('The request to get your location timed out.');
            break;
          default:
            setError('An unknown error occurred while trying to get your location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      
      {/* Full Screen Map Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={location ? [location.lat, location.lng] : defaultCenter} 
          zoom={location ? 15 : defaultZoom} 
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          {location && (
            <Marker position={[location.lat, location.lng]}>
              <Popup>
                You are here. <br /> {address || 'Address not found'}
              </Popup>
            </Marker>
          )}
          <MapUpdater 
            center={location ? [location.lat, location.lng] : defaultCenter} 
            zoom={location ? 15 : defaultZoom} 
          />
        </MapContainer>
      </div>

      {/* Open Panel Button */}
      <button
        onClick={() => setIsPanelOpen(true)}
        className={`absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/50 text-slate-700 hover:bg-white transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isPanelOpen ? 'opacity-0 pointer-events-none -translate-x-8' : 'opacity-100 translate-x-0'}`}
        aria-label="Open Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Floating UI Panel */}
      <div className={`absolute top-4 left-4 z-20 w-[400px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl flex flex-col max-h-[calc(100vh-2rem)] border border-slate-200/50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isPanelOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Location Services</h1>
            </div>
            <button 
              onClick={() => setIsPanelOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-slate-50/80 rounded-xl p-3 mb-6 border border-slate-100 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Privacy First:</strong> Your location is only accessed when you click the button below. Data is not stored on any server.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search for a place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center shrink-0 shadow-sm"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">OR</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                {location ? 'Update My Location' : 'Locate Me'}
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {location && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Coordinates & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Latitude</p>
                  <p className="font-mono text-sm">{location.lat.toFixed(6)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Longitude</p>
                  <p className="font-mono text-sm">{location.lng.toFixed(6)}</p>
                </div>
              </div>

              {/* Address */}
              {address && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Approximate Address</p>
                  <p className="text-sm leading-relaxed">{address}</p>
                </div>
              )}

              {/* SMS Sharing Section */}
              <div className="pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Share via SMS</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Message Content</label>
                    <textarea 
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipient Number</label>
                    <div className="flex gap-2">
                      <input 
                        type="tel" 
                        placeholder="e.g. +1234567890" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                      />
                      <button 
                        onClick={handleSendSMS}
                        disabled={!phoneNumber || !messageBody}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
