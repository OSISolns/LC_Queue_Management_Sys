# Floor-Specific Display Setup

## Overview
The queue display system now supports **two separate floor displays**:

### Ground Floor Display
- **URL**: `/display?floor=ground`
- **Shows**: Neurology, Cardiology, and Procedure departments only
- **Access**: Available from landing page and admin panel

### First Floor Display
- **URL**: `/display?floor=first`  
- **Shows**: All departments EXCEPT Neurology, Cardiology, and Procedure
- **Access**: Available from landing page and admin panel

### All Floors Display (Legacy)
- **URL**: `/display` (no query parameter)
- **Shows**: Complete queue for all departments
- **Access**: Available from admin panel

## How It Works

The Display component uses the `floor` query parameter to filter patients:

```javascript
// Ground floor departments
const groundFloorDepts = ['Neurology', 'Cardiology', 'Procedure']

// Filter logic
if (floor === 'ground') {
    // Show only ground floor departments
} else if (floor === 'first') {
    // Show all OTHER departments
} else {
    // Show everything
}
```

## Access Points

### 1. Landing Page (for public/non-authenticated users)
- Ground Floor Display button (green background)
- First Floor Display button (blue background)

### 2. Admin Panel → Access Panels Tab
- Display - Ground Floor: Neurology, Cardiology, Procedure
- Display - First Floor: All other departments
- Display - All Floors: Complete queue view

### 3. Direct URL Access
Open these URLs directly in a browser:
- `http://localhost:5173/display?floor=ground`
- `http://localhost:5173/display?floor=first`
- `http://localhost:5173/display` (all floors)

## Setup for TV Screens

1. **Ground Floor TV**: 
   - Navigate to: `http://localhost:5173/display?floor=ground`
   - Click "Click to Start Display" to enable audio
   - Set browser to fullscreen (F11)

2. **First Floor TV**:
   - Navigate to: `http://localhost:5173/display?floor=first`
   - Click "Click to Start Display" to enable audio
   - Set browser to fullscreen (F11)

## Features
- ✅ Real-time updates via Socket.IO
- ✅ Audio announcements (Text-to-Speech)
- ✅ Priority-based queuing (Emergency > VIP > Standard)
- ✅ Auto-scrolling sidebar for overflow patients
- ✅ Floor indicator in header
- ✅ Color-coded display cards

## Notes
- VIP patients are excluded from public displays (ghost queuing)
- Each display shows up to 18 patients in the main grid
- Overflow patients appear in the right sidebar with auto-scrolling
- The floor name appears prominently in the header
